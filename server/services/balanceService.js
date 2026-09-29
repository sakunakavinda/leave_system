import pool from '../db.js';
import crypto from 'crypto';
import { recordLeaveDeduction, recordLeaveRefund } from './ledgerService.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Fetch current system leave cycle configuration from settings table.
 */
export async function getLeaveCycleSettings(connection = pool) {
  try {
    const [rows] = await connection.query(
      'SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("leave_cycle_mode", "monthly_leave_policy")'
    );
    const map = {};
    rows.forEach(r => { map[r.setting_key] = r.setting_value; });
    return {
      cycleMode: map.leave_cycle_mode || 'annual', // 'annual' | 'monthly'
      monthlyPolicy: map.monthly_leave_policy || 'strict_monthly' // 'strict_monthly' | 'accrual'
    };
  } catch (err) {
    console.error('Error fetching leave cycle settings:', err);
    return { cycleMode: 'annual', monthlyPolicy: 'strict_monthly' };
  }
}

/**
 * Ensure leave_balances record exists for the specified employee, year, and month.
 * month = 0 represents the full-year / annual cycle record.
 * month = 1..12 represents monthly cycle records.
 */
export async function ensureBalanceRecord(connection, employeeId, year, month = 0) {
  const [rows] = await connection.query(
    'SELECT * FROM leave_balances WHERE employee_id = ? AND year = ? AND month = ?',
    [employeeId, year, month]
  );
  if (rows.length > 0) return rows[0];

  const id = crypto.randomUUID();
  await connection.query(
    `INSERT INTO leave_balances (id, employee_id, year, month, annual_taken, sick_taken, casual_taken) 
     VALUES (?, ?, ?, ?, 0, 0, 0)
     ON DUPLICATE KEY UPDATE id = id`,
    [id, employeeId, year, month]
  );
  const [newRows] = await connection.query(
    'SELECT * FROM leave_balances WHERE employee_id = ? AND year = ? AND month = ?',
    [employeeId, year, month]
  );
  return newRows[0];
}

/**
 * Group deductible dates from calendar deduction breakdown into { year, month, days } buckets.
 */
export function groupDeductibleDates(breakdown = []) {
  const buckets = {};
  for (const item of breakdown) {
    if (item.isDeductible && item.date) {
      const parts = item.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const key = `${y}-${m}`;
        if (!buckets[key]) {
          buckets[key] = { year: y, month: m, days: 0 };
        }
        buckets[key].days += 1;
      }
    }
  }
  return Object.values(buckets);
}

/**
 * Validate quota availability for both Annual and Monthly cycles.
 */
