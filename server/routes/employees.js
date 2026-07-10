import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, secret_code AS "secretCode", role_id, branch_id, status, created_at, updated_at FROM employees ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, secretCode, role_id, branch_id, status } = req.body;
  const rawCode = secretCode || '12345678';
  
  try {
    const [result] = await pool.query(
      'INSERT INTO employees (name, secret_code, role_id, branch_id, status) VALUES (?, ?, ?, ?, ?)',
      [name, rawCode, role_id, branch_id, status || 'active']
    );
    const [rows] = await pool.query(
      'SELECT id, name, secret_code AS "secretCode", role_id, branch_id, status, created_at FROM employees WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, secretCode, role_id, branch_id, status } = req.body;
  
  try {
    let result;
    if (secretCode && secretCode.trim() !== '') {
      [result] = await pool.query(
        'UPDATE employees SET name = ?, secret_code = ?, role_id = ?, branch_id = ?, status = ? WHERE id = ?',
        [name, secretCode, role_id, branch_id, status, id]
      );
    } else {
      [result] = await pool.query(
        'UPDATE employees SET name = ?, role_id = ?, branch_id = ?, status = ? WHERE id = ?',
        [name, role_id, branch_id, status, id]
      );
    }
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });
    
    const [rows] = await pool.query(
      'SELECT id, name, secret_code AS "secretCode", role_id, branch_id, status FROM employees WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    
    await pool.query('DELETE FROM employees WHERE id = ?', [id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Cannot delete employee if they have applications.' });
  }
});

export default router;
