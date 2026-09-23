import express from 'express';
import pool from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Helper to sanitize code string (e.g. "Special Leave!" -> "special_leave")
const formatCode = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

// Initialize table and ensure is_paid column exists and seeds are in place
export async function initLeaveTypesTable() {
  try {
    // 1. Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(20) DEFAULT '#7c3aed',
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        is_paid TINYINT(1) NOT NULL DEFAULT 1,
        notice_days_required INT DEFAULT 0,
        max_consecutive_days INT DEFAULT 0,
        doc_required_after_days INT DEFAULT 0,
        carry_forward_max_days INT DEFAULT 0,
        min_service_days_required INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Ensure is_paid column exists if table existed previously
    try {
      await pool.query('ALTER TABLE leave_types ADD COLUMN is_paid TINYINT(1) NOT NULL DEFAULT 1 AFTER status');
      console.log('✓ Added is_paid column to leave_types table');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        // Ignored if already exists
      }
    }

    // 3. Check if empty and seed initial standard leave types
    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM leave_types');
    if (rows[0].cnt === 0) {
      const defaultTypes = [
        {
          id: crypto.randomUUID(),
          name: 'Annual Leave',
          code: 'annual',
          color: '#7c3aed',
          description: 'Standard paid annual vacation leave',
          status: 'active',
          is_paid: 1,
          notice_days_required: 3,
          max_consecutive_days: 14,
          doc_required_after_days: 0,
          carry_forward_max_days: 5,
          min_service_days_required: 0
        },
        {
          id: crypto.randomUUID(),
          name: 'Casual Leave',
          code: 'casual',
          color: '#06b6d4',
          description: 'Short-term urgent personal/casual leave',
          status: 'active',
          is_paid: 1,
          notice_days_required: 1,
          max_consecutive_days: 2,
          doc_required_after_days: 0,
          carry_forward_max_days: 0,
          min_service_days_required: 0
        },
        {
          id: crypto.randomUUID(),
          name: 'Sick Leave',
          code: 'sick',
          color: '#ef4444',
          description: 'Medical and health recuperation leave',
          status: 'active',
          is_paid: 1,
          notice_days_required: 0,
          max_consecutive_days: 7,
          doc_required_after_days: 2,
          carry_forward_max_days: 0,
          min_service_days_required: 0
        },
        {
          id: crypto.randomUUID(),
          name: 'Loss of Pay (Unpaid Leave)',
          code: 'unpaid',
          color: '#f97316',
          description: 'Unpaid absence resulting in salary loss of pay (LOP) deduction',
          status: 'active',
          is_paid: 0,
          notice_days_required: 0,
          max_consecutive_days: 0,
          doc_required_after_days: 0,
          carry_forward_max_days: 0,
          min_service_days_required: 0
        }
      ];

      for (const t of defaultTypes) {
        await pool.query(
          `INSERT INTO leave_types 
           (id, name, code, color, description, status, is_paid, notice_days_required, max_consecutive_days, doc_required_after_days, carry_forward_max_days, min_service_days_required)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id, t.name, t.code, t.color, t.description, t.status, t.is_paid,
            t.notice_days_required, t.max_consecutive_days, t.doc_required_after_days,
            t.carry_forward_max_days, t.min_service_days_required
          ]
        );
      }
      console.log('✓ Seeded standard default leave types (Annual, Casual, Sick, Unpaid/LOP)');
    } else {
      // Ensure unpaid / LOP codes are set to is_paid = 0 if they exist
      await pool.query(`
        UPDATE leave_types 
        SET is_paid = 0 
        WHERE code IN ('unpaid', 'lop') 
           OR LOWER(name) LIKE '%unpaid%' 
           OR LOWER(name) LIKE '%loss of pay%'
      `);
    }
  } catch (err) {
    console.error('Failed to initialize leave_types table:', err);
  }
}

// GET all leave types
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_types ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave types' });
  }
});

// POST create a new leave type
router.post('/', async (req, res) => {
  const { 
    name, 
    code: customCode, 
    color, 
    description, 
    status,
    is_paid,
    notice_days_required = 0,
    max_consecutive_days = 0,
    doc_required_after_days = 0,
    carry_forward_max_days = 0,
    min_service_days_required = 0
  } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Leave type name is required' });
  }

  const code = customCode ? formatCode(customCode) : formatCode(name);
  if (!code) {
    return res.status(400).json({ error: 'Invalid leave type code' });
  }

  const leaveColor = color || '#7c3aed';
  const id = crypto.randomUUID();
  const isPaidVal = (is_paid === false || is_paid === 0 || is_paid === '0' || is_paid === 'false') ? 0 : 1;

  try {
    // Check duplicate code or name
    const [existing] = await pool.query(
      'SELECT id FROM leave_types WHERE code = ? OR name = ?',
      [code, name]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A leave type with this name or code already exists.' });
    }

    // Insert leave type with customizable policy parameters & is_paid
    await pool.query(
      `INSERT INTO leave_types 
       (id, name, code, color, description, status, is_paid, notice_days_required, max_consecutive_days, doc_required_after_days, carry_forward_max_days, min_service_days_required) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        name.trim(), 
        code, 
        leaveColor, 
        description || '', 
        status || 'active',
        isPaidVal,
        parseInt(notice_days_required) || 0,
        parseInt(max_consecutive_days) || 0,
        parseInt(doc_required_after_days) || 0,
        parseInt(carry_forward_max_days) || 0,
        parseInt(min_service_days_required) || 0
      ]
    );

    // Keep backward-compatible columns in legacy tables if needed
    try {
      await pool.query(`ALTER TABLE leave_rules ADD COLUMN ${code}_leave INT DEFAULT 0`);
    } catch (e) {}
    try {
      await pool.query(`ALTER TABLE leave_balances ADD COLUMN ${code}_taken INT DEFAULT 0`);
    } catch (e) {}

    const [created] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create leave type', details: err.message });
  }
});

