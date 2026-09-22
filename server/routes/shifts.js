import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/shifts
 * List all shifts (optionally scoped to a branch + global shifts)
 */
router.get('/', optionalAuth, async (req, res) => {
  const { branch_id } = req.query;

  try {
    let sql = 'SELECT * FROM shift_masters WHERE status = "active"';
    const params = [];

    if (branch_id) {
      sql += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(branch_id);
    }

    sql += ' ORDER BY start_time ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

/**
 * POST /api/shifts
 * Create new shift master
 */
router.post('/', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const {
    branch_id,
    code,
    name,
    start_time,
    end_time,
    crosses_midnight = false,
    duration_hours = 8.0,
    color_code = '#3b82f6'
  } = req.body;

  if (!code || !name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Code, name, start_time, and end_time are required' });
  }

  const id = crypto.randomUUID();

  try {
    await pool.query(
      `INSERT INTO shift_masters 
       (id, branch_id, code, name, start_time, end_time, crosses_midnight, duration_hours, color_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        id,
        branch_id || null,
        code.trim().toUpperCase(),
        name.trim(),
        start_time,
        end_time,
        Boolean(crosses_midnight),
        parseFloat(duration_hours) || 8.0,
        color_code || '#3b82f6'
      ]
    );

    const [rows] = await pool.query('SELECT * FROM shift_masters WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating shift:', err);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

/**
 * PUT /api/shifts/:id
 * Update shift master
 */
router.put('/:id', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const { id } = req.params;
  const {
    branch_id,
    code,
    name,
    start_time,
    end_time,
    crosses_midnight,
    duration_hours,
    color_code,
    status
  } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM shift_masters WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    await pool.query(
      `UPDATE shift_masters SET
        branch_id = COALESCE(?, branch_id),
        code = COALESCE(?, code),
        name = COALESCE(?, name),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        crosses_midnight = COALESCE(?, crosses_midnight),
        duration_hours = COALESCE(?, duration_hours),
        color_code = COALESCE(?, color_code),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        branch_id !== undefined ? (branch_id || null) : null,
        code ? code.trim().toUpperCase() : null,
        name ? name.trim() : null,
        start_time || null,
        end_time || null,
        crosses_midnight !== undefined ? Boolean(crosses_midnight) : null,
        duration_hours !== undefined ? parseFloat(duration_hours) : null,
        color_code || null,
        status || null,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM shift_masters WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating shift:', err);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

/**
 * DELETE /api/shifts/:id
 * Delete shift master
 */
router.delete('/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM shift_masters WHERE id = ?', [id]);
    res.json({ message: 'Shift deleted successfully', id });
  } catch (err) {
    console.error('Error deleting shift:', err);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

export default router;
