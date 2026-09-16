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
  const { name, code: customCode, color, description, status } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Leave type name is required' });
  }

  const code = customCode ? formatCode(customCode) : formatCode(name);
  if (!code) {
    return res.status(400).json({ error: 'Invalid leave type code' });
  }

  const leaveColor = color || '#7c3aed';
  const id = crypto.randomUUID();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check duplicate code or name
    const [existing] = await connection.query(
      'SELECT id FROM leave_types WHERE code = ? OR name = ?',
      [code, name]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'A leave type with this name or code already exists.' });
    }

    // Insert leave type
    await connection.query(
      `INSERT INTO leave_types (id, name, code, color, description, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), code, leaveColor, description || '', status || 'active']
    );

    // Dynamically add columns to leave_rules and leave_balances tables if they don't exist
    const ruleCol = `${code}_leave`;
    const balanceCol = `${code}_taken`;

    try {
      await connection.query(`ALTER TABLE leave_rules ADD COLUMN ${ruleCol} INT DEFAULT 0`);
    } catch (colErr) {
      // Column might already exist, ignore duplicate column error
    }

    try {
      await connection.query(`ALTER TABLE leave_balances ADD COLUMN ${balanceCol} INT DEFAULT 0`);
    } catch (colErr) {
      // Column might already exist, ignore duplicate column error
    }

    await connection.commit();

    const [created] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create leave type', details: err.message });
  } finally {
    connection.release();
  }
});

// PUT update leave type
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color, description, status } = req.body;

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

    await pool.query(
      `UPDATE leave_types 
       SET name = ?, color = ?, description = ?, status = ? 
       WHERE id = ?`,
      [updatedName, updatedColor, updatedDesc, updatedStatus, id]
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
