import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { calculateLeaveDeduction, getBranchSchedule, getBranchHolidays } from '../services/calendarService.js';
import { optionalAuth, getBranchScope } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/holidays
 * Fetch holidays scoped by branch or all branches
 */
router.get('/', optionalAuth, async (req, res) => {
  const branchId = getBranchScope(req) || req.query.branch_id;
  const year = req.query.year ? parseInt(req.query.year) : null;

  try {
    let sql = `
      SELECT h.id, h.branch_id, DATE_FORMAT(h.holiday_date, '%Y-%m-%d') AS holiday_date, 
             h.name, h.holiday_type, h.created_at, b.name AS branch_name
      FROM branch_holidays h
      JOIN branches b ON h.branch_id = b.id
    `;
    const params = [];

    if (branchId) {
      sql += ' WHERE h.branch_id = ?';
      params.push(branchId);
    }

    if (year) {
      sql += branchId ? ' AND YEAR(h.holiday_date) = ?' : ' WHERE YEAR(h.holiday_date) = ?';
      params.push(year);
    }

    sql += ' ORDER BY h.holiday_date ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch holidays error:', err);
    res.status(500).json({ error: 'Failed to fetch branch holidays' });
  }
});

/**
 * POST /api/holidays (Create holiday)
 */
router.post('/', async (req, res) => {
  const { branch_id, holiday_date, name, holiday_type } = req.body;

  if (!branch_id || !holiday_date || !name) {
    return res.status(400).json({ error: 'branch_id, holiday_date, and name are required' });
  }

  const id = crypto.randomUUID();
  try {
    await pool.query(
      'INSERT INTO branch_holidays (id, branch_id, holiday_date, name, holiday_type) VALUES (?, ?, ?, ?, ?)',
      [id, branch_id, holiday_date, name.trim(), holiday_type || 'public']
    );

    const [rows] = await pool.query(
      'SELECT id, branch_id, DATE_FORMAT(holiday_date, "%Y-%m-%d") AS holiday_date, name, holiday_type FROM branch_holidays WHERE id = ?',
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A holiday on this date already exists for this branch' });
    }
    console.error('Create holiday error:', err);
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

/**
 * PUT /api/holidays/:id (Update holiday)
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { holiday_date, name, holiday_type } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE branch_holidays SET holiday_date = ?, name = ?, holiday_type = ? WHERE id = ?',
      [holiday_date, name.trim(), holiday_type || 'public', id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Holiday not found' });

    const [rows] = await pool.query(
      'SELECT id, branch_id, DATE_FORMAT(holiday_date, "%Y-%m-%d") AS holiday_date, name, holiday_type FROM branch_holidays WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update holiday error:', err);
    res.status(500).json({ error: 'Failed to update holiday' });
  }
});

/**
 * DELETE /api/holidays/:id (Delete holiday)
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM branch_holidays WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Holiday not found' });
    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Delete holiday error:', err);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

/**
 * POST /api/holidays/calculate-deduction
 * Live calculation engine for leave applications
 */
router.post('/calculate-deduction', async (req, res) => {
  const { branch_id, leaveDates, employee_id } = req.body;

  if (!branch_id) {
    return res.status(400).json({ error: 'branch_id is required' });
  }

  try {
    const result = await calculateLeaveDeduction(branch_id, leaveDates || [], employee_id || null);
    res.json(result);
  } catch (err) {
    console.error('Calculate deduction error:', err);
    res.status(500).json({ error: 'Failed to calculate leave deduction' });
  }
});

/**
 * GET /api/holidays/schedules/:branch_id
 * Get schedule for a branch
 */
router.get('/schedules/:branch_id', async (req, res) => {
  const { branch_id } = req.params;
  try {
    const schedule = await getBranchSchedule(branch_id);
    res.json(schedule);
  } catch (err) {
    console.error('Get schedule error:', err);
    res.status(500).json({ error: 'Failed to fetch branch schedule' });
  }
});

/**
 * PUT /api/holidays/schedules/:branch_id
 * Configure operating model and working days for a branch
 */
router.put('/schedules/:branch_id', async (req, res) => {
  const { branch_id } = req.params;
  const { operating_model, working_days, weekly_hours } = req.body;

  const id = crypto.randomUUID();
  const workingDaysJson = JSON.stringify(working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  try {
    await pool.query(`
      INSERT INTO branch_schedules (id, branch_id, operating_model, working_days, weekly_hours)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        operating_model = VALUES(operating_model),
        working_days = VALUES(working_days),
        weekly_hours = VALUES(weekly_hours)
    `, [id, branch_id, operating_model || 'corporate_5day', workingDaysJson, weekly_hours || 40.00]);

    const updated = await getBranchSchedule(branch_id);
    res.json(updated);
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(500).json({ error: 'Failed to update branch schedule' });
  }
});

export default router;
