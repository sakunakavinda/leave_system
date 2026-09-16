import express from 'express';
import pool from '../db.js';
import crypto from 'crypto';

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

// Create OR Update rule (Upsert)
router.post('/', async (req, res) => {
  const { role_id, branch_id, maxPerDay, status, leaveAllocations } = req.body;
  const id = crypto.randomUUID();
  try {
    let leaveKeys = [];
    let leaveCols = '';
    let leavePlaceholders = '';
    let duplicateUpdates = '';
    let values = [id, role_id, branch_id, maxPerDay || 1, status || 'active'];

    if (leaveAllocations && typeof leaveAllocations === 'object') {
      // Validate keys to prevent SQL injection (must be valid code format: alphanumeric + underscore)
      leaveKeys = Object.keys(leaveAllocations).filter(k => /^[a-z0-9_]+$/.test(k));
      if (leaveKeys.length > 0) {
        leaveCols = ', ' + leaveKeys.map(k => `${k}_leave`).join(', ');
        leavePlaceholders = ', ' + leaveKeys.map(() => '?').join(', ');
        values.push(...leaveKeys.map(k => parseInt(leaveAllocations[k]) || 0));
        duplicateUpdates = leaveKeys.map(k => `${k}_leave = VALUES(${k}_leave)`).join(', ') + ', ';
      }
    }

    const query = `
      INSERT INTO leave_rules (id, role_id, branch_id, max_per_day, status${leaveCols}) 
      VALUES (?, ?, ?, ?, ?${leavePlaceholders})
      ON DUPLICATE KEY UPDATE 
        ${duplicateUpdates}
        max_per_day = VALUES(max_per_day),
        status = VALUES(status)
    `;

    await pool.query(query, values);
    const [rows] = await pool.query('SELECT * FROM leave_rules WHERE role_id = ? AND branch_id = ?', [role_id, branch_id]);
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { maxPerDay, status, leaveAllocations } = req.body;
  try {
    let updateClauses = ['max_per_day = ?', 'status = ?'];
    let values = [maxPerDay || 1, status || 'active'];

    if (leaveAllocations && typeof leaveAllocations === 'object') {
      const leaveKeys = Object.keys(leaveAllocations).filter(k => /^[a-z0-9_]+$/.test(k));
      for (const k of leaveKeys) {
        updateClauses.push(`${k}_leave = ?`);
        values.push(parseInt(leaveAllocations[k]) || 0);
      }
    }
    values.push(id);

    const query = `UPDATE leave_rules SET ${updateClauses.join(', ')} WHERE id = ?`;
    const [result] = await pool.query(query, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Rule not found' });
    
    const [rows] = await pool.query('SELECT * FROM leave_rules WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
