import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = express.Router();

/**
 * Initialize operating_schedules table and ensure default schedules exist.
 */
export async function initOperatingSchedulesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS operating_schedules (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        working_days TEXT NOT NULL,
        daily_hours DECIMAL(5,2) DEFAULT 8.00,
        weekly_hours DECIMAL(5,2) DEFAULT 40.00,
        is_default TINYINT(1) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const defaults = [
      {
        id: 'default-corp-5day',
        code: 'corporate_5day',
        name: 'Corporate 5-Day (Mon–Fri)',
        description: 'Standard corporate business hours across Monday through Friday.',
        working_days: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        daily_hours: 8.00,
        weekly_hours: 40.00,
        is_default: 1
      },
      {
        id: 'default-ret-55day',
        code: 'retail_5_5day',
        name: 'Commercial 5.5-Day (Mon–Sat half)',
        description: 'Commercial operations covering Mon–Fri full day and Saturday half day.',
        working_days: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
        daily_hours: 8.00,
        weekly_hours: 44.00,
        is_default: 1
      },
      {
        id: 'default-ret-6day',
        code: 'retail_6day',
        name: 'Operational / Retail 6-Day (Mon–Sat)',
        description: 'Standard retail and operational model running Monday through Saturday.',
        working_days: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
        daily_hours: 8.00,
        weekly_hours: 48.00,
        is_default: 1
      },
      {
        id: 'default-fac-7day',
        code: 'factory_24_7',
        name: 'Continuous Coverage (All 7 Days)',
        description: 'Continuous facility operational schedule across all seven days of the week.',
        working_days: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
        daily_hours: 8.00,
        weekly_hours: 56.00,
        is_default: 1
      }
    ];

    for (const d of defaults) {
      await pool.query(`
        INSERT INTO operating_schedules (id, code, name, description, working_days, daily_hours, weekly_hours, is_default, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          is_default = 1
      `, [d.id, d.code, d.name, d.description, d.working_days, d.daily_hours, d.weekly_hours, d.is_default]);
    }
  } catch (err) {
    console.error('Failed to initialize operating_schedules table:', err);
  }
}

/**
 * Helper to slugify a string into a clean schedule code
 */
function generateScheduleCode(name) {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `custom_${base || 'schedule'}_${suffix}`;
}

/**
 * GET /api/operating-schedules
 * Fetch all operating schedules with branch usage counts
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT os.*, COUNT(bs.branch_id) as branch_count
      FROM operating_schedules os
      LEFT JOIN branch_schedules bs ON os.code = bs.operating_model
      GROUP BY os.id
      ORDER BY os.is_default DESC, os.created_at ASC
    `);

    const formatted = rows.map(r => {
      let workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      try {
        workingDays = typeof r.working_days === 'string' ? JSON.parse(r.working_days) : r.working_days;
      } catch (e) {}

      return {
        ...r,
        is_default: Boolean(r.is_default),
        branch_count: parseInt(r.branch_count, 10) || 0,
        working_days: workingDays,
        daily_hours: parseFloat(r.daily_hours) || 8.00,
        weekly_hours: parseFloat(r.weekly_hours) || 40.00
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Fetch operating schedules error:', err);
    res.status(500).json({ error: 'Failed to fetch operating schedules' });
  }
});

/**
 * POST /api/operating-schedules
 * Add a new custom operating schedule
 */
