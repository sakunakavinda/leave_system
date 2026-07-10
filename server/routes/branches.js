import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all branches
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM branches ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new branch
router.post('/', async (req, res) => {
  const { name, location, status, manager_id } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO branches (name, location, status) VALUES (?, ?, ?)',
      [name, location, status || 'active']
    );
    const branchId = result.insertId;
    
    const [branchRows] = await pool.query('SELECT * FROM branches WHERE id = ?', [branchId]);
    const branch = branchRows[0];
    
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

    res.status(201).json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update a branch
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, location, status, manager_id } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE branches SET name = ?, location = ?, status = ? WHERE id = ?',
      [name, location, status, id]
    );
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Branch not found' });
    
    // Unlink old managers for this branch
    await pool.query('UPDATE managers SET branch_id = NULL WHERE branch_id = ?', [id]);
    
    // Link new manager
    if (manager_id) {
      await pool.query('UPDATE managers SET branch_id = ? WHERE id = ?', [id, manager_id]);
    }
    
    const [branchRows] = await pool.query('SELECT * FROM branches WHERE id = ?', [id]);
    res.json(branchRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a branch
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [branchRows] = await pool.query('SELECT * FROM branches WHERE id = ?', [id]);
    if (branchRows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    
    await pool.query('DELETE FROM branches WHERE id = ?', [id]);
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Cannot delete branch if it is referenced.' });
  }
});

export default router;
