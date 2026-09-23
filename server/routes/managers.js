import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db.js';
import { generateToken, isAdminRole } from '../middleware/auth.js';

const router = express.Router();

const sha256Hash = (str) => crypto.createHash('sha256').update(str).digest('hex');

export const DEFAULT_BRANCH_MANAGER_PERMISSIONS = {
  'leaves.view': true,
  'leaves.approve_reject': true,
  'leaves.mark_unpaid': true,
  'employees.view': true,
  'employees.create_edit': false,
  'employees.adjust_balance': false,
  'employees.delete': false,
  'rosters.view': true,
  'rosters.edit': true,
  'shifts.view': true,
  'shifts.manage': false,
  'payroll.view': true,
  'payroll.export': false,
  'holidays.view': true,
  'holidays.manage': false,
  'overview.view': true,
  'contingencies.view': true,
  'contingencies.declare': false
};

export const DEFAULT_HR_OFFICER_PERMISSIONS = {
  'leaves.view': true,
  'leaves.approve_reject': false,
  'leaves.mark_unpaid': false,
  'employees.view': true,
  'employees.create_edit': true,
  'employees.adjust_balance': true,
  'employees.delete': true,
  'rosters.view': true,
  'rosters.edit': false,
  'shifts.view': true,
  'shifts.manage': false,
  'payroll.view': true,
  'payroll.export': true,
  'holidays.view': true,
  'holidays.manage': true,
  'overview.view': true,
  'contingencies.view': true,
  'contingencies.declare': false
};

export const DEFAULT_ADMIN_PERMISSIONS = {
  '*': true,
  'leaves.view': true,
  'leaves.approve_reject': true,
  'leaves.mark_unpaid': true,
  'employees.view': true,
  'employees.create_edit': true,
  'employees.adjust_balance': true,
  'employees.delete': true,
  'rosters.view': true,
  'rosters.edit': true,
  'shifts.view': true,
  'shifts.manage': true,
  'payroll.view': true,
  'payroll.export': true,
  'holidays.view': true,
  'holidays.manage': true,
  'overview.view': true,
  'contingencies.view': true,
  'contingencies.declare': true
};

export function getDefaultPermissionsForRole(role) {
  if (isAdminRole(role)) {
    return DEFAULT_ADMIN_PERMISSIONS;
  }
  if (role === 'hr_officer' || role === 'hr') {
    return DEFAULT_HR_OFFICER_PERMISSIONS;
  }
  return DEFAULT_BRANCH_MANAGER_PERMISSIONS;
}

export function formatPermissions(perms, role) {
  if (!perms) {
    return getDefaultPermissionsForRole(role);
  }
  if (typeof perms === 'string') {
    try {
      return JSON.parse(perms);
    } catch (e) {
      return getDefaultPermissionsForRole(role);
    }
  }
  return perms;
}

/**
 * Initialize managers table schema (ensures permissions column exists)
 */
export async function initManagersTable() {
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'managers' AND COLUMN_NAME = 'permissions'`
    );
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE managers ADD COLUMN permissions JSON DEFAULT NULL`);
      console.log('  ✓ Added permissions column to managers table');
    }
  } catch (err) {
    console.warn('initManagersTable notice:', err.message);
  }
}

// GET all managers
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, permissions, created_at FROM managers ORDER BY created_at ASC'
    );
    const managers = rows.map(m => ({
      ...m,
      permissions: formatPermissions(m.permissions, m.role)
    }));
    res.json(managers);
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
      'SELECT id, username, password_hash, role, branch_id, status, permissions FROM managers WHERE username = ? AND status = ?',
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

    const userPermissions = formatPermissions(manager.permissions, manager.role);

    const token = generateToken({
      id: manager.id,
      username: manager.username,
      role: manager.role,
      branch_id: manager.branch_id,
      permissions: userPermissions,
      type: 'manager'
    });

    res.json({
      id: manager.id,
      username: manager.username,
      role: manager.role,
      branch_id: manager.branch_id,
      status: manager.status,
      permissions: userPermissions,
      token
    });
  } catch (err) {
    console.error('Manager login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create manager
router.post('/', async (req, res) => {
  const { username, password, role, branch_id, status, permissions } = req.body;
  const id = crypto.randomUUID();

  const normalizedRole = role || 'branch_manager';
  const assignedBranch = isAdminRole(normalizedRole) ? null : (branch_id || null);
  const finalPermissions = JSON.stringify(formatPermissions(permissions, normalizedRole));

  try {
    const hash = await bcrypt.hash(password || 'password', 10);
    await pool.query(
      'INSERT INTO managers (id, username, password_hash, role, branch_id, status, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, username.trim(), hash, normalizedRole, assignedBranch, status || 'active', finalPermissions]
    );

    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, permissions, created_at FROM managers WHERE id = ?',
      [id]
    );
    const created = {
      ...rows[0],
      permissions: formatPermissions(rows[0].permissions, rows[0].role)
    };
    res.status(201).json(created);
  } catch (err) {
    console.error('Create manager error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update manager
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role, branch_id, status, permissions } = req.body;

  const normalizedRole = role || 'branch_manager';
  const assignedBranch = isAdminRole(normalizedRole) ? null : (branch_id || null);
  const finalPermissions = JSON.stringify(formatPermissions(permissions, normalizedRole));

  try {
    let result;
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      [result] = await pool.query(
        'UPDATE managers SET username = ?, password_hash = ?, role = ?, branch_id = ?, status = ?, permissions = ? WHERE id = ?',
        [username.trim(), hash, normalizedRole, assignedBranch, status, finalPermissions, id]
      );
    } else {
      [result] = await pool.query(
        'UPDATE managers SET username = ?, role = ?, branch_id = ?, status = ?, permissions = ? WHERE id = ?',
        [username.trim(), normalizedRole, assignedBranch, status, finalPermissions, id]
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, permissions FROM managers WHERE id = ?',
      [id]
    );
    const updated = {
      ...rows[0],
      permissions: formatPermissions(rows[0].permissions, rows[0].role)
    };
    res.json(updated);
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