// PUT update leave type
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    color, 
    description, 
    status,
    is_paid,
    notice_days_required,
    max_consecutive_days,
    doc_required_after_days,
    carry_forward_max_days,
    min_service_days_required
  } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    const current = existing[0];
    const updatedName = name ? name.trim() : current.name;
    const updatedColor = color || current.color;
    const updatedDesc = description !== undefined ? description : current.description;
    const updatedStatus = status || current.status;
    const updatedIsPaid = is_paid !== undefined 
      ? ((is_paid === false || is_paid === 0 || is_paid === '0' || is_paid === 'false') ? 0 : 1)
      : current.is_paid;
    const updatedNotice = notice_days_required !== undefined ? parseInt(notice_days_required) : current.notice_days_required;
    const updatedMaxConsec = max_consecutive_days !== undefined ? parseInt(max_consecutive_days) : current.max_consecutive_days;
    const updatedDocDays = doc_required_after_days !== undefined ? parseInt(doc_required_after_days) : current.doc_required_after_days;
    const updatedCarryFwd = carry_forward_max_days !== undefined ? parseInt(carry_forward_max_days) : current.carry_forward_max_days;
    const updatedMinService = min_service_days_required !== undefined ? parseInt(min_service_days_required) : current.min_service_days_required;

    await pool.query(
      `UPDATE leave_types 
       SET name = ?, color = ?, description = ?, status = ?, is_paid = ?,
           notice_days_required = ?, max_consecutive_days = ?, doc_required_after_days = ?,
           carry_forward_max_days = ?, min_service_days_required = ?
       WHERE id = ?`,
      [
        updatedName, 
        updatedColor, 
        updatedDesc, 
        updatedStatus,
        updatedIsPaid,
        updatedNotice,
        updatedMaxConsec,
        updatedDocDays,
        updatedCarryFwd,
        updatedMinService,
        id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update leave type', details: err.message });
  }
});

// DELETE leave type
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT * FROM leave_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave type not found' });
    }

    const lt = existing[0];
    // Don't delete built-in core types if needed, or allow soft-delete / status change
    await pool.query('DELETE FROM leave_types WHERE id = ?', [id]);
    res.json({ success: true, message: `Leave type '${lt.name}' deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete leave type', details: err.message });
  }
});

export default router;
