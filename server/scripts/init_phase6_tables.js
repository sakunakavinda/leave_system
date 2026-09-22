import pool from '../db.js';

async function initPhase6Tables() {
  try {
    console.log('--- Initializing Phase 6: Operational Contingency & Disruption Shield ---');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS operational_contingencies (
        id VARCHAR(64) PRIMARY KEY,
        branch_id VARCHAR(64) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        event_type ENUM('STRIKE', 'DISASTER', 'FLOOD', 'INFRASTRUCTURE_FAILURE', 'CURFEW', 'CUSTOM') NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        exempt_leave_deductions BOOLEAN DEFAULT true,
        status ENUM('ACTIVE', 'RESOLVED') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_oc_branch (branch_id),
        INDEX idx_oc_dates (start_date, end_date),
        INDEX idx_oc_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ operational_contingencies table created / verified');

    console.log('Phase 6 DB Initialization complete!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to init Phase 6 tables:', err);
    process.exit(1);
  }
}

initPhase6Tables();
