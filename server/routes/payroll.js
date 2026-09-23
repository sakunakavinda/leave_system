import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole, getBranchScope } from '../middleware/auth.js';
import { getBranchSchedule, getBranchHolidays } from '../services/calendarService.js';

const router = express.Router();

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculate payroll summary data for employees in a month
 */
export async function generatePayrollData({ branch_id, month, year }) {
  const currentYear = parseInt(year) || new Date().getFullYear();
  const currentMonth = parseInt(month) || (new Date().getMonth() + 1);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const startDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const endDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // 1. Fetch employees
  let empSql = `
    SELECT e.id, e.name, e.branch_id, e.role_id, r.title AS role_name,
           CASE WHEN b.location IS NOT NULL AND TRIM(b.location) != '' THEN CONCAT(b.name, ' (', b.location, ')') ELSE b.name END AS branch_name
    FROM employees e
    LEFT JOIN roles r ON e.role_id = r.id
    LEFT JOIN branches b ON e.branch_id = b.id
    WHERE e.status = 'active'
  `;
  const empParams = [];
  if (branch_id && branch_id !== 'all') {
    empSql += ' AND e.branch_id = ?';
    empParams.push(branch_id);
  }
  empSql += ' ORDER BY b.name ASC, e.name ASC';
  const [employees] = await pool.query(empSql, empParams);

  if (employees.length === 0) {
    return {
      month: currentMonth,
      year: currentYear,
      totalEmployees: 0,
      totalPayableDays: 0,
      totalLopDays: 0,
      records: []
    };
  }

  // 2. Cache branch schedules & holidays
  const branchIds = [...new Set(employees.map(e => e.branch_id))];
  const scheduleMap = new Map();
  const holidayMap = new Map();

  for (const bId of branchIds) {
    const sched = await getBranchSchedule(bId);
    scheduleMap.set(bId, sched);
    const hols = await getBranchHolidays(bId, currentYear);
    const holDates = new Set(hols.map(h => h.holiday_date));
    holidayMap.set(bId, holDates);
  }

  // 3. Query all approved leave dates in this month
  const [leaveRows] = await pool.query(
    `SELECT 
      a.employee_id,
      a.leave_type,
      a.is_no_pay,
      a.document_status,
      DATE_FORMAT(a.document_deadline, '%Y-%m-%d') AS document_deadline,
      DATE_FORMAT(d.leave_date, '%Y-%m-%d') AS leave_date
     FROM leave_applications a
     JOIN leave_application_dates d ON a.id = d.leave_application_id
     WHERE a.status = 'approved'
       AND d.leave_date >= ?
       AND d.leave_date <= ?`,
    [startDateStr, endDateStr]
  );

  // 4. Query active operational contingencies in this month
  const [contingencies] = await pool.query(
    `SELECT branch_id, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, 
            DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date
     FROM operational_contingencies
     WHERE status = 'ACTIVE' AND exempt_leave_deductions = 1
       AND start_date <= ? AND end_date >= ?`,
    [endDateStr, startDateStr]
  );

  // 5. Query all leave types to determine paid vs unpaid (LOP) compensation
  const [leaveTypes] = await pool.query('SELECT code, name, is_paid FROM leave_types');
  const leaveTypePaidMap = new Map();
  leaveTypes.forEach(lt => {
    const isPaid = (lt.is_paid !== 0 && lt.is_paid !== false);
    if (lt.code) leaveTypePaidMap.set(lt.code.toLowerCase(), isPaid);
    if (lt.name) leaveTypePaidMap.set(lt.name.toLowerCase(), isPaid);
  });

  let totalLopAccumulator = 0;
  let totalPayableAccumulator = 0;

  const records = employees.map(emp => {
    const sched = scheduleMap.get(emp.branch_id) || { working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] };
    const hols = holidayMap.get(emp.branch_id) || new Set();

    let totalWorkingDays = 0;
    let scheduledDates = [];

    // Calculate total scheduled working days in month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      const dayName = DAY_NAMES[dateObj.getUTCDay()];

      // Check if working day and not public holiday
      if (sched.working_days.includes(dayName) && !hols.has(dateStr)) {
        totalWorkingDays++;
        scheduledDates.push(dateStr);
      }
    }

    const empLeaves = leaveRows.filter(l => l.employee_id === emp.id);
    let paidLeaveDays = 0;
    let lopDays = 0;
    let contingencyExemptDays = 0;
    const leaveBreakdown = {};

    empLeaves.forEach(l => {
      // Check if covered by contingency
      const isContingency = contingencies.some(
        c => c.branch_id === emp.branch_id && l.leave_date >= c.start_date && l.leave_date <= c.end_date
      );

      const typeKey = (l.leave_type || '').toLowerCase();
      // Determine if paid or unpaid based on leave_types.is_paid
      let isPaid = true;
      if (typeKey === 'unpaid' || typeKey === 'lop') {
        isPaid = false;
      } else if (leaveTypePaidMap.has(typeKey)) {
        isPaid = leaveTypePaidMap.get(typeKey);
      }

      // If document was required and not provided/approved (overdue, rejected, or missing past deadline)
      const today = new Date().toISOString().split('T')[0];
      const isDocMissingOrRejected = l.is_no_pay || 
        l.document_status === 'overdue' || 
        l.document_status === 'rejected' || 
        (l.document_status === 'pending_upload' && l.document_deadline && l.document_deadline < today);

      if (isDocMissingOrRejected) {
        isPaid = false;
      }

      const leaveLabel = !isPaid && typeKey !== 'unpaid' && typeKey !== 'lop'
        ? `${l.leave_type} (No Pay - Missing/Rejected Doc)`
        : (l.leave_type || 'Leave');
      leaveBreakdown[leaveLabel] = (leaveBreakdown[leaveLabel] || 0) + 1;

      if (isContingency) {
        contingencyExemptDays++;
      } else if (!isPaid) {
        lopDays++;
      } else {
        paidLeaveDays++;
      }
    });

    const netPayableDays = Math.max(0, totalWorkingDays - lopDays);
    totalLopAccumulator += lopDays;
    totalPayableAccumulator += netPayableDays;

    return {
      employee_id: emp.id,
      employee_name: emp.name,
      branch_name: emp.branch_name || 'Main Office',
      role_name: emp.role_name || 'Staff',
      month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      totalWorkingDays,
      paidLeaveDays,
      contingencyExemptDays,
      lopDays,
      netPayableDays,
      leaveBreakdown,
      epfEtfStatus: netPayableDays > 0 ? 'Eligible' : 'Zero Contribution'
    };
  });

  return {
    month: currentMonth,
    year: currentYear,
    totalEmployees: employees.length,
    totalPayableDays: totalPayableAccumulator,
    totalLopDays: totalLopAccumulator,
    records
  };
}

