import express from 'express';
import pool from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to sanitize code string (e.g. "Executive Staff" -> "executive_staff")
const formatCode = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

// Helper to safely parse JSON entitlements
const parseEntitlements = (entitlements) => {
  if (!entitlements) return {};
  if (typeof entitlements === 'object') return entitlements;
  try {
    return JSON.parse(entitlements);
  } catch (e) {
    return {};
  }
};

// GET all leave groups
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_groups ORDER BY created_at ASC');
    const formatted = rows.map(r => ({
      ...r,
      entitlements: parseEntitlements(r.entitlements)
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch leave groups:', err);
    res.status(500).json({ error: 'Failed to fetch leave groups' });
  }
});

// POST create a new leave group
router.post('/', async (req, res) => {
  const { name, code: customCode, description, entitlements, status } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Leave group name is required' });
  }

  const code = customCode ? formatCode(customCode) : formatCode(name);
  if (!code) {
    return res.status(400).json({ error: 'Invalid leave group code' });
  }

  const id = crypto.randomUUID();
  const entitlementsStr = JSON.stringify(entitlements || {});

  try {
    // Check duplicate code or name
    const [existing] = await pool.query(
      'SELECT id FROM leave_groups WHERE code = ? OR name = ?',
      [code, name.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A leave group with this name or code already exists.' });
    }

    await pool.query(
      `INSERT INTO leave_groups (id, name, code, description, entitlements, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), code, description || '', entitlementsStr, status || 'active']
    );

    const [created] = await pool.query('SELECT * FROM leave_groups WHERE id = ?', [id]);
    res.status(201).json({
      ...created[0],
      entitlements: parseEntitlements(created[0].entitlements)
    });
  } catch (err) {
    console.error('Failed to create leave group:', err);
    res.status(500).json({ error: 'Failed to create leave group', details: err.message });
  }
});

// PUT update leave group
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, entitlements, status } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM leave_groups WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave group not found' });
    }

    const current = existing[0];
    const updatedName = name ? name.trim() : current.name;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedEntitlements = entitlements !== undefined 
      ? JSON.stringify(entitlements) 
      : current.entitlements;
    const updatedStatus = status || current.status;

    await pool.query(
      `UPDATE leave_groups 
       SET name = ?, description = ?, entitlements = ?, status = ? 
       WHERE id = ?`,
      [updatedName, updatedDesc, updatedEntitlements, updatedStatus, id]
    );

    const [updated] = await pool.query('SELECT * FROM leave_groups WHERE id = ?', [id]);
    res.json({
      ...updated[0],
      entitlements: parseEntitlements(updated[0].entitlements)
    });
  } catch (err) {
    console.error('Failed to update leave group:', err);
    res.status(500).json({ error: 'Failed to update leave group', details: err.message });
  }
});

// DELETE leave group
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT * FROM leave_groups WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave group not found' });
    }

    await pool.query('DELETE FROM leave_groups WHERE id = ?', [id]);
    res.json({ message: 'Leave group deleted successfully' });
  } catch (err) {
    console.error('Failed to delete leave group:', err);
    res.status(500).json({ error: 'Failed to delete leave group', details: err.message });
  }
});

export default router;
