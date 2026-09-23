import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { optionalAuth, getBranchScope } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/employees
 * Supports branch scoping and credential protection
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const branchScope = getBranchScope(req) || req.query.branch_id;
    const includeSecret = req.query.includeSecretCode === 'true' && req.user && 
      (req.user.role === 'super_admin' || req.user.role === 'manager' || req.user.role === 'super manager');

    let sql = `
      SELECT id, name, ${includeSecret ? 'secret_code AS "secretCode",' : ''} 
             role_id, branch_id, status, DATE_FORMAT(joined_date, '%Y-%m-%d') AS joined_date, created_at, updated_at 
      FROM employees
    `;
    const params = [];

    if (branchScope) {
      sql += ' WHERE branch_id = ?';
      params.push(branchScope);
    }

    sql += ' ORDER BY created_at ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch employees error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/employees (Create an employee)
 */
router.post('/', async (req, res) => {
  const { name, secretCode, role_id, branch_id, status, joined_date } = req.body;
  const rawCode = secretCode || Math.floor(10000000 + Math.random() * 90000000).toString();
  const id = crypto.randomUUID();
  const effectiveJoinedDate = joined_date || new Date().toISOString().split('T')[0];

  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    // Check if branches records are empty
    const [[branchCount]] = await pool.query('SELECT COUNT(*) as count FROM branches');
    if (branchCount.count === 0) {
      return res.status(400).json({ error: 'Cannot add employee: No branches configured. Please add at least one branch first.' });
    }

    // Check if roles records are empty
    const [[roleCount]] = await pool.query('SELECT COUNT(*) as count FROM roles');
    if (roleCount.count === 0) {
      return res.status(400).json({ error: 'Cannot add employee: No roles configured. Please add at least one role first.' });
    }

    if (!branch_id) {
      return res.status(400).json({ error: 'Branch is required' });
    }

    if (!role_id) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Verify branch exists
    const [branchRows] = await pool.query('SELECT id FROM branches WHERE id = ?', [branch_id]);
    if (branchRows.length === 0) {
      return res.status(400).json({ error: 'Invalid branch: The selected branch does not exist' });
    }

    // Verify role exists
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE id = ?', [role_id]);
    if (roleRows.length === 0) {
      return res.status(400).json({ error: 'Invalid role: The selected role does not exist' });
    }

    await pool.query(
      'INSERT INTO employees (id, name, secret_code, role_id, branch_id, status, joined_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name.trim(), rawCode, role_id, branch_id, status || 'active', effectiveJoinedDate]
    );

    const [rows] = await pool.query(
      'SELECT id, name, secret_code AS "secretCode", role_id, branch_id, status, DATE_FORMAT(joined_date, "%Y-%m-%d") AS joined_date, created_at FROM employees WHERE id = ?',
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/employees/:id (Update an employee)
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, secretCode, role_id, branch_id, status, joined_date } = req.body;
  const effectiveJoinedDate = joined_date || new Date().toISOString().split('T')[0];

  try {
    let result;
    if (secretCode && secretCode.trim() !== '') {
      [result] = await pool.query(
        'UPDATE employees SET name = ?, secret_code = ?, role_id = ?, branch_id = ?, status = ?, joined_date = ? WHERE id = ?',
        [name.trim(), secretCode.trim(), role_id, branch_id, status, effectiveJoinedDate, id]
      );
    } else {
      [result] = await pool.query(
        'UPDATE employees SET name = ?, role_id = ?, branch_id = ?, status = ?, joined_date = ? WHERE id = ?',
        [name.trim(), role_id, branch_id, status, effectiveJoinedDate, id]
      );
    }

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });

    const [rows] = await pool.query(
      'SELECT id, name, secret_code AS "secretCode", role_id, branch_id, status, DATE_FORMAT(joined_date, "%Y-%m-%d") AS joined_date FROM employees WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/employees/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    await pool.query('DELETE FROM employees WHERE id = ?', [id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'Server error. Cannot delete employee if they have applications.' });
  }
});

/**
 * POST /api/employees/available-substitutes
 * Evaluates candidate substitutes with Fatigue Protection Guard (< 11 hours rest interval)
 */
