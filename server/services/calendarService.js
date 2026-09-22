import pool from '../db.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_SCHEDULE = {
  operating_model: 'corporate_5day',
  working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  weekly_hours: 40.00
};

/**
 * Get operating schedule for a branch
 */
export const getBranchSchedule = async (branchId) => {
  try {
    const [rows] = await pool.query(
      'SELECT operating_model, working_days, weekly_hours FROM branch_schedules WHERE branch_id = ?',
      [branchId]
    );

    if (rows.length === 0) {
      return DEFAULT_SCHEDULE;
    }

    let workingDays = DEFAULT_SCHEDULE.working_days;
    try {
      workingDays = typeof rows[0].working_days === 'string' 
        ? JSON.parse(rows[0].working_days) 
        : rows[0].working_days || DEFAULT_SCHEDULE.working_days;
    } catch (e) {
      workingDays = DEFAULT_SCHEDULE.working_days;
    }

    return {
      operating_model: rows[0].operating_model || 'corporate_5day',
      working_days: workingDays,
      weekly_hours: parseFloat(rows[0].weekly_hours) || 40.00
    };
  } catch (err) {
    console.error('getBranchSchedule error:', err);
    return DEFAULT_SCHEDULE;
  }
};

/**
 * Get all holidays for a branch (optionally in a year/date range)
 */
export const getBranchHolidays = async (branchId, year) => {
  try {
    let sql = 'SELECT id, branch_id, DATE_FORMAT(holiday_date, "%Y-%m-%d") AS holiday_date, name, holiday_type FROM branch_holidays WHERE branch_id = ?';
    const params = [branchId];

    if (year) {
      sql += ' AND YEAR(holiday_date) = ?';
      params.push(year);
    }

    sql += ' ORDER BY holiday_date ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error('getBranchHolidays error:', err);
    return [];
  }
};

/**
 * Calculate net deductible leave days by taking into account:
 * 1. Individual employee roster assignments (RDO = 0 units, Night Shift = 1 unit)
 * 2. Branch observed public holidays (0 units)
 * 3. Branch regular non-working days (0 units)
 */
export const calculateLeaveDeduction = async (branchId, leaveDates = [], employeeId = null) => {
  if (!leaveDates || leaveDates.length === 0) {
    return {
      totalCalendarDays: 0,
      netWorkingDaysDeducted: 0,
      freeDaysCount: 0,
      breakdown: []
    };
  }

  // 1. Fetch branch schedule and holidays
  const schedule = await getBranchSchedule(branchId);
  const holidays = await getBranchHolidays(branchId);
  const holidayMap = new Map();
  holidays.forEach(h => {
    holidayMap.set(h.holiday_date, h);
  });

  // 2. Fetch employee roster if employeeId is provided
  const rosterMap = new Map();
  const cleanDates = leaveDates.map(d => typeof d === 'string' ? d.split('T')[0] : '').filter(Boolean);
  if (employeeId && cleanDates.length > 0) {
    try {
      const [rosterRows] = await pool.query(
        `SELECT DATE_FORMAT(er.roster_date, '%Y-%m-%d') AS roster_date, 
                er.is_rdo, sm.code as shift_code, sm.name as shift_name, 
                sm.crosses_midnight, sm.duration_hours
         FROM employee_rosters er
         LEFT JOIN shift_masters sm ON er.shift_id = sm.id
         WHERE er.employee_id = ? AND er.roster_date IN (?)`,
        [employeeId, cleanDates]
      );
      rosterRows.forEach(r => {
        rosterMap.set(r.roster_date, r);
      });
    } catch (e) {
      console.error('Error fetching employee roster for deduction:', e);
    }
  }

  // 3. Fetch active operational contingencies for this branch
  let activeContingencies = [];
  try {
    const [cRows] = await pool.query(
      `SELECT title, event_type, DATE_FORMAT(start_date, '%Y-%m-%d') as start_date, 
              DATE_FORMAT(end_date, '%Y-%m-%d') as end_date, exempt_leave_deductions
       FROM operational_contingencies
       WHERE branch_id = ? AND status = 'ACTIVE' AND exempt_leave_deductions = 1`,
      [branchId]
    );
    activeContingencies = cRows;
  } catch (e) {
    console.error('Error fetching contingencies for deduction:', e);
  }

  const breakdown = [];
  let netWorkingDays = 0;
  let freeDays = 0;

  for (const dateStr of cleanDates) {
    // Use UTC date parts to avoid local timezone off-by-one errors
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = DAY_NAMES[dateObj.getUTCDay()];

    // A. Check active emergency contingency shield first
    const activeShield = activeContingencies.find(c => dateStr >= c.start_date && dateStr <= c.end_date);
    if (activeShield) {
      freeDays++;
      breakdown.push({
        date: dateStr,
        dayName: dayOfWeek,
        isDeductible: false,
        deductionUnits: 0,
        reason: `Contingency Shield: ${activeShield.title} (${activeShield.event_type})`
      });
      continue;
    }

    // B. Check employee roster assignment (if employee has personal roster)
    if (rosterMap.has(dateStr)) {
      const roster = rosterMap.get(dateStr);
      if (roster.is_rdo) {
        freeDays++;
        breakdown.push({
          date: dateStr,
          dayName: dayOfWeek,
          isDeductible: false,
          deductionUnits: 0,
          reason: 'Rostered Day Off (RDO)'
        });
        continue;
      }

      if (roster.shift_name) {
        netWorkingDays += 1.0;
        breakdown.push({
          date: dateStr,
          dayName: dayOfWeek,
          isDeductible: true,
          deductionUnits: 1.0,
          reason: roster.crosses_midnight
            ? `Night Shift: ${roster.shift_name} (1 Shift Unit)`
            : `Rostered Shift: ${roster.shift_name}`
        });
        continue;
      }
    }

    // B. Check if it is a branch holiday
    if (holidayMap.has(dateStr)) {
      const holiday = holidayMap.get(dateStr);
      freeDays++;
      breakdown.push({
        date: dateStr,
        dayName: dayOfWeek,
        isDeductible: false,
        deductionUnits: 0,
        reason: `Observed Holiday: ${holiday.name} (${holiday.holiday_type})`
      });
      continue;
    }

    // C. Check if it is a scheduled working day for this branch
    const isWorkingDay = schedule.working_days.includes(dayOfWeek);
    if (!isWorkingDay) {
      freeDays++;
      breakdown.push({
        date: dateStr,
        dayName: dayOfWeek,
        isDeductible: false,
        deductionUnits: 0,
        reason: `Scheduled Non-Working Day (${dayOfWeek})`
      });
      continue;
    }

    // D. Standard regular working day
    netWorkingDays++;
    breakdown.push({
      date: dateStr,
      dayName: dayOfWeek,
      isDeductible: true,
      deductionUnits: 1.0,
      reason: 'Regular Working Day'
    });
  }

  return {
    totalCalendarDays: cleanDates.length,
    netWorkingDaysDeducted: netWorkingDays,
    freeDaysCount: freeDays,
    scheduleModel: schedule.operating_model,
    breakdown
  };
};
