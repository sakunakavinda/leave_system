import pool from '../db.js';

async function initPhase4Tables() {
  try {
    console.log('--- Initializing Phase 4: Policy Customizer & Dynamic Entitlement Engine ---');

    // 1. Add customizable policy threshold columns to leave_types
    const policyColumns = [
      { name: 'notice_days_required', type: 'INT DEFAULT 0' },
      { name: 'max_consecutive_days', type: 'INT DEFAULT 0' },
      { name: 'doc_required_after_days', type: 'INT DEFAULT 0' },
      { name: 'carry_forward_max_days', type: 'INT DEFAULT 0' },
      { name: 'min_service_days_required', type: 'INT DEFAULT 0' }
    ];

    for (const col of policyColumns) {
      try {
        await pool.query(`ALTER TABLE leave_types ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✓ Added column ${col.name} to leave_types`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`✓ Column ${col.name} already exists in leave_types`);
        } else {
          console.error(`Error adding column ${col.name}:`, e.message);
        }
      }
    }

    // 2. Set realistic customizable defaults for standard leave types
    await pool.query(`
      UPDATE leave_types SET
        notice_days_required = CASE 
          WHEN code = 'annual' THEN 3
          WHEN code = 'casual' THEN 1
          WHEN code = 'sick' THEN 0
          ELSE 0 
        END,
        max_consecutive_days = CASE
          WHEN code = 'casual' THEN 2
          WHEN code = 'sick' THEN 7
          WHEN code = 'annual' THEN 14
          ELSE 0
        END,
        doc_required_after_days = CASE
          WHEN code = 'sick' THEN 2
          ELSE 0
        END,
        carry_forward_max_days = CASE
          WHEN code = 'annual' THEN 5
          ELSE 0
        END
      WHERE code IN ('annual', 'casual', 'sick')
    `);
    console.log('✓ Updated policy thresholds for standard leave types (Annual: 3 days notice, Casual: 2 max consecutive, Sick: doc after 2 days)');

    // 3. Add leave_profile_id to employees if not exists
    try {
      await pool.query('ALTER TABLE employees ADD COLUMN leave_profile_id VARCHAR(64) NULL');
      console.log('✓ Added leave_profile_id to employees');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ leave_profile_id already exists in employees');
      } else {
        console.error('Error adding leave_profile_id:', e.message);
      }
    }

    // 4. Create leave_balance_ledger table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balance_ledger (
        id VARCHAR(64) PRIMARY KEY,
        employee_id VARCHAR(64) NOT NULL,
        leave_type_code VARCHAR(50) NOT NULL,
        year INT NOT NULL,
        transaction_type ENUM('ALLOCATION', 'MONTHLY_ACCRUAL', 'LEAVE_RESERVED', 'LEAVE_DEDUCTED', 'LEAVE_REFUNDED', 'EXPIRED_ROLLOVER', 'MANUAL_ADJUSTMENT') NOT NULL,
        units DECIMAL(5,2) NOT NULL,
        reference_application_id VARCHAR(64) NULL,
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_lbl_emp_yr (employee_id, year),
        INDEX idx_lbl_type (leave_type_code),
        INDEX idx_lbl_ref (reference_application_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Created/verified leave_balance_ledger table');

    // 5. Populate initial ledger records from existing leave_rules / leave_balances
    const [existingLedger] = await pool.query('SELECT COUNT(*) as cnt FROM leave_balance_ledger');
    if (existingLedger[0].cnt === 0) {
      const currentYear = new Date().getFullYear();
      const [employees] = await pool.query('SELECT id, branch_id, role_id FROM employees WHERE status = "active"');
      const [rules] = await pool.query('SELECT * FROM leave_rules');
      const [leaveTypes] = await pool.query('SELECT code FROM leave_types');

      let insertedCount = 0;
      for (const emp of employees) {
        const rule = rules.find(r => r.branch_id === emp.branch_id && r.role_id === emp.role_id) || rules[0];
        if (!rule) continue;

        for (const lt of leaveTypes) {
          const colName = `${lt.code}_leave`;
          const quota = rule[colName] !== undefined && rule[colName] !== null ? Number(rule[colName]) : 14;
          if (quota > 0) {
            const id = (await import('crypto')).randomUUID();
            await pool.query(
              `INSERT INTO leave_balance_ledger (id, employee_id, leave_type_code, year, transaction_type, units, notes)
               VALUES (?, ?, ?, ?, 'ALLOCATION', ?, 'Initial Annual Quota Allocation')`,
              [id, emp.id, lt.code, currentYear, quota]
            );
            insertedCount++;
          }
        }
      }
      console.log(`✓ Seeded ${insertedCount} initial quota allocation ledger entries for year ${currentYear}`);
    }

    console.log('Phase 4 DB Initialization complete!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to init Phase 4 tables:', err);
    process.exit(1);
  }
}

initPhase4Tables();