router.post('/', async (req, res) => {
  const { name, description, working_days, daily_hours, weekly_hours, status } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Schedule name is required' });
  }

  if (!Array.isArray(working_days) || working_days.length === 0) {
    return res.status(400).json({ error: 'At least one working day must be selected' });
  }

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sanitizedDays = working_days.filter(d => validDays.includes(d));
  if (sanitizedDays.length === 0) {
    return res.status(400).json({ error: 'Invalid working days specified' });
  }

  const parsedDaily = parseFloat(daily_hours) > 0 ? parseFloat(daily_hours) : 8.00;
  const parsedWeekly = parseFloat(weekly_hours) > 0 ? parseFloat(weekly_hours) : parseFloat((parsedDaily * sanitizedDays.length).toFixed(1));
  const scheduleId = crypto.randomUUID();
  const scheduleCode = generateScheduleCode(name.trim());

  try {
    await pool.query(`
      INSERT INTO operating_schedules (id, code, name, description, working_days, daily_hours, weekly_hours, is_default, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [
      scheduleId,
      scheduleCode,
      name.trim(),
      description ? description.trim() : '',
      JSON.stringify(sanitizedDays),
      parsedDaily,
      parsedWeekly,
      status || 'active'
    ]);

    const [rows] = await pool.query('SELECT * FROM operating_schedules WHERE id = ?', [scheduleId]);
    const created = rows[0];
    res.status(201).json({
      ...created,
      is_default: false,
      branch_count: 0,
      working_days: sanitizedDays,
      daily_hours: parseFloat(created.daily_hours) || 8.00,
      weekly_hours: parseFloat(created.weekly_hours) || 40.00
    });
  } catch (err) {
    console.error('Create operating schedule error:', err);
    res.status(500).json({ error: 'Failed to create operating schedule' });
  }
});

/**
 * PUT /api/operating-schedules/:id
 * Update an operating schedule
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, working_days, daily_hours, weekly_hours, status } = req.body;

  try {
    const [existingRows] = await pool.query('SELECT * FROM operating_schedules WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Operating schedule not found' });
    }

    const existing = existingRows[0];
    const isDefault = Boolean(existing.is_default);

    const updatedName = name ? name.trim() : existing.name;
    const updatedDesc = description !== undefined ? description.trim() : existing.description;
    
    let sanitizedDays = existing.working_days;
    if (Array.isArray(working_days) && working_days.length > 0) {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const filtered = working_days.filter(d => validDays.includes(d));
      if (filtered.length > 0) sanitizedDays = JSON.stringify(filtered);
    } else if (typeof sanitizedDays !== 'string') {
      sanitizedDays = JSON.stringify(sanitizedDays);
    }

    const parsedDaily = parseFloat(daily_hours) > 0 ? parseFloat(daily_hours) : parseFloat(existing.daily_hours) || 8.00;
    const parsedWeekly = parseFloat(weekly_hours) > 0 ? parseFloat(weekly_hours) : parseFloat(existing.weekly_hours) || 40.00;
    const updatedStatus = status || existing.status || 'active';

    await pool.query(`
      UPDATE operating_schedules 
      SET name = ?, description = ?, working_days = ?, daily_hours = ?, weekly_hours = ?, status = ?
      WHERE id = ?
    `, [updatedName, updatedDesc, sanitizedDays, parsedDaily, parsedWeekly, updatedStatus, id]);

    const [rows] = await pool.query(`
      SELECT os.*, COUNT(bs.branch_id) as branch_count
      FROM operating_schedules os
      LEFT JOIN branch_schedules bs ON os.code = bs.operating_model
      WHERE os.id = ?
      GROUP BY os.id
    `, [id]);

    const updated = rows[0];
    let workingDaysArr = [];
    try {
      workingDaysArr = typeof updated.working_days === 'string' ? JSON.parse(updated.working_days) : updated.working_days;
    } catch (e) {}

    res.json({
      ...updated,
      is_default: isDefault,
      branch_count: parseInt(updated.branch_count, 10) || 0,
      working_days: workingDaysArr,
      daily_hours: parseFloat(updated.daily_hours) || 8.00,
      weekly_hours: parseFloat(updated.weekly_hours) || 40.00
    });
  } catch (err) {
    console.error('Update operating schedule error:', err);
    res.status(500).json({ error: 'Failed to update operating schedule' });
  }
});

/**
 * DELETE /api/operating-schedules/:id
 * Delete a custom operating schedule (cannot delete default system models or schedules in use)
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM operating_schedules WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Operating schedule not found' });
    }

    const schedule = rows[0];
    if (schedule.is_default) {
      return res.status(400).json({ error: 'Built-in default system schedules cannot be deleted.' });
    }

    // Check if any branches are assigned to this schedule
    const [branchUsage] = await pool.query(
      'SELECT COUNT(*) as count FROM branch_schedules WHERE operating_model = ?',
      [schedule.code]
    );

    const count = branchUsage[0]?.count || 0;
    if (count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete schedule "${schedule.name}" because it is currently assigned to ${count} branch(es). Please reassign those branches first.` 
      });
    }

    await pool.query('DELETE FROM operating_schedules WHERE id = ?', [id]);
    res.json({ message: 'Operating schedule removed successfully' });
  } catch (err) {
    console.error('Delete operating schedule error:', err);
    res.status(500).json({ error: 'Failed to delete operating schedule' });
  }
});

export default router;
