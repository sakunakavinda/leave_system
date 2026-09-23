import express from 'express';
import pool from '../db.js';
import { optionalAuth, getBranchScope } from '../middleware/auth.js';
import { calculateLeaveDeduction } from '../services/calendarService.js';
import { recordLeaveDeduction, recordLeaveRefund } from '../services/ledgerService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads/documents');

export async function initApplicationDocumentsTable() {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const colsToAdd = [
      { name: 'document_path', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'document_name', type: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'document_status', type: "VARCHAR(30) DEFAULT 'not_required'" },
      { name: 'document_deadline', type: 'DATE DEFAULT NULL' },
      { name: 'document_reviewed_by', type: 'VARCHAR(36) DEFAULT NULL' },
      { name: 'document_reviewed_at', type: 'TIMESTAMP NULL DEFAULT NULL' },
      { name: 'document_rejection_reason', type: 'TEXT DEFAULT NULL' },
      { name: 'is_no_pay', type: 'TINYINT(1) DEFAULT 0' },
    ];

    for (const col of colsToAdd) {
      try {
        await pool.query(`ALTER TABLE leave_applications ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✓ Added ${col.name} to leave_applications`);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') {
          // already exists
        }
      }
    }
  } catch (err) {
    console.error('Failed to initialize document columns in leave_applications:', err);
  }
}

