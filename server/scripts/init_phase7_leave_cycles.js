import pool from '../db.js';

export async function initPhase7Tables() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Checking Phase 7 (Dual-Cycle Annual & Monthly) database schema...');

    // 1. Settings keys
    await connection.query(`
      INSERT IGNORE INTO settings (setting_key, setting_value) 
      VALUES ('leave_cycle_mode', 'annual'), ('monthly_leave_policy', 'strict_monthly')
    `);
    console.log('  ✓ Verified default leave_cycle_mode and monthly_leave_policy in settings');

    // 2. Add month column to leave_balances if missing
    const [cols] = await connection.query('DESCRIBE leave_balances');
    const hasMonth = cols.some(c => c.Field === 'month');
    if (!hasMonth) {
      await connection.query('ALTER TABLE leave_balances ADD COLUMN month INT DEFAULT 0 AFTER year');
      console.log('  ✓ Added month column to leave_balances');
    }

    // 3. Composite unique index
    const [indexes] = await connection.query('SHOW INDEX FROM leave_balances');
    const hasComposite = indexes.some(i => i.Key_name === 'uq_emp_year_month');
    if (!hasComposite) {
      await connection.query('ALTER TABLE leave_balances ADD UNIQUE KEY uq_emp_year_month (employee_id, year, month)');
      console.log('  ✓ Created uq_emp_year_month index');
    }
    const hasOldEmpYear = indexes.some(i => i.Key_name === 'employee_id' && indexes.filter(x => x.Key_name === 'employee_id').length > 1);
    if (hasOldEmpYear) {
      try {
        await connection.query('ALTER TABLE leave_balances DROP INDEX employee_id');
        console.log('  ✓ Cleaned up redundant employee_id index');
      } catch (e) {
        // Ignored if index is in use by FK
      }
    }

    console.log('✅ Phase 7 schema initialization complete!');
  } catch (err) {
    console.error('❌ Phase 7 initialization error:', err);
    throw err;
  } finally {
    connection.release();
  }
}

// Auto-run if executed directly via node
if (process.argv[1]?.endsWith('init_phase7_leave_cycles.js')) {
  initPhase7Tables().then(() => process.exit(0)).catch(() => process.exit(1));
}
