import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { title, department_id, description, status } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO roles (title, department_id, description, status) VALUES (?, ?, ?, ?)',
      [title, department_id, description, status || 'active']
    );
    const [roleRows] = await pool.query('SELECT * FROM roles WHERE id = ?', [result.insertId]);
    const newRole = roleRows[0];

    // Auto-generate default leave rules for all existing branches
    const [branchesRows] = await pool.query('SELECT id FROM branches');
    for (const b of branchesRows) {
      await pool.query(
        'INSERT IGNORE INTO leave_rules (role_id, branch_id) VALUES (?, ?)',
        [newRole.id, b.id]
      );
    }

    res.status(201).json(newRole);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, department_id, description, status } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE roles SET title = ?, department_id = ?, description = ?, status = ? WHERE id = ?',
      [title, department_id, description, status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Role not found' });
    
    const [roleRows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    res.json(roleRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [roleRows] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    if (roleRows.length === 0) return res.status(404).json({ error: 'Role not found' });
    
    await pool.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Cannot delete role if it is referenced.' });
  }
});

export default router;