export function saveBase64Document(dataUrl, originalName = 'document') {
  if (!dataUrl) return null;
  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }
  const mimeType = matches[1];
  const base64Data = matches[2];
  let ext = '.bin';
  if (mimeType.includes('pdf')) ext = '.pdf';
  else if (mimeType.includes('png')) ext = '.png';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
  else if (mimeType.includes('webp')) ext = '.webp';

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `doc_${crypto.randomUUID()}${ext}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
  return `/uploads/documents/${filename}`;
}

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const branchScope = getBranchScope(req) || req.query.branch_id;
    
    let sql = `
      SELECT 
        a.id, a.employee_id, a.substitute_employee_id, a.leave_type, 
        a.applied_date, a.returning_date, a.substitute_confirmed, a.status, a.reason,
        a.created_at, a.updated_at,
        a.document_path, a.document_name, a.document_status, a.document_deadline,
        a.document_reviewed_by, a.document_reviewed_at, a.document_rejection_reason,
        a.is_no_pay,
        e.branch_id,
        reviewer.name AS reviewer_name,
        (SELECT GROUP_CONCAT(DATE_FORMAT(d.leave_date, '%Y-%m-%d')) 
         FROM leave_application_dates d 
         WHERE d.leave_application_id = a.id) AS leave_dates
      FROM leave_applications a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN employees reviewer ON a.document_reviewed_by = reviewer.id
    `;
    const params = [];

    if (branchScope) {
      sql += ' WHERE e.branch_id = ?';
      params.push(branchScope);
    }

    sql += ' ORDER BY a.created_at DESC';

    const [rows] = await pool.query(sql, params);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const apps = rows.map(row => {
      let docStatus = row.document_status || 'not_required';
      let isNoPay = Boolean(row.is_no_pay);

      // Auto-evaluate overdue if pending_upload and deadline has passed
      if (docStatus === 'pending_upload' && row.document_deadline && row.document_deadline < todayStr) {
        docStatus = 'overdue';
        isNoPay = true;
      } else if (docStatus === 'rejected') {
        isNoPay = true;
      }

      return {
        id: row.id,
        employee_id: row.employee_id,
        substitute_employee_id: row.substitute_employee_id,
        leave_type: row.leave_type,
        appliedDate: row.applied_date,
        returningDate: row.returning_date,
        substituteConfirmed: row.substitute_confirmed,
        status: row.status,
        reason: row.reason,
        leaveDates: row.leave_dates ? row.leave_dates.split(',') : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        documentPath: row.document_path,
        documentName: row.document_name,
        documentStatus: docStatus,
        documentDeadline: row.document_deadline,
        documentReviewedBy: row.document_reviewed_by,
        documentReviewedAt: row.document_reviewed_at,
        documentRejectionReason: row.document_rejection_reason,
        reviewerName: row.reviewer_name || row.document_reviewed_by,
        isNoPay: isNoPay,
      };
    });
    
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { secretCode, employee_id: reqEmployeeId, isManagerOverride, appliedDate, leaveDates, returningDate, substitute_employee_id, status: reqStatus, reason } = req.body;
  const leave_type = req.body.leave_type || req.body.leaveType;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Lookup employee
    let employee_id, role_id, branch_id;
    if (isManagerOverride && reqEmployeeId) {
      const [empRows] = await connection.query('SELECT id, role_id, branch_id FROM employees WHERE id = ?', [reqEmployeeId]);
      if (empRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Employee not found.' });
      }
      employee_id = empRows[0].id;
      role_id = empRows[0].role_id;
      branch_id = empRows[0].branch_id;
    } else {
      const [empRows] = await connection.query('SELECT id, role_id, branch_id FROM employees WHERE secret_code = ?', [secretCode]);
      if (empRows.length === 0) {
        await connection.rollback();
        return res.status(401).json({ error: 'Invalid secret code. Employee not found.' });
      }
      employee_id = empRows[0].id;
      role_id = empRows[0].role_id;
      branch_id = empRows[0].branch_id;
    }

    // Dynamic Policy Checks (Configurable notice days, max consecutive days, is_paid, doc_required_after_days)
    const [ltRows] = await connection.query(
      'SELECT name, is_paid, notice_days_required, max_consecutive_days, min_service_days_required, doc_required_after_days FROM leave_types WHERE code = ?',
      [leave_type]
    );
    if (ltRows.length > 0) {
      const ltPolicy = ltRows[0];
      const noticeDays = parseInt(ltPolicy.notice_days_required) || 0;
      const maxConsec = parseInt(ltPolicy.max_consecutive_days) || 0;

      if (!isManagerOverride && noticeDays > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minDate = new Date(today);
        minDate.setDate(minDate.getDate() + noticeDays);

        for (const dateStr of (leaveDates || [])) {
          if (!dateStr) continue;
          const [y, m, day] = dateStr.split('-').map(Number);
          const lDate = new Date(y, m - 1, day);
          lDate.setHours(0, 0, 0, 0);
          if (lDate < minDate) {
            await connection.rollback();
            return res.status(400).json({
              error: `${ltPolicy.name} requires at least ${noticeDays} day(s) advance notice according to company policy.`
            });
          }
        }
      }

      if (!isManagerOverride && maxConsec > 0 && leaveDates && leaveDates.length > maxConsec) {
        await connection.rollback();
        return res.status(400).json({
          error: `${ltPolicy.name} cannot exceed ${maxConsec} consecutive days per request according to company policy.`
        });
      }

      // Minimum Service Days Check (Probation / Service length)
      const minServiceDays = parseInt(ltPolicy.min_service_days_required) || 0;
      if (!isManagerOverride && minServiceDays > 0) {
        const [empRows] = await connection.query('SELECT joined_date FROM employees WHERE id = ?', [employee_id]);
        if (empRows.length > 0 && empRows[0].joined_date) {
          const joinedDate = new Date(empRows[0].joined_date);
          joinedDate.setHours(0, 0, 0, 0);
          const firstLeaveStr = (leaveDates || [])[0];
          const firstLeaveDate = firstLeaveStr ? new Date(firstLeaveStr) : new Date();
          firstLeaveDate.setHours(0, 0, 0, 0);
          const serviceDiffDays = Math.floor((firstLeaveDate - joinedDate) / (1000 * 60 * 60 * 24));
          if (serviceDiffDays < minServiceDays) {
            await connection.rollback();
            const joinedFmt = new Date(empRows[0].joined_date).toISOString().split('T')[0];
            return res.status(400).json({
              error: `Minimum Service Requirement Not Met: ${ltPolicy.name} requires at least ${minServiceDays} days of service (probation). You have completed ${serviceDiffDays < 0 ? 0 : serviceDiffDays} days since joining on ${joinedFmt}.`
            });
          }
        }
      }
    }

    // Check Document Requirement
    const docRequiredAfter = ltRows.length > 0 ? (parseInt(ltRows[0].doc_required_after_days) || 0) : 0;
    const totalLeaveDaysCount = (leaveDates || []).length;
    const isDocRequired = docRequiredAfter > 0 && totalLeaveDaysCount > docRequiredAfter;

    let initialDocStatus = isDocRequired ? 'pending_upload' : 'not_required';
    let initialDocPath = null;
    let initialDocName = null;
    let docDeadline = null;

    if (isDocRequired) {
      if (returningDate) {
        docDeadline = returningDate;
      } else if (leaveDates && leaveDates.length > 0) {
        const sorted = [...leaveDates].sort();
        const d = new Date(sorted[0]);
        d.setDate(d.getDate() + docRequiredAfter);
        docDeadline = d.toISOString().split('T')[0];
      }

      if (req.body.documentData) {
        try {
          initialDocPath = saveBase64Document(req.body.documentData, req.body.documentName);
          if (initialDocPath) {
            initialDocName = req.body.documentName || 'Medical_Certificate';
            initialDocStatus = 'uploaded';
          }
        } catch (e) {
          console.error('Failed to save attached document during application:', e);
        }
      }
    }

    // Balance & Quota Check with Holiday Exclusions and Roster awareness
    const deductionCalc = await calculateLeaveDeduction(branch_id, leaveDates || [], employee_id);
    const requestedDays = deductionCalc.netWorkingDaysDeducted;
    if (requestedDays > 0) {
      const [rulesRows] = await connection.query('SELECT * FROM leave_rules WHERE role_id = ? AND branch_id = ?', [role_id, branch_id]);
      if (rulesRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Leave rules not found for your role and branch. Please contact Admin.' });
      }
      const rule = rulesRows[0];

      const currentYear = new Date().getFullYear();
      let [takenRows] = await connection.query('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?', [employee_id, currentYear]);
      
      if (takenRows.length === 0) {
        const balanceId = crypto.randomUUID();
        await connection.query(
          'INSERT INTO leave_balances (id, employee_id, year, annual_taken, sick_taken, casual_taken) VALUES (?, ?, ?, 0, 0, 0)',
          [balanceId, employee_id, currentYear]
        );
        [takenRows] = await connection.query('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?', [employee_id, currentYear]);
      }
      const ruleCol = `${leave_type}_leave`;
      const balanceCol = `${leave_type}_taken`;

      let quota = 0;
      let taken = 0;

      if (rule[ruleCol] !== undefined && rule[ruleCol] !== null) {
        quota = rule[ruleCol];
      } else {
        quota = 0;
      }
      const balanceRow = takenRows[0] || {};
      taken = (balanceRow[balanceCol] !== undefined && balanceRow[balanceCol] !== null) ? Number(balanceRow[balanceCol]) : 0;
      
      const isUnpaidType = leave_type === 'unpaid' || leave_type === 'lop' || (ltRows.length > 0 && (ltRows[0].is_paid === 0 || ltRows[0].is_paid === false));
      if (!isManagerOverride && (!isUnpaidType || quota > 0)) {
        if (taken + requestedDays > quota) {
          await connection.rollback();
          return res.status(400).json({ error: `You only have ${quota - taken} ${leave_type} leave days remaining.` });
        }
      }

      // Max Per Day & Substitute Checks (Bypassed if manager override / unannounced absence recording)
      if (!isManagerOverride) {
        for (const date of leaveDates) {
          const [onLeaveRows] = await connection.query(`
            SELECT COUNT(DISTINCT a.employee_id) AS count
            FROM leave_applications a
            JOIN leave_application_dates d ON a.id = d.leave_application_id
            JOIN employees e ON a.employee_id = e.id
            WHERE d.leave_date = ? 
              AND e.role_id = ? 
              AND e.branch_id = ?
              AND a.status IN ('approved', 'pending')
          `, [date, role_id, branch_id]);

          const countOnLeave = parseInt(onLeaveRows[0].count);
          if (countOnLeave >= rule.max_per_day) {
            await connection.rollback();
            return res.status(400).json({ error: `Maximum allowed employees on leave reached for date: ${date}` });
          }

          // Substitute Check
          const [subCheckRows] = await connection.query(`
            SELECT e.name 
            FROM leave_applications a
            JOIN leave_application_dates d ON a.id = d.leave_application_id
            JOIN employees e ON a.employee_id = e.id
            WHERE a.substitute_employee_id = ?
              AND d.leave_date = ?
              AND a.status IN ('pending', 'approved')
          `, [employee_id, date]);

          if (subCheckRows.length > 0) {
            await connection.rollback();
            const requesterName = subCheckRows[0].name;
            return res.status(400).json({ error: `You cannot take leave on ${date} because you are assigned as a substitute for ${requesterName}.` });
          }

          // Double Substitute Check
          if (substitute_employee_id) {
            const [doubleSubCheck] = await connection.query(`
              SELECT e.name 
              FROM leave_applications a
              JOIN leave_application_dates d ON a.id = d.leave_application_id
              JOIN employees e ON a.employee_id = e.id
              WHERE a.substitute_employee_id = ?
                AND d.leave_date = ?
                AND a.status IN ('pending', 'approved')
            `, [substitute_employee_id, date]);

            if (doubleSubCheck.length > 0) {
              await connection.rollback();
              const requesterName = doubleSubCheck[0].name;
              const [subEmpRows] = await connection.query('SELECT name FROM employees WHERE id = ?', [substitute_employee_id]);
              const subName = subEmpRows[0]?.name || 'the selected substitute';
              return res.status(400).json({ error: `${subName} cannot be your substitute on ${date} because they are already substituting for ${requesterName}.` });
            }
          }
        }
      }
    }
    
    const initialStatus = isManagerOverride ? (reqStatus || 'approved') : 'pending';
    const initialSubConfirmed = isManagerOverride ? true : false;
    const finalAppliedDate = appliedDate || new Date().toISOString().split('T')[0];
    const appId = crypto.randomUUID();
    const [appResult] = await connection.query(
      `INSERT INTO leave_applications (
        id, employee_id, substitute_employee_id, leave_type, applied_date, returning_date, 
        status, substitute_confirmed, reason,
        document_path, document_name, document_status, document_deadline, is_no_pay
       ) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        appId, employee_id, substitute_employee_id || null, leave_type, finalAppliedDate, returningDate, 
        initialStatus, initialSubConfirmed, reason || null,
        initialDocPath, initialDocName, initialDocStatus, docDeadline
      ]
    );
    
    if (leaveDates && leaveDates.length > 0) {
      for (const date of leaveDates) {
        const dateId = crypto.randomUUID();
        await connection.query(
          'INSERT INTO leave_application_dates (id, leave_application_id, leave_date) VALUES (?, ?, ?)',
          [dateId, appId, date]
        );
      }
    }
    
    if (requestedDays > 0) {
      const currentYear = new Date().getFullYear();
      const colName = `${leave_type}_taken`;
      try {
        await connection.query(`UPDATE leave_balances SET ${colName} = COALESCE(${colName}, 0) + ? WHERE employee_id = ? AND year = ?`, [requestedDays, employee_id, currentYear]);
      } catch (err) {
        try {
          await connection.query(`ALTER TABLE leave_balances ADD COLUMN ${colName} INT DEFAULT 0`);
          await connection.query(`UPDATE leave_balances SET ${colName} = COALESCE(${colName}, 0) + ? WHERE employee_id = ? AND year = ?`, [requestedDays, employee_id, currentYear]);
        } catch (e) {
          console.error(`Failed to update ${colName} column`, e);
        }
      }
      // Record transaction in immutable ledger
      try {
        await recordLeaveDeduction(employee_id, leave_type, requestedDays, appId, reason || (isManagerOverride ? 'Manager Recorded Leave' : 'Leave Application Submitted'));
      } catch (ledgErr) {
        console.error('Ledger deduction record error:', ledgErr);
      }
    }

    await connection.commit();
    res.status(201).json({ id: appId, message: 'Application submitted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    connection.release();
  }
});

