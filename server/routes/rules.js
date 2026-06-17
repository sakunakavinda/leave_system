import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leave_rules ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create OR Update rule (Upsert)
router.post('/', async (req, res) => {
  const { role_id, branch_id, annualLeave, sickLeave, casualLeave, maxPerDay, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO leave_rules (role_id, branch_id, annual_leave, sick_leave, casual_leave, max_per_day, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (role_id, branch_id) 
       DO UPDATE SET 
         annual_leave = EXCLUDED.annual_leave,
         sick_leave = EXCLUDED.sick_leave,
         casual_leave = EXCLUDED.casual_leave,
         max_per_day = EXCLUDED.max_per_day,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [role_id, branch_id, annualLeave || 14, sickLeave || 10, casualLeave || 7, maxPerDay || 1, status || 'active']
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { annualLeave, sickLeave, casualLeave, maxPerDay, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE leave_rules SET annual_leave = $1, sick_leave = $2, casual_leave = $3, max_per_day = $4, status = $5 WHERE id = $6 RETURNING *',
      [annualLeave, sickLeave, casualLeave, maxPerDay, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