export async function validateLeaveQuota(connection, {
  employeeId,
  roleId,
  branchId,
  leaveType,
  requestedDays,
  deductionBreakdown = [],
  isManagerOverride = false,
  leaveTypeRecord = null
}) {
  if (requestedDays <= 0) return { valid: true };

  // Fetch leave profile for this employee
  let profileEntitlements = null;
  let leaveProfileName = '';

  if (employeeId) {
    try {
      const [empRows] = await connection.query(
        `SELECT e.leave_profile_id, lp.name AS profile_name, lp.entitlements 
         FROM employees e 
         LEFT JOIN leave_profiles lp ON e.leave_profile_id = lp.id 
         WHERE e.id = ?`,
        [employeeId]
      );
      if (empRows.length > 0) {
        if (!empRows[0].leave_profile_id) {
          return {
            valid: false,
            error: 'No leave profile assigned to employee. Please assign a leave profile under Admin > Employees.'
          };
        }
        leaveProfileName = empRows[0].profile_name;
        if (empRows[0].entitlements) {
          profileEntitlements = typeof empRows[0].entitlements === 'object'
            ? empRows[0].entitlements
            : JSON.parse(empRows[0].entitlements);
        }
      }
    } catch (e) {
      console.error('Error fetching employee profile entitlements:', e);
    }
  }

  const balanceCol = `${leaveType}_taken`;

  const getQuotaForMonth = (m) => {
    if (profileEntitlements && profileEntitlements[leaveType] !== undefined) {
      const ent = profileEntitlements[leaveType];
      if (typeof ent === 'object' && ent !== null) {
        if (ent.months && ent.months[m] !== undefined) {
          return Number(ent.months[m]);
        }
        if (ent.default !== undefined) {
          return Number(ent.default);
        }
      }
      return Number(ent);
    }
    return 0;
  };

  const getAnnualQuota = () => {
    if (profileEntitlements && profileEntitlements[leaveType] !== undefined) {
      const ent = profileEntitlements[leaveType];
      if (typeof ent === 'object' && ent !== null) {
        if (ent.months) {
          return Object.values(ent.months).reduce((sum, v) => sum + (Number(v) || 0), 0);
        }
        if (ent.default !== undefined) {
          return Number(ent.default);
        }
      }
      return Number(ent);
    }
    return 0;
  };

  const isUnpaid = leaveType === 'unpaid' || leaveType === 'lop' || 
    (leaveTypeRecord && (leaveTypeRecord.is_paid === 0 || leaveTypeRecord.is_paid === false));

  const baseQuota = getAnnualQuota();

  // If unpaid type and no quota restriction, allow
  if (!isManagerOverride && isUnpaid && baseQuota <= 0) {
    return { valid: true };
  }
  if (isManagerOverride) {
    return { valid: true };
  }

  // Get current system leave cycle
  const { cycleMode, monthlyPolicy } = await getLeaveCycleSettings(connection);

  if (cycleMode === 'annual') {
    // ── Annual Quota Model ──
    const currentYear = new Date().getFullYear();
    const balanceRow = await ensureBalanceRecord(connection, employeeId, currentYear, 0);
    const taken = balanceRow[balanceCol] ? Number(balanceRow[balanceCol]) : 0;
    const quota = getAnnualQuota();

    if (taken + requestedDays > quota) {
      const remaining = Math.max(0, quota - taken);
      return {
        valid: false,
        error: `You only have ${remaining} ${leaveType} leave days remaining for ${currentYear} (Requested: ${requestedDays} days, Annual Quota: ${quota} days).`
      };
    }
    return { valid: true, cycleMode, quota, taken };
  }

  // ── Monthly Quota Model ──
  const monthlyBuckets = groupDeductibleDates(deductionBreakdown);
  if (monthlyBuckets.length === 0) {
    // Fallback: single bucket for current month
    const now = new Date();
    monthlyBuckets.push({ year: now.getFullYear(), month: now.getMonth() + 1, days: requestedDays });
  }

  if (monthlyPolicy === 'strict_monthly') {
    // Check each affected month independently (Use-it-or-lose-it)
    for (const bucket of monthlyBuckets) {
      const balanceRow = await ensureBalanceRecord(connection, employeeId, bucket.year, bucket.month);
      const takenInMonth = balanceRow[balanceCol] ? Number(balanceRow[balanceCol]) : 0;
      const monthName = MONTH_NAMES[bucket.month - 1] || `Month ${bucket.month}`;
      const quotaForThisMonth = getQuotaForMonth(bucket.month);

      if (takenInMonth + bucket.days > quotaForThisMonth) {
        const remaining = Math.max(0, quotaForThisMonth - takenInMonth);
        return {
          valid: false,
          error: `You have reached your ${quotaForThisMonth} day monthly limit for ${monthName} ${bucket.year}. You only have ${remaining} ${leaveType} days remaining for that month (Requested: ${bucket.days} days).`
        };
      }
    }
    return { valid: true, cycleMode, monthlyPolicy };
  } else {
    // ── Cumulative Accrual Model ──
    // Unused leaves roll over and accumulate across the year
    for (const bucket of monthlyBuckets) {
      const monthName = MONTH_NAMES[bucket.month - 1] || `Month ${bucket.month}`;
      // Calculate cumulative quota through this month
      let accruedToDate = 0;
      for (let m = 1; m <= bucket.month; m++) {
        accruedToDate += getQuotaForMonth(m);
      }

      // Sum all leaves taken in year up to this month
      const [sumRows] = await connection.query(
        `SELECT COALESCE(SUM(${balanceCol}), 0) AS total_taken 
         FROM leave_balances 
         WHERE employee_id = ? AND year = ? AND month > 0 AND month <= ?`,
        [employeeId, bucket.year, bucket.month]
      );
      const totalTakenToDate = sumRows[0] ? Number(sumRows[0].total_taken) : 0;

      if (totalTakenToDate + bucket.days > accruedToDate) {
        const remainingAccrued = Math.max(0, accruedToDate - totalTakenToDate);
        return {
          valid: false,
          error: `Your cumulative accrued ${leaveType} allowance through ${monthName} is ${accruedToDate} days, and you have already taken ${totalTakenToDate} days. Only ${remainingAccrued} days are available (Requested: ${bucket.days} days).`
        };
      }
    }
    return { valid: true, cycleMode, monthlyPolicy };
  }
}