// Upload supporting medical document for an application
router.post('/:id/document', async (req, res) => {
  const { id } = req.params;
  const { documentData, documentName, secretCode } = req.body;
  
  if (!documentData) {
    return res.status(400).json({ error: 'No document data provided.' });
  }

  try {
    const [apps] = await pool.query(
      'SELECT a.*, e.secret_code FROM leave_applications a JOIN employees e ON a.employee_id = e.id WHERE a.id = ?',
      [id]
    );
    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }
    const app = apps[0];
    if (secretCode && app.secret_code !== secretCode) {
      return res.status(403).json({ error: 'Invalid secret code for this application.' });
    }

    const docPath = saveBase64Document(documentData, documentName);
    if (!docPath) {
      return res.status(400).json({ error: 'Invalid document format. Please upload an image or PDF.' });
    }
    const docName = documentName || 'Medical_Certificate';

    await pool.query(
      `UPDATE leave_applications 
       SET document_path = ?, document_name = ?, document_status = 'uploaded', 
           document_rejection_reason = NULL, is_no_pay = 0 
       WHERE id = ?`,
      [docPath, docName, id]
    );

    res.json({
      success: true,
      documentPath: docPath,
      documentName: docName,
      documentStatus: 'uploaded'
    });
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// Review supporting document (Approve or Reject -> Convert to No Pay)
router.post('/:id/review-document', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason, reviewer_name, reviewer_id } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
  }

  try {
    const [apps] = await pool.query('SELECT * FROM leave_applications WHERE id = ?', [id]);
    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const isApprove = action === 'approve';
    const newStatus = isApprove ? 'approved' : 'rejected';
    const isNoPay = isApprove ? 0 : 1;
    const reviewedBy = reviewer_id || req.user?.id || reviewer_name || 'Admin';

    await pool.query(
      `UPDATE leave_applications 
       SET document_status = ?, 
           is_no_pay = ?, 
           document_reviewed_by = ?, 
           document_reviewed_at = NOW(), 
           document_rejection_reason = ? 
       WHERE id = ?`,
      [newStatus, isNoPay, reviewedBy, isApprove ? null : (rejection_reason || 'Document rejected by reviewer'), id]
    );

    res.json({
      success: true,
      documentStatus: newStatus,
      isNoPay: isNoPay === 1,
      documentReviewedBy: reviewedBy,
      documentReviewedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error reviewing document:', err);
    res.status(500).json({ error: 'Failed to review document.' });
  }
});

router.put('/:id/status', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const { status, leave_type: newLeaveType, reason } = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const [appRows] = await connection.query(`
      SELECT a.*, e.branch_id 
      FROM leave_applications a 
      JOIN employees e ON a.employee_id = e.id 
      WHERE a.id = ?
    `, [id]);
    
    if (appRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = appRows[0];

    const branchScope = getBranchScope(req);
    if (branchScope && app.branch_id !== branchScope) {
      await connection.rollback();
      return res.status(403).json({ error: 'Forbidden: You cannot modify leave applications outside your assigned branch.' });
    }

    const [daysRows] = await connection.query('SELECT DATE_FORMAT(leave_date, "%Y-%m-%d") AS date_str FROM leave_application_dates WHERE leave_application_id = ?', [id]);
    const dateList = daysRows.map(d => d.date_str);
    const deductionCalc = await calculateLeaveDeduction(app.branch_id, dateList, app.employee_id);
    const requestedDays = deductionCalc.netWorkingDaysDeducted;
    const currentYear = new Date(app.applied_date).getFullYear();

    // Check if leave_type is being converted (e.g. marked as 'unpaid')
    if (newLeaveType && newLeaveType !== app.leave_type) {
      if (app.status !== 'rejected') {
        // Refund previous leave type
        const oldCol = `${app.leave_type}_taken`;
        try {
          await connection.query(`UPDATE leave_balances SET ${oldCol} = GREATEST(0, COALESCE(${oldCol}, 0) - ?) WHERE employee_id = ? AND year = ?`, [requestedDays, app.employee_id, currentYear]);
          await recordLeaveRefund(app.employee_id, app.leave_type, requestedDays, id, `Converted to ${newLeaveType}: ${reason || 'Manager Action'}`);
        } catch (e) {}
      }

      const targetStatus = status || app.status || 'approved';
      if (targetStatus !== 'rejected') {
        // Add deduction for the new leave type (e.g. unpaid_taken)
        const newCol = `${newLeaveType}_taken`;
        try {
          await connection.query(`UPDATE leave_balances SET ${newCol} = COALESCE(${newCol}, 0) + ? WHERE employee_id = ? AND year = ?`, [requestedDays, app.employee_id, currentYear]);
        } catch (colErr) {
          try {
            await connection.query(`ALTER TABLE leave_balances ADD COLUMN ${newCol} INT DEFAULT 0`);
            await connection.query(`UPDATE leave_balances SET ${newCol} = COALESCE(${newCol}, 0) + ? WHERE employee_id = ? AND year = ?`, [requestedDays, app.employee_id, currentYear]);
          } catch (e) {}
        }
        await recordLeaveDeduction(app.employee_id, newLeaveType, requestedDays, id, reason || `Marked as ${newLeaveType} (Unpaid Leave / LOP) by Manager`);
      }

      await connection.query(
        'UPDATE leave_applications SET status = ?, leave_type = ?, reason = COALESCE(?, reason) WHERE id = ?',
        [targetStatus, newLeaveType, reason || null, id]
      );
    } else {
      // Normal status change
      if (app.status !== 'rejected' && status === 'rejected') {
        const colName = `${app.leave_type}_taken`;
        try {
          await connection.query(`UPDATE leave_balances SET ${colName} = GREATEST(0, COALESCE(${colName}, 0) - ?) WHERE employee_id = ? AND year = ?`, [requestedDays, app.employee_id, currentYear]);
          await recordLeaveRefund(app.employee_id, app.leave_type, requestedDays, id, reason || 'Leave Application Rejected');
        } catch (err) {}
      } 
      else if (app.status === 'rejected' && status !== 'rejected') {
        await connection.query(`
          INSERT IGNORE INTO leave_balances (id, employee_id, year) 
          VALUES (?, ?, ?)
        `, [crypto.randomUUID(), app.employee_id, currentYear]);

        const colName = `${app.leave_type}_taken`;
        try {
          await connection.query(`UPDATE leave_balances SET ${colName} = COALESCE(${colName}, 0) + ? WHERE employee_id = ? AND year = ?`, [requestedDays, app.employee_id, currentYear]);
          await recordLeaveDeduction(app.employee_id, app.leave_type, requestedDays, id, reason || 'Leave Application Re-approved');
        } catch (err) {}
      }

      await connection.query(
        'UPDATE leave_applications SET status = ?, reason = COALESCE(?, reason) WHERE id = ?',
        [status, reason || null, id]
      );
    }

    const [updatedRows] = await connection.query(`
      SELECT 
        a.id, a.employee_id, a.substitute_employee_id, a.leave_type, 
        a.applied_date, a.returning_date, a.substitute_confirmed, a.status, a.reason,
        a.created_at, a.updated_at,
        (SELECT GROUP_CONCAT(DATE_FORMAT(d.leave_date, '%Y-%m-%d')) 
         FROM leave_application_dates d 
         WHERE d.leave_application_id = a.id) AS leave_dates
      FROM leave_applications a
      WHERE a.id = ?
    `, [id]);

    await connection.commit();
    const updatedRow = updatedRows[0];
    res.json({
      ...updatedRow,
      appliedDate: updatedRow.applied_date,
      returningDate: updatedRow.returning_date,
      substituteConfirmed: updatedRow.substitute_confirmed,
      leaveDates: updatedRow.leave_dates ? updatedRow.leave_dates.split(',') : []
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    connection.release();
  }
});

router.put('/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { secretCode } = req.body;
  
  try {
    const [appRows] = await pool.query('SELECT substitute_employee_id FROM leave_applications WHERE id = ?', [id]);
    if (appRows.length === 0) return res.status(404).json({ error: 'Application not found' });
    
    const { substitute_employee_id } = appRows[0];
    if (!substitute_employee_id) return res.status(400).json({ error: 'No substitute assigned' });
    
    const [empRows] = await pool.query('SELECT id FROM employees WHERE secret_code = ? AND id = ?', [secretCode, substitute_employee_id]);
    if (empRows.length === 0) {
      return res.status(401).json({ error: 'Invalid secret code for the designated substitute.' });
    }
    
    await pool.query(
      'UPDATE leave_applications SET substitute_confirmed = true WHERE id = ?',
      [id]
    );
    const [updatedRows] = await pool.query('SELECT * FROM leave_applications WHERE id = ?', [id]);
    res.json(updatedRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const [appRows] = await connection.query('SELECT * FROM leave_applications WHERE id = ?', [id]);
    if (appRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const app = appRows[0];
    
    if (app.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Can only undo pending applications' });
    }
    
    const [daysRows] = await connection.query('SELECT COUNT(*) AS count FROM leave_application_dates WHERE leave_application_id = ?', [id]);
    const requestedDays = parseInt(daysRows[0].count);
    const currentYear = new Date(app.applied_date).getFullYear();

    let updateCol = '';
    if (app.leave_type === 'annual') updateCol = 'annual_taken';
    else if (app.leave_type === 'sick') updateCol = 'sick_taken';
    else if (app.leave_type === 'casual') updateCol = 'casual_taken';

    if (updateCol) {
      await connection.query(`
        UPDATE leave_balances SET ${updateCol} = ${updateCol} - ? 
        WHERE employee_id = ? AND year = ?
      `, [requestedDays, app.employee_id, currentYear]);
    }
    
    await connection.query('DELETE FROM leave_application_dates WHERE leave_application_id = ?', [id]);
    await connection.query('DELETE FROM leave_applications WHERE id = ?', [id]);
    
    await connection.commit();
    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    connection.release();
  }
});

router.get('/overview/:secretCode', async (req, res) => {
  const { secretCode } = req.params;
  try {
    const [empRows] = await pool.query(`
      SELECT e.id, e.name, e.role_id, e.branch_id,
             r.title AS role_title,
             CASE WHEN b.location IS NOT NULL AND TRIM(b.location) != '' THEN CONCAT(b.name, ' (', b.location, ')') ELSE b.name END AS branch_name,
             d.name AS department_name
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE e.secret_code = ?
    `, [secretCode]);

    if (empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = empRows[0];
    const year = new Date().getFullYear();

    const [balanceRows] = await pool.query(`
      SELECT *
      FROM leave_balances
      WHERE employee_id = ? AND year = ?
    `, [emp.id, year]);

    const balance = balanceRows[0] || { annual_taken: 0, sick_taken: 0, casual_taken: 0 };

    const [rulesRows] = await pool.query(`
      SELECT *
      FROM leave_rules
      WHERE role_id = ? AND branch_id = ?
    `, [emp.role_id, emp.branch_id]);

    const rules = rulesRows[0] || { annual_leave: 14, sick_leave: 10, casual_leave: 7, max_per_day: 1 };

    const [appsRows] = await pool.query(`
      SELECT 
        a.id, a.leave_type, a.applied_date, a.returning_date,
        a.substitute_confirmed, a.status, a.created_at,
        a.document_path, a.document_name, a.document_status, a.document_deadline,
        a.document_rejection_reason, a.is_no_pay,
        sub.name AS substitute_name,
        (SELECT GROUP_CONCAT(DATE_FORMAT(d.leave_date, '%Y-%m-%d'))
         FROM leave_application_dates d
         WHERE d.leave_application_id = a.id) AS leave_dates
      FROM leave_applications a
      LEFT JOIN employees sub ON a.substitute_employee_id = sub.id
      WHERE a.employee_id = ?
      ORDER BY a.created_at DESC
    `, [emp.id]);

    const todayStr = new Date().toISOString().split('T')[0];

    res.json({
      employee: {
        id: emp.id,
        name: emp.name,
        role: emp.role_title,
        branch: emp.branch_name,
        department: emp.department_name,
      },
      balance: balance,
      rules: rules,
      applications: appsRows.map(row => {
        let docStatus = row.document_status || 'not_required';
        let isNoPay = Boolean(row.is_no_pay);

        if (docStatus === 'pending_upload' && row.document_deadline && row.document_deadline < todayStr) {
          docStatus = 'overdue';
          isNoPay = true;
        } else if (docStatus === 'rejected') {
          isNoPay = true;
        }

        return {
          id: row.id,
          leave_type: row.leave_type,
          appliedDate: row.applied_date,
          returningDate: row.returning_date,
          substituteConfirmed: row.substitute_confirmed,
          substituteName: row.substitute_name,
          status: row.status,
          leaveDates: row.leave_dates ? row.leave_dates.split(',') : [],
          documentPath: row.document_path,
          documentName: row.document_name,
          documentStatus: docStatus,
          documentDeadline: row.document_deadline,
          documentRejectionReason: row.document_rejection_reason,
          isNoPay: isNoPay,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

/**
 * GET /api/applications/capacity-meter
 * Real-time workforce capacity gauge per branch and role
 */
router.get('/capacity-meter', optionalAuth, async (req, res) => {
  const branchScope = getBranchScope(req) || req.query.branch_id;
  const targetDate = req.query.date || new Date().toISOString().split('T')[0];

  try {
    // 1. Fetch active employees in scope
    let empSql = `
      SELECT e.id, e.name, e.branch_id, e.role_id, r.title AS role_name,
             CASE WHEN b.location IS NOT NULL AND TRIM(b.location) != '' THEN CONCAT(b.name, ' (', b.location, ')') ELSE b.name END AS branch_name
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      LEFT JOIN branches b ON e.branch_id = b.id
      WHERE e.status = 'active'
    `;
    const empParams = [];
    if (branchScope && branchScope !== 'all') {
      empSql += ' AND e.branch_id = ?';
      empParams.push(branchScope);
    }
    const [employees] = await pool.query(empSql, empParams);
    const totalStaff = employees.length;

    // 2. Fetch staff on leave on targetDate
    let leaveSql = `
      SELECT 
        a.id AS application_id,
        a.leave_type,
        a.status AS leave_status,
        e.id AS employee_id,
        e.name AS employee_name,
        e.role_id,
        r.title AS role_name,
        CASE WHEN b.location IS NOT NULL AND TRIM(b.location) != '' THEN CONCAT(b.name, ' (', b.location, ')') ELSE b.name END AS branch_name,
        sub.name AS substitute_name
      FROM leave_application_dates d
      JOIN leave_applications a ON d.leave_application_id = a.id
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN roles r ON e.role_id = r.id
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN employees sub ON a.substitute_employee_id = sub.id
      WHERE d.leave_date = ? AND a.status IN ('approved', 'pending')
    `;
    const leaveParams = [targetDate];
    if (branchScope && branchScope !== 'all') {
      leaveSql += ' AND e.branch_id = ?';
      leaveParams.push(branchScope);
    }
    const [onLeaveRows] = await pool.query(leaveSql, leaveParams);

    // Dedup onLeave by employee_id
    const leaveMap = new Map();
    onLeaveRows.forEach(r => {
      if (!leaveMap.has(r.employee_id)) {
        leaveMap.set(r.employee_id, r);
      }
    });
    const onLeaveList = Array.from(leaveMap.values());
    const onLeaveCount = onLeaveList.length;
    const onDutyCount = Math.max(0, totalStaff - onLeaveCount);

    const capacityPercentage = totalStaff > 0 ? Math.round((onDutyCount / totalStaff) * 100) : 100;
    
    let status = 'healthy';
    let statusLabel = 'Optimal Operational Staffing';
    if (capacityPercentage < 50) {
      status = 'critical';
      statusLabel = 'Critical Staffing Shortage';
    } else if (capacityPercentage < 75) {
      status = 'warning';
      statusLabel = 'Moderate Staffing Buffer';
    }

    // Role breakdown
    const roleStats = {};
    employees.forEach(emp => {
      const rId = emp.role_id || 'unassigned';
      const rName = emp.role_name || 'Unassigned Role';
      if (!roleStats[rId]) {
        roleStats[rId] = { role_id: rId, role_name: rName, total: 0, onLeave: 0, onDuty: 0 };
      }
      roleStats[rId].total++;
    });

    onLeaveList.forEach(lv => {
      const rId = lv.role_id || 'unassigned';
      if (roleStats[rId]) {
        roleStats[rId].onLeave++;
      }
    });

    const roleBreakdown = Object.values(roleStats).map(r => {
      const onDuty = Math.max(0, r.total - r.onLeave);
      const pct = r.total > 0 ? Math.round((onDuty / r.total) * 100) : 100;
      let rStatus = 'healthy';
      if (pct < 50) rStatus = 'critical';
      else if (pct < 75) rStatus = 'warning';
      return {
        ...r,
        onDuty,
        capacityPercentage: pct,
        status: rStatus
      };
    });

    res.json({
      date: targetDate,
      branchScope: branchScope || 'all',
      totalStaff,
      onDutyCount,
      onLeaveCount,
      capacityPercentage,
      status,
      statusLabel,
      roleBreakdown,
      onLeaveList
    });
  } catch (err) {
    console.error('Capacity meter error:', err);
    res.status(500).json({ error: 'Failed to calculate workforce capacity' });
  }
});

export default router;
