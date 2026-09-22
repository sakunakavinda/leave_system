import express from 'express';
import pool from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to sanitize code string
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

// Auto-create leave_profiles table if it does not exist
let tableInitialized = false;
const ensureTableExists = async () => {
  if (tableInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_profiles (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        entitlements TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    tableInitialized = true;
  } catch (err) {
    console.error('Failed to ensure leave_profiles table:', err);
  }
};

// GET all leave profiles
router.get('/', async (req, res) => {
  try {
    await ensureTableExists();
    const [rows] = await pool.query('SELECT * FROM leave_profiles ORDER BY created_at ASC');
    const formatted = rows.map(r => ({
      ...r,
      entitlements: parseEntitlements(r.entitlements)
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Failed to fetch leave profiles:', err);
    res.status(500).json({ error: 'Failed to fetch leave profiles' });
  }
});

// POST create a new leave profile
router.post('/', async (req, res) => {
  const { name, code: customCode, description, entitlements, status } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Leave profile name is required' });
  }

  const code = customCode ? formatCode(customCode) : formatCode(name);
  if (!code) {
    return res.status(400).json({ error: 'Invalid leave profile code' });
  }

  const id = crypto.randomUUID();
  const entitlementsStr = JSON.stringify(entitlements || {});

  try {
    await ensureTableExists();

    // Check duplicate code or name
    const [existing] = await pool.query(
      'SELECT id FROM leave_profiles WHERE code = ? OR name = ?',
      [code, name.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A leave profile with this name or code already exists.' });
    }

    await pool.query(
      `INSERT INTO leave_profiles (id, name, code, description, entitlements, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), code, description || '', entitlementsStr, status || 'active']
    );

    const [created] = await pool.query('SELECT * FROM leave_profiles WHERE id = ?', [id]);
    res.status(201).json({
      ...created[0],
      entitlements: parseEntitlements(created[0].entitlements)
    });
  } catch (err) {
    console.error('Failed to create leave profile:', err);
    res.status(500).json({ error: 'Failed to create leave profile', details: err.message });
  }
});

// PUT update leave profile
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code: customCode, description, entitlements, status } = req.body;

  try {
    await ensureTableExists();

    const [existing] = await pool.query('SELECT * FROM leave_profiles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave profile not found' });
    }

    const current = existing[0];
    const updatedName = name ? name.trim() : current.name;
    const updatedCode = customCode ? formatCode(customCode) : current.code;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedEntitlements = entitlements !== undefined 
      ? JSON.stringify(entitlements) 
      : current.entitlements;
    const updatedStatus = status || current.status;

    // Check duplicate code or name on other profiles
    if (updatedName !== current.name || updatedCode !== current.code) {
      const [dupes] = await pool.query(
        'SELECT id FROM leave_profiles WHERE (code = ? OR name = ?) AND id != ?',
        [updatedCode, updatedName, id]
      );
      if (dupes.length > 0) {
        return res.status(400).json({ error: 'Another leave profile with this name or code already exists.' });
      }
    }

    await pool.query(
      `UPDATE leave_profiles 
       SET name = ?, code = ?, description = ?, entitlements = ?, status = ? 
       WHERE id = ?`,
      [updatedName, updatedCode, updatedDesc, updatedEntitlements, updatedStatus, id]
    );

    const [updated] = await pool.query('SELECT * FROM leave_profiles WHERE id = ?', [id]);
    res.json({
      ...updated[0],
      entitlements: parseEntitlements(updated[0].entitlements)
    });
  } catch (err) {
    console.error('Failed to update leave profile:', err);
    res.status(500).json({ error: 'Failed to update leave profile', details: err.message });
  }
});

// DELETE leave profile
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await ensureTableExists();

    const [existing] = await pool.query('SELECT * FROM leave_profiles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave profile not found' });
    }

    await pool.query('DELETE FROM leave_profiles WHERE id = ?', [id]);
    res.json({ message: 'Leave profile deleted successfully' });
  } catch (err) {
    console.error('Failed to delete leave profile:', err);
    res.status(500).json({ error: 'Failed to delete leave profile', details: err.message });
  }
});

export default router;