/**
 * Deduct leave days into leave_balances for Annual or Monthly cycles.
 */
export async function deductLeaveDays(connection, {
  employeeId,
  leaveType,
  requestedDays,
  deductionBreakdown = [],
  appId,
  reason = 'Leave Application Submitted'
}) {
  if (requestedDays <= 0) return;

  const { cycleMode } = await getLeaveCycleSettings(connection);
  const colName = `${leaveType}_taken`;

  const safeUpdate = async (year, month, days) => {
    await ensureBalanceRecord(connection, employeeId, year, month);
    try {
      await connection.query(
        `UPDATE leave_balances SET ${colName} = COALESCE(${colName}, 0) + ? 
         WHERE employee_id = ? AND year = ? AND month = ?`,
        [days, employeeId, year, month]
      );
    } catch (colErr) {
      try {
        await connection.query(`ALTER TABLE leave_balances ADD COLUMN ${colName} INT DEFAULT 0`);
        await connection.query(
          `UPDATE leave_balances SET ${colName} = COALESCE(${colName}, 0) + ? 
           WHERE employee_id = ? AND year = ? AND month = ?`,
          [days, employeeId, year, month]
        );
      } catch (e) {
        console.error(`Failed to add/update ${colName}:`, e);
      }
    }
  };

  if (cycleMode === 'annual') {
    const currentYear = new Date().getFullYear();
    await safeUpdate(currentYear, 0, requestedDays);
  } else {
    const monthlyBuckets = groupDeductibleDates(deductionBreakdown);
    if (monthlyBuckets.length === 0) {
      const now = new Date();
      await safeUpdate(now.getFullYear(), now.getMonth() + 1, requestedDays);
    } else {
      for (const bucket of monthlyBuckets) {
        await safeUpdate(bucket.year, bucket.month, bucket.days);
      }
    }
  }

  // Record in immutable ledger
  try {
    await recordLeaveDeduction(employeeId, leaveType, requestedDays, appId, reason);
  } catch (ledgErr) {
    console.error('Ledger deduction record error:', ledgErr);
  }
}

/**
 * Refund leave days from leave_balances for Annual or Monthly cycles.
 */
export async function refundLeaveDays(connection, {
  employeeId,
  leaveType,
  requestedDays,
  deductionBreakdown = [],
  appId,
  reason = 'Leave Application Cancelled / Rejected'
}) {
  if (requestedDays <= 0) return;

  const { cycleMode } = await getLeaveCycleSettings(connection);
  const colName = `${leaveType}_taken`;

  const safeRefund = async (year, month, days) => {
    try {
      await connection.query(
        `UPDATE leave_balances SET ${colName} = GREATEST(0, COALESCE(${colName}, 0) - ?) 
         WHERE employee_id = ? AND year = ? AND month = ?`,
        [days, employeeId, year, month]
      );
    } catch (e) {
      console.error(`Failed to refund ${colName}:`, e);
    }
  };

  if (cycleMode === 'annual') {
    const currentYear = new Date().getFullYear();
    await safeRefund(currentYear, 0, requestedDays);
  } else {
    const monthlyBuckets = groupDeductibleDates(deductionBreakdown);
    if (monthlyBuckets.length === 0) {
      const now = new Date();
      await safeRefund(now.getFullYear(), now.getMonth() + 1, requestedDays);
    } else {
      for (const bucket of monthlyBuckets) {
        await safeRefund(bucket.year, bucket.month, bucket.days);
      }
    }
  }

  // Record refund in immutable ledger
  try {
    await recordLeaveRefund(employeeId, leaveType, requestedDays, appId, reason);
  } catch (ledgErr) {
    console.error('Ledger refund record error:', ledgErr);
  }
}
