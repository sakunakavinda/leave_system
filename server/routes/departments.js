import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, description, status } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO departments (name, description, status) VALUES (?, ?, ?)',
      [name, description, status || 'active']
    );
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE departments SET name = ?, description = ?, status = ? WHERE id = ?',
      [name, description, status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
    
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Department not found' });
    
    await pool.query('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Cannot delete department if it is referenced.' });
  }
});

export default router;
