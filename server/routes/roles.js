import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { title, department_id, description, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO roles (title, department_id, description, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, department_id, description, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, department_id, description, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE roles SET title = $1, department_id = $2, description = $3, status = $4 WHERE id = $5 RETURNING *',
      [title, department_id, description, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Role not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Role not found' });
    res.json({ message: 'Role deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Cannot delete role if it is referenced.' });
  }
});

export default router;
