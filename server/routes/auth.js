import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Fallback legacy SHA-256 check
const sha256Hash = (str) => crypto.createHash('sha256').update(str).digest('hex');

/**
 * POST /api/auth/login (Managers & Admins)
 */
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

    // 1. Try bcrypt verification
    try {
      passwordMatches = await bcrypt.compare(password, manager.password_hash);
    } catch (e) {
      passwordMatches = false;
    }

    // 2. Fallback to legacy SHA-256 for existing accounts
    if (!passwordMatches) {
      const legacyHash = sha256Hash(password);
      if (legacyHash === manager.password_hash) {
        passwordMatches = true;
        // Automatically upgrade stored hash to bcrypt
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

    const payload = {
      id: manager.id,
      username: manager.username,
      role: manager.role,
      branch_id: manager.branch_id,
      type: 'manager'
    };

    const token = generateToken(payload);

    res.json({
      token,
      user: {
        id: manager.id,
        username: manager.username,
        role: manager.role,
        branch_id: manager.branch_id,
        status: manager.status
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

/**
 * GET /api/auth/me (Get current authenticated user)
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.user.type === 'manager') {
      const [rows] = await pool.query(
        'SELECT id, username, role, branch_id, status FROM managers WHERE id = ?',
        [req.user.id]
      );
      if (rows.length === 0 || rows[0].status !== 'active') {
        return res.status(401).json({ error: 'User account is inactive or not found' });
      }
      return res.json({ user: rows[0] });
    }

    if (req.user.type === 'employee') {
      const [rows] = await pool.query(
        "SELECT id, name, role_id, branch_id, status, DATE_FORMAT(joined_date, '%Y-%m-%d') AS joined_date FROM employees WHERE id = ?",
        [req.user.id]
      );
      if (rows.length === 0 || rows[0].status !== 'active') {
        return res.status(401).json({ error: 'Employee account is inactive or not found' });
      }
      return res.json({ user: rows[0] });
    }

    res.json({ user: req.user });
  } catch (err) {
    console.error('Session verify error:', err);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

/**
 * POST /api/auth/employee-verify (Verify employee code and issue token)
 */
router.post('/employee-verify', async (req, res) => {
  const { secretCode } = req.body;

  if (!secretCode || secretCode.trim() === '') {
    return res.status(400).json({ error: 'Secret code is required' });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, name, role_id, branch_id, status, DATE_FORMAT(joined_date, '%Y-%m-%d') AS joined_date FROM employees WHERE secret_code = ? AND status = ?",
      [secretCode.trim(), 'active']
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid secret code or inactive employee' });
    }

    const emp = rows[0];
    const payload = {
      id: emp.id,
      name: emp.name,
      role_id: emp.role_id,
      branch_id: emp.branch_id,
      joined_date: emp.joined_date,
      role: 'employee',
      type: 'employee'
    };

    const token = generateToken(payload);

    res.json({
      token,
      employee: emp
    });
  } catch (err) {
    console.error('Employee auth error:', err);
    res.status(500).json({ error: 'Failed to verify employee credentials' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
