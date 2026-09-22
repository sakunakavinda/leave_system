import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

const sha256Hash = (str) => crypto.createHash('sha256').update(str).digest('hex');

// GET all managers
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, created_at FROM managers ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Fetch managers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username, password_hash, role, branch_id, status FROM managers WHERE username = ? AND status = ?',
      [username.trim(), 'active']
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const manager = rows[0];
    let passwordMatches = false;

    // 1. Try bcrypt
    try {
      passwordMatches = await bcrypt.compare(password, manager.password_hash);
    } catch (e) {
      passwordMatches = false;
    }

    // 2. Fallback to legacy SHA-256 with auto-upgrade
    if (!passwordMatches) {
      const legacyHash = sha256Hash(password);
      if (legacyHash === manager.password_hash) {
        passwordMatches = true;
        try {
          const modernHash = await bcrypt.hash(password, 10);
          await pool.query('UPDATE managers SET password_hash = ? WHERE id = ?', [modernHash, manager.id]);
        } catch (upgradeErr) {
          console.error('Failed to upgrade password hash:', upgradeErr);
        }
      }
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken({
      id: manager.id,
      username: manager.username,
      role: manager.role,
      branch_id: manager.branch_id,
      type: 'manager'
    });

    res.json({
      id: manager.id,
      username: manager.username,
      role: manager.role,
      branch_id: manager.branch_id,
      status: manager.status,
      token
    });
  } catch (err) {
    console.error('Manager login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create manager
router.post('/', async (req, res) => {
  const { username, password, role, branch_id, status } = req.body;
  const id = crypto.randomUUID();

  try {
    const hash = await bcrypt.hash(password || 'password', 10);
    await pool.query(
      'INSERT INTO managers (id, username, password_hash, role, branch_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username.trim(), hash, role || 'manager', branch_id || null, status || 'active']
    );

    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, created_at FROM managers WHERE id = ?',
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create manager error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update manager
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role, branch_id, status } = req.body;

  try {
    let result;
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      [result] = await pool.query(
        'UPDATE managers SET username = ?, password_hash = ?, role = ?, branch_id = ?, status = ? WHERE id = ?',
        [username.trim(), hash, role, branch_id || null, status, id]
      );
    } else {
      [result] = await pool.query(
        'UPDATE managers SET username = ?, role = ?, branch_id = ?, status = ? WHERE id = ?',
        [username.trim(), role, branch_id || null, status, id]
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status FROM managers WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update manager error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE manager
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id FROM managers WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Manager not found' });

    await pool.query('DELETE FROM managers WHERE id = ?', [id]);
    res.json({ message: 'Manager deleted' });
  } catch (err) {
    console.error('Delete manager error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