router.post('/available-substitutes', async (req, res) => {
  const { applicant_id, branch_id, role_id, leave_dates } = req.body;

  if (!branch_id || !role_id) {
    return res.status(400).json({ error: 'branch_id and role_id are required' });
  }

  const cleanDates = (leave_dates || []).map(d => typeof d === 'string' ? d.split('T')[0] : '').filter(Boolean);

  try {
    // 1. Fetch potential peer candidates in same branch and role (excluding applicant)
    let sql = 'SELECT id, name, branch_id, role_id FROM employees WHERE branch_id = ? AND role_id = ? AND status = "active"';
    const params = [branch_id, role_id];

    if (applicant_id) {
      sql += ' AND id != ?';
      params.push(applicant_id);
    }

    const [candidates] = await pool.query(sql, params);

    if (candidates.length === 0) {
      return res.json([]);
    }

    const candidateIds = candidates.map(c => c.id);

    // 2. Check candidates who already have leave overlapping on requested dates
    let leaveOverlaps = new Set();
    let substituteOverlaps = new Set();

    if (cleanDates.length > 0) {
      const [leaveRows] = await pool.query(
        `SELECT a.employee_id 
         FROM leave_applications a
         JOIN leave_application_dates d ON a.id = d.leave_application_id
         WHERE a.status IN ('pending', 'approved') 
           AND d.leave_date IN (?) 
           AND a.employee_id IN (?)`,
        [cleanDates, candidateIds]
      );
      leaveRows.forEach(r => leaveOverlaps.add(r.employee_id));

      const [subRows] = await pool.query(
        `SELECT a.substitute_employee_id 
         FROM leave_applications a
         JOIN leave_application_dates d ON a.id = d.leave_application_id
         WHERE a.status IN ('pending', 'approved') 
           AND d.leave_date IN (?) 
           AND a.substitute_employee_id IN (?)`,
        [cleanDates, candidateIds]
      );
      subRows.forEach(r => substituteOverlaps.add(r.substitute_employee_id));
    }

    // 3. Check Fatigue Protection Guard (< 11 hours rest interval)
    // For each clean date, check candidate's scheduled shift on day-1, day, and day+1
    const fatigueNotices = new Map();

    if (cleanDates.length > 0) {
      // Find candidate shifts on adjacent dates
      const [rosterRows] = await pool.query(
        `SELECT er.employee_id, DATE_FORMAT(er.roster_date, '%Y-%m-%d') AS roster_date, 
                sm.name AS shift_name, sm.start_time, sm.end_time, sm.crosses_midnight
         FROM employee_rosters er
         JOIN shift_masters sm ON er.shift_id = sm.id
         WHERE er.employee_id IN (?)`,
        [candidateIds]
      );

      for (const cand of candidates) {
        const candShifts = rosterRows.filter(r => r.employee_id === cand.id);

        for (const dateStr of cleanDates) {
          const [y, m, d] = dateStr.split('-').map(Number);
          const prevDate = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split('T')[0];
          const nextDate = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split('T')[0];

          // Check if candidate is scheduled on overnight shift the night before
          const prevShift = candShifts.find(s => s.roster_date === prevDate);
          if (prevShift && prevShift.crosses_midnight) {
            fatigueNotices.set(
              cand.id, 
              `⚠️ Fatigue Risk: Finishes ${prevShift.shift_name} in the morning (${prevShift.end_time?.substring(0, 5)}) with insufficient rest (< 11h).`
            );
            break;
          }

          // Check if candidate is scheduled on a night shift on the coverage date itself
          const sameDayShift = candShifts.find(s => s.roster_date === dateStr);
          if (sameDayShift && sameDayShift.crosses_midnight) {
            fatigueNotices.set(
              cand.id, 
              `⚠️ Fatigue Risk: Already scheduled for ${sameDayShift.shift_name} on this date. Double shift would breach 11h rest guard.`
            );
            break;
          }
        }
      }
    }

    // Format response
    const results = candidates.map(c => {
      const onLeave = leaveOverlaps.has(c.id);
      const isSub = substituteOverlaps.has(c.id);
      const fatigueNotice = fatigueNotices.get(c.id) || null;

      let isAvailable = true;
      let reason = null;

      if (onLeave) {
        isAvailable = false;
        reason = 'Already on leave during requested dates';
      } else if (isSub) {
        isAvailable = false;
        reason = 'Already serving as substitute for another colleague';
      }

      return {
        id: c.id,
        name: c.name,
        branch_id: c.branch_id,
        role_id: c.role_id,
        isAvailable,
        unavailableReason: reason,
        hasFatigueWarning: Boolean(fatigueNotice),
        fatigueNotice
      };
    });

    res.json(results);
  } catch (err) {
    console.error('Error fetching available substitutes:', err);
    res.status(500).json({ error: 'Failed to calculate available substitutes' });
  }
});

export default router;
