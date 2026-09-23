import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireRole, getBranchScope } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/rosters
 * Get roster assignments for a given date range and optional branch/employee
 */
router.get('/', async (req, res) => {
  const { branch_id, start_date, end_date, employee_id } = req.query;

  try {
    let sql = `
      SELECT 
        er.id,
        er.employee_id,
        DATE_FORMAT(er.roster_date, '%Y-%m-%d') AS roster_date,
        er.shift_id,
        er.is_rdo,
        er.notes,
        e.name AS employee_name,
        e.branch_id,
        e.role_id,
        sm.code AS shift_code,
        sm.name AS shift_name,
        sm.start_time,
        sm.end_time,
        sm.crosses_midnight,
        sm.duration_hours,
        sm.color_code
      FROM employee_rosters er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN shift_masters sm ON er.shift_id = sm.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id && branch_id !== 'all') {
      sql += ' AND e.branch_id = ?';
      params.push(branch_id);
    }

    if (employee_id) {
      sql += ' AND er.employee_id = ?';
      params.push(employee_id);
    }

    if (start_date) {
      sql += ' AND er.roster_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND er.roster_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY er.roster_date ASC, e.name ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching rosters:', err);
    res.status(500).json({ error: 'Failed to fetch rosters' });
  }
});

/**
 * POST /api/rosters
 * Create or update a single roster assignment (Upsert)
 */
router.post('/', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const { employee_id, roster_date, shift_id, is_rdo = false, notes = null } = req.body;

  if (!employee_id || !roster_date) {
    return res.status(400).json({ error: 'employee_id and roster_date are required' });
  }

  const id = crypto.randomUUID();

  try {
    // If branch manager, verify employee belongs to manager's branch
    const branchScope = getBranchScope(req);
    if (branchScope) {
      const [emp] = await pool.query('SELECT branch_id FROM employees WHERE id = ?', [employee_id]);
      if (emp.length === 0 || emp[0].branch_id !== branchScope) {
        return res.status(403).json({ error: 'Cannot assign roster to employee outside your branch' });
      }
    }

    await pool.query(
      `INSERT INTO employee_rosters (id, employee_id, roster_date, shift_id, is_rdo, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         shift_id = VALUES(shift_id),
         is_rdo = VALUES(is_rdo),
         notes = VALUES(notes),
         updated_at = CURRENT_TIMESTAMP`,
      [id, employee_id, roster_date, is_rdo ? null : shift_id, Boolean(is_rdo), notes]
    );

    const [rows] = await pool.query(
      `SELECT er.id, er.employee_id, DATE_FORMAT(er.roster_date, '%Y-%m-%d') AS roster_date, 
              er.shift_id, er.is_rdo, er.notes, sm.code as shift_code, sm.name as shift_name, sm.color_code
       FROM employee_rosters er
       LEFT JOIN shift_masters sm ON er.shift_id = sm.id
       WHERE er.employee_id = ? AND er.roster_date = ?`,
      [employee_id, roster_date]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating roster:', err);
    res.status(500).json({ error: 'Failed to update roster' });
  }
});

/**
 * POST /api/rosters/bulk
 * Bulk upsert roster entries
 */
router.post('/bulk', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const { entries } = req.body; // Array of { employee_id, roster_date, shift_id, is_rdo, notes }

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries array is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const entry of entries) {
      const { employee_id, roster_date, shift_id, is_rdo, notes } = entry;
      if (!employee_id || !roster_date) continue;

      const id = crypto.randomUUID();
      await conn.query(
        `INSERT INTO employee_rosters (id, employee_id, roster_date, shift_id, is_rdo, notes)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           shift_id = VALUES(shift_id),
           is_rdo = VALUES(is_rdo),
           notes = VALUES(notes),
           updated_at = CURRENT_TIMESTAMP`,
        [id, employee_id, roster_date, is_rdo ? null : shift_id, Boolean(is_rdo), notes || null]
      );
    }

    await conn.commit();
    res.json({ message: `Successfully updated ${entries.length} roster entries` });
  } catch (err) {
    await conn.rollback();
    console.error('Error bulk updating rosters:', err);
    res.status(500).json({ error: 'Failed to bulk update rosters' });
  } finally {
    conn.release();
  }
});

/**
 * DELETE /api/rosters/employee/:employee_id
 * Clear roster assignments for an employee within an optional date range
 */
router.delete('/employee/:employee_id', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const { employee_id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    // If branch manager, verify employee belongs to manager's branch
    const branchScope = getBranchScope(req);
    if (branchScope) {
      const [emp] = await pool.query('SELECT branch_id FROM employees WHERE id = ?', [employee_id]);
      if (emp.length === 0 || emp[0].branch_id !== branchScope) {
        return res.status(403).json({ error: 'Cannot clear roster for employee outside your branch' });
      }
    }

    let sql = 'DELETE FROM employee_rosters WHERE employee_id = ?';
    const params = [employee_id];

    if (start_date) {
      sql += ' AND roster_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND roster_date <= ?';
      params.push(end_date);
    }

    const [result] = await pool.query(sql, params);
    res.json({ message: `Cleared ${result.affectedRows} roster entries`, affectedRows: result.affectedRows });
  } catch (err) {
    console.error('Error clearing employee rosters:', err);
    res.status(500).json({ error: 'Failed to clear employee rosters' });
  }
});

/**
 * DELETE /api/rosters/:id
 * Remove a single roster assignment
 */
router.delete('/:id', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM employee_rosters WHERE id = ?', [id]);
    res.json({ message: 'Roster entry removed successfully', id });
  } catch (err) {
    console.error('Error deleting roster:', err);
    res.status(500).json({ error: 'Failed to delete roster entry' });
  }
});

export default router;
