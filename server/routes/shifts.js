import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireRole, optionalAuth, getBranchScope } from '../middleware/auth.js';

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

    const branchScope = getBranchScope(req);
    if (branchScope) {
      if (existing[0].branch_id && existing[0].branch_id !== branchScope) {
        return res.status(403).json({ error: 'Access denied to this shift' });
      }
      if (branch_id !== undefined && branch_id && branch_id !== branchScope) {
        return res.status(403).json({ error: 'Cannot reassign shift outside your branch' });
      }
    }

    const newBranchId = branch_id !== undefined ? (branch_id ? branch_id : null) : existing[0].branch_id;
    const newCode = code !== undefined && code ? code.trim().toUpperCase() : existing[0].code;
    const newName = name !== undefined && name ? name.trim() : existing[0].name;
    const newStartTime = start_time !== undefined && start_time ? start_time : existing[0].start_time;
    const newEndTime = end_time !== undefined && end_time ? end_time : existing[0].end_time;
    const newCrossesMidnight = crosses_midnight !== undefined ? Boolean(crosses_midnight) : Boolean(existing[0].crosses_midnight);
    const newDurationHours = duration_hours !== undefined ? parseFloat(duration_hours) || 8.0 : existing[0].duration_hours;
    const newColorCode = color_code !== undefined && color_code ? color_code : existing[0].color_code;
    const newStatus = status !== undefined && status ? status : existing[0].status;

    await pool.query(
      `UPDATE shift_masters SET
        branch_id = ?,
        code = ?,
        name = ?,
        start_time = ?,
        end_time = ?,
        crosses_midnight = ?,
        duration_hours = ?,
        color_code = ?,
        status = ?
       WHERE id = ?`,
      [
        newBranchId,
        newCode,
        newName,
        newStartTime,
        newEndTime,
        newCrossesMidnight,
        newDurationHours,
        newColorCode,
        newStatus,
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
