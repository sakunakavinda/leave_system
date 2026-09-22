import crypto from 'crypto';
import pool from '../db.js';

/**
 * Record a transaction in the immutable leave balance ledger
 */
export const recordTransaction = async ({
  employee_id,
  leave_type_code,
  year = new Date().getFullYear(),
  transaction_type,
  units,
  reference_application_id = null,
  notes = null
}) => {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO leave_balance_ledger 
     (id, employee_id, leave_type_code, year, transaction_type, units, reference_application_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      employee_id,
      leave_type_code,
      year,
      transaction_type,
      Math.abs(parseFloat(units)),
      reference_application_id,
      notes
    ]
  );
  return { id, employee_id, leave_type_code, year, transaction_type, units: Math.abs(parseFloat(units)) };
};

/**
 * Calculate dynamic leave balances for an employee in a given year
 */
export const getEmployeeBalances = async (employeeId, year = new Date().getFullYear()) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        leave_type_code,
        SUM(CASE 
          WHEN transaction_type IN ('ALLOCATION', 'MONTHLY_ACCRUAL', 'LEAVE_REFUNDED', 'MANUAL_ADJUSTMENT') THEN units 
          ELSE 0 
        END) AS total_credited,
        SUM(CASE 
          WHEN transaction_type IN ('LEAVE_DEDUCTED', 'LEAVE_RESERVED', 'EXPIRED_ROLLOVER') THEN units 
          ELSE 0 
        END) AS total_debited
       FROM leave_balance_ledger
       WHERE employee_id = ? AND year = ?
       GROUP BY leave_type_code`,
      [employeeId, year]
    );

    const balances = {};
    rows.forEach(r => {
      const credited = parseFloat(r.total_credited) || 0;
      const debited = parseFloat(r.total_debited) || 0;
      balances[r.leave_type_code] = {
        allocated: credited,
        taken: debited,
        remaining: Math.max(0, credited - debited)
      };
    });

    return balances;
  } catch (err) {
    console.error('getEmployeeBalances error:', err);
    return {};
  }
};

/**
 * Record deduction when leave application is confirmed or approved
 */
export const recordLeaveDeduction = async (employeeId, leaveTypeCode, units, applicationId, notes = 'Leave Application Approved') => {
  return recordTransaction({
    employee_id: employeeId,
    leave_type_code: leaveTypeCode,
    year: new Date().getFullYear(),
    transaction_type: 'LEAVE_DEDUCTED',
    units,
    reference_application_id: applicationId,
    notes
  });
};

/**
 * Record refund when leave application is rejected or cancelled
 */
export const recordLeaveRefund = async (employeeId, leaveTypeCode, units, applicationId, notes = 'Leave Application Rejected / Cancelled') => {
  return recordTransaction({
    employee_id: employeeId,
    leave_type_code: leaveTypeCode,
    year: new Date().getFullYear(),
    transaction_type: 'LEAVE_REFUNDED',
    units,
    reference_application_id: applicationId,
    notes
  });
};
