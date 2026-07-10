import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_rules ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

import crypto from 'crypto';

// Create OR Update rule (Upsert)
router.post('/', async (req, res) => {
  const { role_id, branch_id, annualLeave, sickLeave, casualLeave, maxPerDay, status } = req.body;
  const id = crypto.randomUUID();
  try {
    const [result] = await pool.query(
      `INSERT INTO leave_rules (id, role_id, branch_id, annual_leave, sick_leave, casual_leave, max_per_day, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         annual_leave = VALUES(annual_leave),
         sick_leave = VALUES(sick_leave),
         casual_leave = VALUES(casual_leave),
         max_per_day = VALUES(max_per_day),
         status = VALUES(status)`,
      [id, role_id, branch_id, annualLeave || 14, sickLeave || 10, casualLeave || 7, maxPerDay || 1, status || 'active']
    );
    const [rows] = await pool.query('SELECT * FROM leave_rules WHERE role_id = ? AND branch_id = ?', [role_id, branch_id]);
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { annualLeave, sickLeave, casualLeave, maxPerDay, status } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE leave_rules SET annual_leave = ?, sick_leave = ?, casual_leave = ?, max_per_day = ?, status = ? WHERE id = ?',
      [annualLeave, sickLeave, casualLeave, maxPerDay, status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Rule not found' });
    
    const [rows] = await pool.query('SELECT * FROM leave_rules WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
