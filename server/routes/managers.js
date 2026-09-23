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

export async function getLiveRoleDefaultPermissions() {
  try {
    const [rows] = await pool.query('SELECT role, permissions FROM role_default_permissions');
    const map = {
      branch_manager: { ...DEFAULT_BRANCH_MANAGER_PERMISSIONS },
      hr_officer: { ...DEFAULT_HR_OFFICER_PERMISSIONS },
      admin: { ...DEFAULT_ADMIN_PERMISSIONS }
    };

    rows.forEach(r => {
      let p = r.permissions;
      if (typeof p === 'string') {
        try { p = JSON.parse(p); } catch (e) {}
      }
      if (p && typeof p === 'object') {
        const normRole = r.role === 'super manager' || r.role === 'super_admin' ? 'admin' : (r.role === 'hr' ? 'hr_officer' : r.role);
        map[normRole] = { ...map[normRole], ...p };
      }
    });

    return map;
  } catch (err) {
    return {
      branch_manager: { ...DEFAULT_BRANCH_MANAGER_PERMISSIONS },
      hr_officer: { ...DEFAULT_HR_OFFICER_PERMISSIONS },
      admin: { ...DEFAULT_ADMIN_PERMISSIONS }
    };
  }
}

export function formatPermissions(perms, role, liveDefaults = null) {
  const normRole = (role === 'super manager' || role === 'super_admin' || role === 'admin')
    ? 'admin'
    : (role === 'hr_officer' || role === 'hr' ? 'hr_officer' : 'branch_manager');

  if (!perms) {
    if (liveDefaults && liveDefaults[normRole]) {
      return liveDefaults[normRole];
    }
    return getDefaultPermissionsForRole(role);
  }
  if (typeof perms === 'string') {
    try {
      return JSON.parse(perms);
    } catch (e) {
      if (liveDefaults && liveDefaults[normRole]) {
        return liveDefaults[normRole];
      }
      return getDefaultPermissionsForRole(role);
    }
  }
  return perms;
}

