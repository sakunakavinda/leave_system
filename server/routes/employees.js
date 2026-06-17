import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, secret_code AS "secretCode", role_id, branch_id, status, created_at, updated_at FROM employees ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, secretCode, role_id, branch_id, status } = req.body;
  const rawCode = secretCode || '12345678';
  
  try {
    const result = await pool.query(
      'INSERT INTO employees (name, secret_code, role_id, branch_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, secret_code AS "secretCode", role_id, branch_id, status, created_at',
      [name, rawCode, role_id, branch_id, status || 'active']
    );
    res.status(201).json(result.rows[0]);
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
      result = await pool.query(
        'UPDATE employees SET name = $1, secret_code = $2, role_id = $3, branch_id = $4, status = $5 WHERE id = $6 RETURNING id, name, secret_code AS "secretCode", role_id, branch_id, status',
        [name, secretCode, role_id, branch_id, status, id]
      );
    } else {
      result = await pool.query(
        'UPDATE employees SET name = $1, role_id = $2, branch_id = $3, status = $4 WHERE id = $5 RETURNING id, name, secret_code AS "secretCode", role_id, branch_id, status',
        [name, role_id, branch_id, status, id]
      );
    }
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Cannot delete employee if they have applications.' });
  }
});

export default router;
