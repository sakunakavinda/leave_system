import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = express.Router();

// GET all branches with schedule metadata
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, 
             bs.operating_model, 
             bs.working_days, 
             bs.weekly_hours
      FROM branches b
      LEFT JOIN branch_schedules bs ON b.id = bs.branch_id
      ORDER BY b.created_at ASC
    `);

    const formatted = rows.map(r => {
      let workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      if (r.working_days) {
        try {
          workingDays = typeof r.working_days === 'string' ? JSON.parse(r.working_days) : r.working_days;
        } catch (e) {}
      }
      return {
        ...r,
        operating_model: r.operating_model || 'corporate_5day',
        working_days: workingDays,
        weekly_hours: r.weekly_hours ? parseFloat(r.weekly_hours) : 40.00
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Fetch branches error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new branch
router.post('/', async (req, res) => {
  const { name, location, status, manager_id, operating_model, working_days, weekly_hours } = req.body;
  const branchId = crypto.randomUUID();
  const scheduleId = crypto.randomUUID();

  try {
    await pool.query(
      'INSERT INTO branches (id, name, location, status) VALUES (?, ?, ?, ?)',
      [branchId, name.trim(), location || '', status || 'active']
    );

    // Save initial schedule
    const workingDaysJson = JSON.stringify(working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    await pool.query(`
      INSERT INTO branch_schedules (id, branch_id, operating_model, working_days, weekly_hours)
      VALUES (?, ?, ?, ?, ?)
    `, [scheduleId, branchId, operating_model || 'corporate_5day', workingDaysJson, weekly_hours || 40.00]);

    if (manager_id) {
      await pool.query('UPDATE managers SET branch_id = ? WHERE id = ?', [branchId, manager_id]);
    }
    
    // Auto-generate default leave rules for all existing roles
    const [rolesRows] = await pool.query('SELECT id FROM roles');
    for (const r of rolesRows) {
      await pool.query(
        'INSERT IGNORE INTO leave_rules (role_id, branch_id) VALUES (?, ?)',
        [r.id, branchId]
      );
    }

    const [branchRows] = await pool.query(`
      SELECT b.*, bs.operating_model, bs.working_days, bs.weekly_hours
      FROM branches b
      LEFT JOIN branch_schedules bs ON b.id = bs.branch_id
      WHERE b.id = ?
    `, [branchId]);

    const created = branchRows[0];
    let parsedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    try {
      if (created.working_days) parsedDays = JSON.parse(created.working_days);
    } catch (e) {}

    res.status(201).json({
      ...created,
      working_days: parsedDays
    });
  } catch (err) {
    console.error('Create branch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update a branch
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, status, manager_id, operating_model, working_days, weekly_hours } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE branches SET name = ?, location = ?, status = ? WHERE id = ?',
      [name.trim(), location || '', status, id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Branch not found' });

    // Update schedule if provided
    if (operating_model || working_days || weekly_hours) {
      const scheduleId = crypto.randomUUID();
      const workingDaysJson = JSON.stringify(working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      await pool.query(`
        INSERT INTO branch_schedules (id, branch_id, operating_model, working_days, weekly_hours)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          operating_model = VALUES(operating_model),
          working_days = VALUES(working_days),
          weekly_hours = VALUES(weekly_hours)
      `, [scheduleId, id, operating_model || 'corporate_5day', workingDaysJson, weekly_hours || 40.00]);
    }
    
    // Unlink old managers for this branch
    await pool.query('UPDATE managers SET branch_id = NULL WHERE branch_id = ?', [id]);
    
    // Link new manager
    if (manager_id) {
      await pool.query('UPDATE managers SET branch_id = ? WHERE id = ?', [id, manager_id]);
    }
    
    const [branchRows] = await pool.query(`
      SELECT b.*, bs.operating_model, bs.working_days, bs.weekly_hours
      FROM branches b
      LEFT JOIN branch_schedules bs ON b.id = bs.branch_id
      WHERE b.id = ?
    `, [id]);

    const updated = branchRows[0];
    let parsedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    try {
      if (updated.working_days) parsedDays = JSON.parse(updated.working_days);
    } catch (e) {}

    res.json({
      ...updated,
      working_days: parsedDays
    });
  } catch (err) {
    console.error('Update branch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a branch
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [branchRows] = await pool.query('SELECT * FROM branches WHERE id = ?', [id]);
    if (branchRows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    
    await pool.query('DELETE FROM branch_schedules WHERE branch_id = ?', [id]);
    await pool.query('DELETE FROM branch_holidays WHERE branch_id = ?', [id]);
    await pool.query('DELETE FROM branches WHERE id = ?', [id]);
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    console.error('Delete branch error:', err);
    res.status(500).json({ error: 'Server error. Cannot delete branch if it is referenced.' });
  }
});

export default router;
