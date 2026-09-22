import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { requireAuth, requireRole, optionalAuth, getBranchScope } from '../middleware/auth.js';
import { recordTransaction } from '../services/ledgerService.js';

const router = express.Router();

/**
 * GET /api/contingencies
 * List contingency declarations with branch details
 */
router.get('/', optionalAuth, async (req, res) => {
  const branchScope = getBranchScope(req) || req.query.branch_id;
  const { status } = req.query;

  try {
    let sql = `
      SELECT 
        c.id,
        c.branch_id,
        DATE_FORMAT(c.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(c.end_date, '%Y-%m-%d') AS end_date,
        c.event_type,
        c.title,
        c.description,
        c.exempt_leave_deductions,
        c.status,
        c.created_at,
        b.name AS branch_name
      FROM operational_contingencies c
      JOIN branches b ON c.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (branchScope && branchScope !== 'all') {
      sql += ' AND c.branch_id = ?';
      params.push(branchScope);
    }

    if (status && status !== 'all') {
      sql += ' AND c.status = ?';
      params.push(status.toUpperCase());
    }

    sql += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch contingencies error:', err);
    res.status(500).json({ error: 'Failed to fetch contingency declarations' });
  }
});

/**
 * POST /api/contingencies
 * Declare an operational emergency / disruption shield
 */
router.post('/', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const {
    branch_id,
    start_date,
    end_date,
    event_type = 'DISASTER',
    title,
    description = '',
    exempt_leave_deductions = true
  } = req.body;

  if (!branch_id || !start_date || !end_date || !title) {
    return res.status(400).json({ error: 'branch_id, start_date, end_date, and title are required' });
  }

  const id = crypto.randomUUID();

  try {
    const branchScope = getBranchScope(req);
    if (branchScope && branch_id !== branchScope) {
      return res.status(403).json({ error: 'Cannot declare contingency outside your branch' });
    }

    await pool.query(
      `INSERT INTO operational_contingencies 
       (id, branch_id, start_date, end_date, event_type, title, description, exempt_leave_deductions, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        id,
        branch_id,
        start_date,
        end_date,
        event_type,
        title.trim(),
        description || '',
        Boolean(exempt_leave_deductions)
      ]
    );

    const [rows] = await pool.query(
      `SELECT c.id, c.branch_id, DATE_FORMAT(c.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(c.end_date, '%Y-%m-%d') AS end_date, c.event_type, c.title,
              c.description, c.exempt_leave_deductions, c.status, b.name AS branch_name
       FROM operational_contingencies c
       JOIN branches b ON c.branch_id = b.id
       WHERE c.id = ?`,
      [id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create contingency error:', err);
    res.status(500).json({ error: 'Failed to declare contingency' });
  }
});

/**
 * PUT /api/contingencies/:id
 * Update or resolve contingency declaration
 */
router.put('/:id', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date, event_type, title, description, exempt_leave_deductions, status } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM operational_contingencies WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Contingency declaration not found' });
    }

    await pool.query(
      `UPDATE operational_contingencies SET
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        event_type = COALESCE(?, event_type),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        exempt_leave_deductions = COALESCE(?, exempt_leave_deductions),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        start_date || null,
        end_date || null,
        event_type || null,
        title ? title.trim() : null,
        description !== undefined ? description : null,
        exempt_leave_deductions !== undefined ? Boolean(exempt_leave_deductions) : null,
        status ? status.toUpperCase() : null,
        id
      ]
    );

    const [rows] = await pool.query(
      `SELECT c.id, c.branch_id, DATE_FORMAT(c.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(c.end_date, '%Y-%m-%d') AS end_date, c.event_type, c.title,
              c.description, c.exempt_leave_deductions, c.status, b.name AS branch_name
       FROM operational_contingencies c
       JOIN branches b ON c.branch_id = b.id
       WHERE c.id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Update contingency error:', err);
    res.status(500).json({ error: 'Failed to update contingency' });
  }
});

/**
 * POST /api/contingencies/:id/apply-retroactive-shield
 * Retroactively refunds leave days deducted during this contingency period
 */
router.post('/:id/apply-retroactive-shield', requireAuth, requireRole('super_admin', 'branch_manager'), async (req, res) => {
  const { id } = req.params;

  try {
    const [events] = await pool.query('SELECT * FROM operational_contingencies WHERE id = ?', [id]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Contingency event not found' });
    }
    const event = events[0];

    // Find all approved applications for this branch overlapping the event date range
    const [overlapRows] = await pool.query(
      `SELECT 
        a.id AS application_id,
        a.employee_id,
        a.leave_type,
        a.applied_date,
        COUNT(d.id) AS days_in_event
       FROM leave_applications a
       JOIN leave_application_dates d ON a.id = d.leave_application_id
       JOIN employees e ON a.employee_id = e.id
       WHERE e.branch_id = ? 
         AND a.status = 'approved'
         AND d.leave_date >= ? 
         AND d.leave_date <= ?
       GROUP BY a.id, a.employee_id, a.leave_type, a.applied_date`,
      [event.branch_id, event.start_date, event.end_date]
    );

    let refundedCount = 0;
    const currentYear = new Date().getFullYear();

    for (const row of overlapRows) {
      const daysToRefund = Number(row.days_in_event);
      if (daysToRefund <= 0) continue;

      // 1. Credit back to balance table
      const colName = `${row.leave_type}_taken`;
      try {
        await pool.query(
          `UPDATE leave_balances SET ${colName} = GREATEST(0, COALESCE(${colName}, 0) - ?) WHERE employee_id = ? AND year = ?`,
          [daysToRefund, row.employee_id, currentYear]
        );
      } catch (e) {}

      // 2. Append refund transaction to immutable ledger
      await recordTransaction({
        employee_id: row.employee_id,
        leave_type_code: row.leave_type,
        year: currentYear,
        transaction_type: 'LEAVE_REFUNDED',
        units: daysToRefund,
        reference_application_id: row.application_id,
        notes: `Emergency Shield Exemption: ${event.title}`
      });

      refundedCount += daysToRefund;
    }

    res.json({
      message: `Retroactive Contingency Shield applied: Refunded ${refundedCount} leave day(s) across ${overlapRows.length} staff application(s).`,
      affectedApplications: overlapRows.length,
      refundedDays: refundedCount
    });
  } catch (err) {
    console.error('Apply retroactive shield error:', err);
    res.status(500).json({ error: 'Failed to apply retroactive shield' });
  }
});

/**
 * DELETE /api/contingencies/:id
 */
router.delete('/:id', requireAuth, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM operational_contingencies WHERE id = ?', [id]);
    res.json({ message: 'Contingency declaration removed', id });
  } catch (err) {
    console.error('Delete contingency error:', err);
    res.status(500).json({ error: 'Failed to delete contingency' });
  }
});

export default router;
