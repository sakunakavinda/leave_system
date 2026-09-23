import pool from '../db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function emptyAllData() {
  console.log('🔄 Starting full database purge...');

  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'leave_application_dates',
      'leave_applications',
      'leave_balance_ledger',
      'leave_balances',
      'employee_rosters',
      'operational_contingencies',
      'branch_holidays',
      'branch_schedules',
      'shift_masters',
      'leave_rules',
      'employees',
      'roles',
      'departments',
      'leave_profiles',
      'leave_types',
      'leave_groups',
      'branches',
      'managers',
      'settings'
    ];

    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE ${table}`);
      console.log(`  ✓ Truncated table: ${table}`);
    }

    // 1. Seed root super-manager account so administrator can log in
    const adminId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash('password', 10);
    await connection.query(
      `INSERT INTO managers (id, username, password_hash, role, branch_id, status)
       VALUES (?, ?, ?, 'super manager', NULL, 'active')`,
      [adminId, 'admin', passwordHash]
    );
    console.log('  ✓ Root super manager created: admin / password');

    // 2. Seed basic system settings
    const defaultSettings = [
      ['company_name', 'Workforce Leave Desk'],
      ['theme_color', 'blue'],
      ['theme_color_secondary', 'indigo'],
      ['company_logo', '']
    ];

    for (const [k, v] of defaultSettings) {
      await connection.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)`,
        [k, v]
      );
    }
    console.log('  ✓ Default system settings initialized');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ All database tables emptied successfully! Clean slate ready.');
  } catch (err) {
    console.error('❌ Error emptying database tables:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

emptyAllData();