/**
 * GET /api/payroll/summary
 */
router.get('/summary', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const branchScope = getBranchScope(req) || req.query.branch_id;
  const { month, year } = req.query;

  try {
    const data = await generatePayrollData({
      branch_id: branchScope,
      month,
      year
    });
    res.json(data);
  } catch (err) {
    console.error('Payroll summary error:', err);
    res.status(500).json({ error: 'Failed to generate payroll summary' });
  }
});

/**
 * GET /api/payroll/export-csv
 * Exports CSV for Finance / Payroll software
 */
router.get('/export-csv', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const branchScope = getBranchScope(req) || req.query.branch_id;
  const { month, year } = req.query;

  try {
    const data = await generatePayrollData({
      branch_id: branchScope,
      month,
      year
    });

    // CSV Headers
    const headers = [
      'Employee ID',
      'Employee Name',
      'Branch',
      'Designation / Role',
      'Month/Year',
      'Total Working Days',
      'Approved Paid Leaves',
      'Contingency Exempt Days',
      'Loss of Pay (LOP) Days',
      'Net Payable Days',
      'EPF/ETF Contribution Status'
    ];

    const csvRows = [headers.join(',')];

    data.records.forEach(r => {
      const row = [
        `"${r.employee_id}"`,
        `"${r.employee_name.replace(/"/g, '""')}"`,
        `"${r.branch_name.replace(/"/g, '""')}"`,
        `"${r.role_name.replace(/"/g, '""')}"`,
        `"${r.month}"`,
        r.totalWorkingDays,
        r.paidLeaveDays,
        r.contingencyExemptDays,
        r.lopDays,
        r.netPayableDays,
        `"${r.epfEtfStatus}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\r\n');
    const filename = `Payroll_LOP_Export_${data.year}_${String(data.month).padStart(2, '0')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Payroll export error:', err);
    res.status(500).json({ error: 'Failed to export payroll CSV' });
  }
});

export default router;
