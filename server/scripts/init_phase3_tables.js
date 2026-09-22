import pool from '../db.js';
import crypto from 'crypto';

async function initPhase3Tables() {
  try {
    console.log('--- Initializing Phase 3: Shift Master & Rostering Engine ---');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shift_masters (
        id VARCHAR(64) PRIMARY KEY,
        branch_id VARCHAR(64) NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        crosses_midnight BOOLEAN DEFAULT false,
        duration_hours DECIMAL(4,2) DEFAULT 8.00,
        color_code VARCHAR(30) DEFAULT '#3b82f6',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sm_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ shift_masters table verified / created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_rosters (
        id VARCHAR(64) PRIMARY KEY,
        employee_id VARCHAR(64) NOT NULL,
        roster_date DATE NOT NULL,
        shift_id VARCHAR(64) NULL,
        is_rdo BOOLEAN DEFAULT false,
        notes VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_emp_roster_date (employee_id, roster_date),
        INDEX idx_er_date (roster_date),
        INDEX idx_er_shift (shift_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ employee_rosters table verified / created');

    // Seed default common shifts if empty
    const [existingShifts] = await pool.query('SELECT COUNT(*) as cnt FROM shift_masters');
    if (existingShifts[0].cnt === 0) {
      const defaults = [
        {
          id: crypto.randomUUID(),
          branch_id: null,
          code: 'GEN',
          name: 'General Day Shift (08:30 - 17:00)',
          start_time: '08:30:00',
          end_time: '17:00:00',
          crosses_midnight: false,
          duration_hours: 8.50,
          color_code: '#3b82f6'
        },
        {
          id: crypto.randomUUID(),
          branch_id: null,
          code: 'MRN',
          name: 'Morning Shift (06:00 - 14:00)',
          start_time: '06:00:00',
          end_time: '14:00:00',
          crosses_midnight: false,
          duration_hours: 8.00,
          color_code: '#10b981'
        },
        {
          id: crypto.randomUUID(),
          branch_id: null,
          code: 'EVN',
          name: 'Evening Shift (14:00 - 22:00)',
          start_time: '14:00:00',
          end_time: '22:00:00',
          crosses_midnight: false,
          duration_hours: 8.00,
          color_code: '#f59e0b'
        },
        {
          id: crypto.randomUUID(),
          branch_id: null,
          code: 'NGT',
          name: 'Night Shift (22:00 - 06:00)',
          start_time: '22:00:00',
          end_time: '06:00:00',
          crosses_midnight: true,
          duration_hours: 8.00,
          color_code: '#8b5cf6'
        }
      ];

      for (const s of defaults) {
        await pool.query(
          `INSERT INTO shift_masters (id, branch_id, code, name, start_time, end_time, crosses_midnight, duration_hours, color_code, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [s.id, s.branch_id, s.code, s.name, s.start_time, s.end_time, s.crosses_midnight, s.duration_hours, s.color_code]
        );
      }
      console.log('✓ Seeded default shift types: GEN, MRN, EVN, NGT');
    }

    console.log('Phase 3 DB Initialization complete!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to init Phase 3 tables:', err);
    process.exit(1);
  }
}

initPhase3Tables();
