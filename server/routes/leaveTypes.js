import express from 'express';
import pool from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to sanitize code string (e.g. "Special Leave!" -> "special_leave")
const formatCode = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

// GET all leave types
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_types ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
});

// POST create a new leave type
router.post('/', async (req, res) => {
  const { 
    name, 
    code: customCode, 
    color, 
    description, 
    status,
    notice_days_required = 0,
    max_consecutive_days = 0,
    doc_required_after_days = 0,
    carry_forward_max_days = 0,
    min_service_days_required = 0
  } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Leave type name is required' });
  }

  const code = customCode ? formatCode(customCode) : formatCode(name);
  if (!code) {
    return res.status(400).json({ error: 'Invalid leave type code' });
  }

  const leaveColor = color || '#7c3aed';
  const id = crypto.randomUUID();

  try {
    // Check duplicate code or name
    const [existing] = await pool.query(
      'SELECT id FROM leave_types WHERE code = ? OR name = ?',
      [code, name]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A leave type with this name or code already exists.' });
    }

    // Insert leave type with customizable policy parameters
    await pool.query(
      `INSERT INTO leave_types 
       (id, name, code, color, description, status, notice_days_required, max_consecutive_days, doc_required_after_days, carry_forward_max_days, min_service_days_required) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        name.trim(), 
        code, 
        leaveColor, 
        description || '', 
        status || 'active',
        parseInt(notice_days_required) || 0,
        parseInt(max_consecutive_days) || 0,
        parseInt(doc_required_after_days) || 0,
        parseInt(carry_forward_max_days) || 0,
        parseInt(min_service_days_required) || 0
      ]
    );

    // Keep backward-compatible columns in legacy tables if needed
    try {
      await pool.query(`ALTER TABLE leave_rules ADD COLUMN ${code}_leave INT DEFAULT 0`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE leave_balances ADD COLUMN ${code}_taken INT DEFAULT 0`);
    } catch (e) {}

    const [created] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create leave type', details: err.message });
  }
});

// PUT update leave type
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    color, 
    description, 
    status,
    notice_days_required,
    max_consecutive_days,
    doc_required_after_days,
    carry_forward_max_days,
    min_service_days_required
  } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    const current = existing[0];
    const updatedName = name ? name.trim() : current.name;
    const updatedColor = color || current.color;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedStatus = status || current.status;
    const updatedNotice = notice_days_required !== undefined ? parseInt(notice_days_required) : current.notice_days_required;
    const updatedMaxConsec = max_consecutive_days !== undefined ? parseInt(max_consecutive_days) : current.max_consecutive_days;
    const updatedDocDays = doc_required_after_days !== undefined ? parseInt(doc_required_after_days) : current.doc_required_after_days;
    const updatedCarryFwd = carry_forward_max_days !== undefined ? parseInt(carry_forward_max_days) : current.carry_forward_max_days;
    const updatedMinService = min_service_days_required !== undefined ? parseInt(min_service_days_required) : current.min_service_days_required;

    await pool.query(
      `UPDATE leave_types 
       SET name = ?, color = ?, description = ?, status = ?,
           notice_days_required = ?, max_consecutive_days = ?, doc_required_after_days = ?,
           carry_forward_max_days = ?, min_service_days_required = ?
       WHERE id = ?`,
      [
        updatedName, 
        updatedColor, 
        updatedDesc, 
        updatedStatus,
        updatedNotice,
        updatedMaxConsec,
        updatedDocDays,
        updatedCarryFwd,
        updatedMinService,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update leave type', details: err.message });
  }
});

// DELETE leave type
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    const lt = existing[0];
    // Don't delete built-in core types if needed, or allow soft-delete / status change
    await pool.query('DELETE FROM leave_types WHERE id = ?', [id]);
    res.json({ success: true, message: `Leave type '${lt.name}' deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete leave type', details: err.message });
  }
});

export default router;