/**
 * Initialize managers and role_default_permissions tables
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

  await initRolePermissionsTable();
}

export async function initRolePermissionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_default_permissions (
        role VARCHAR(50) PRIMARY KEY,
        permissions JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(100) NULL
      )
    `);

    // Seed defaults if empty
    const [rows] = await pool.query('SELECT role FROM role_default_permissions');
    const existing = new Set(rows.map(r => r.role));

    if (!existing.has('branch_manager')) {
      await pool.query(
        'INSERT INTO role_default_permissions (role, permissions, updated_by) VALUES (?, ?, ?)',
        ['branch_manager', JSON.stringify(DEFAULT_BRANCH_MANAGER_PERMISSIONS), 'system']
      );
    }
    if (!existing.has('hr_officer')) {
      await pool.query(
        'INSERT INTO role_default_permissions (role, permissions, updated_by) VALUES (?, ?, ?)',
        ['hr_officer', JSON.stringify(DEFAULT_HR_OFFICER_PERMISSIONS), 'system']
      );
    }
    if (!existing.has('admin')) {
      await pool.query(
        'INSERT INTO role_default_permissions (role, permissions, updated_by) VALUES (?, ?, ?)',
        ['admin', JSON.stringify(DEFAULT_ADMIN_PERMISSIONS), 'system']
      );
    }
    console.log('  ✓ Initialized role_default_permissions table and default roles');
  } catch (err) {
    console.warn('initRolePermissionsTable notice:', err.message);
  }
}

// GET role default permissions matrix
router.get('/role-permissions', async (req, res) => {
  try {
    const liveDefaults = await getLiveRoleDefaultPermissions();
    res.json(liveDefaults);
  } catch (err) {
    console.error('Fetch role permissions error:', err);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// PUT update role default permissions matrix
router.put('/role-permissions', async (req, res) => {
  const { role, permissions, matrix } = req.body;
  try {
    if (matrix && typeof matrix === 'object') {
      for (const [rKey, rPerms] of Object.entries(matrix)) {
        await pool.query(
          `INSERT INTO role_default_permissions (role, permissions, updated_by) 
           VALUES (?, ?, 'admin') 
           ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), updated_by = VALUES(updated_by)`,
          [rKey, JSON.stringify(rPerms)]
        );
      }
    } else if (role && permissions) {
      await pool.query(
        `INSERT INTO role_default_permissions (role, permissions, updated_by) 
         VALUES (?, ?, 'admin') 
         ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), updated_by = VALUES(updated_by)`,
        [role, JSON.stringify(permissions)]
      );
    } else {
      return res.status(400).json({ error: 'Invalid payload. Provide role and permissions or matrix object.' });
    }

    const updated = await getLiveRoleDefaultPermissions();
    res.json({ success: true, matrix: updated });
  } catch (err) {
    console.error('Update role permissions error:', err);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

// POST reset role permissions to static defaults
router.post('/role-permissions/reset', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO role_default_permissions (role, permissions, updated_by) VALUES 
       ('branch_manager', ?, 'system'),
       ('hr_officer', ?, 'system'),
       ('admin', ?, 'system')
       ON DUPLICATE KEY UPDATE permissions = VALUES(permissions), updated_by = VALUES(updated_by)`,
      [
        JSON.stringify(DEFAULT_BRANCH_MANAGER_PERMISSIONS),
        JSON.stringify(DEFAULT_HR_OFFICER_PERMISSIONS),
        JSON.stringify(DEFAULT_ADMIN_PERMISSIONS)
      ]
    );

    const resetMatrix = await getLiveRoleDefaultPermissions();
    res.json({ success: true, message: 'Role permissions reset to factory defaults', matrix: resetMatrix });
  } catch (err) {
    console.error('Reset role permissions error:', err);
    res.status(500).json({ error: 'Failed to reset role permissions' });
  }
});

// GET all managers
router.get('/', async (req, res) => {
  try {
    const liveDefaults = await getLiveRoleDefaultPermissions();
    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, permissions, created_at FROM managers ORDER BY created_at ASC'
    );
    const managers = rows.map(m => {
      const hasCustom = !!m.permissions;
      return {
        ...m,
        has_custom_permissions: hasCustom,
        permissions: formatPermissions(m.permissions, m.role, liveDefaults)
      };
    });
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

    const liveDefaults = await getLiveRoleDefaultPermissions();
    const userPermissions = formatPermissions(manager.permissions, manager.role, liveDefaults);

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
      has_custom_permissions: !!manager.permissions,
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
  const { username, password, role, branch_id, status, permissions, is_custom_override } = req.body;
  const id = crypto.randomUUID();

  const normalizedRole = role || 'branch_manager';
  const assignedBranch = isAdminRole(normalizedRole) ? null : (branch_id || null);
  
  // If not explicitly marked as custom override or permissions is empty, leave as NULL to inherit role defaults
  const finalPermissions = (is_custom_override && permissions)
    ? JSON.stringify(permissions)
    : null;

  try {
    const hash = await bcrypt.hash(password || 'password', 10);
    await pool.query(
      'INSERT INTO managers (id, username, password_hash, role, branch_id, status, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, username.trim(), hash, normalizedRole, assignedBranch, status || 'active', finalPermissions]
    );

    const liveDefaults = await getLiveRoleDefaultPermissions();
    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, permissions, created_at FROM managers WHERE id = ?',
      [id]
    );
    const created = {
      ...rows[0],
      has_custom_permissions: !!rows[0].permissions,
      permissions: formatPermissions(rows[0].permissions, rows[0].role, liveDefaults)
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
  const { username, password, role, branch_id, status, permissions, is_custom_override, reset_to_default } = req.body;

  const normalizedRole = role || 'branch_manager';
  const assignedBranch = isAdminRole(normalizedRole) ? null : (branch_id || null);

  let finalPermissions = null;
  if (!reset_to_default && (is_custom_override || (permissions && is_custom_override !== false))) {
    finalPermissions = JSON.stringify(permissions);
  }

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

    const liveDefaults = await getLiveRoleDefaultPermissions();
    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, permissions FROM managers WHERE id = ?',
      [id]
    );
    const updated = {
      ...rows[0],
      has_custom_permissions: !!rows[0].permissions,
      permissions: formatPermissions(rows[0].permissions, rows[0].role, liveDefaults)
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
