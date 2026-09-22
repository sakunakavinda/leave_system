import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import { optionalAuth, getBranchScope } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/employees
 * Supports branch scoping and credential protection
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const branchScope = getBranchScope(req) || req.query.branch_id;
    const includeSecret = req.query.includeSecretCode === 'true' && req.user && 
      (req.user.role === 'super_admin' || req.user.role === 'manager' || req.user.role === 'super manager');

    let sql = `
      SELECT id, name, ${includeSecret ? 'secret_code AS "secretCode",' : ''} 
             role_id, branch_id, status, created_at, updated_at 
      FROM employees
    `;
    const params = [];

    if (branchScope) {
      sql += ' WHERE branch_id = ?';
      params.push(branchScope);
    }

    sql += ' ORDER BY created_at ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch employees error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/employees (Create an employee)
 */
router.post('/', async (req, res) => {
  const { name, secretCode, role_id, branch_id, status } = req.body;
  const rawCode = secretCode || Math.floor(10000000 + Math.random() * 90000000).toString();
  const id = crypto.randomUUID();

  try {
    await pool.query(
      'INSERT INTO employees (id, name, secret_code, role_id, branch_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), rawCode, role_id, branch_id, status || 'active']
    );

    const [rows] = await pool.query(
      'SELECT id, name, secret_code AS "secretCode", role_id, branch_id, status, created_at FROM employees WHERE id = ?',
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/employees/:id (Update an employee)
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, secretCode, role_id, branch_id, status } = req.body;

  try {
    let result;
    if (secretCode && secretCode.trim() !== '') {
      [result] = await pool.query(
        'UPDATE employees SET name = ?, secret_code = ?, role_id = ?, branch_id = ?, status = ? WHERE id = ?',
        [name.trim(), secretCode.trim(), role_id, branch_id, status, id]
      );
    } else {
      [result] = await pool.query(
        'UPDATE employees SET name = ?, role_id = ?, branch_id = ?, status = ? WHERE id = ?',
        [name.trim(), role_id, branch_id, status, id]
      );
    }

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' });

    const [rows] = await pool.query(
      'SELECT id, name, secret_code AS "secretCode", role_id, branch_id, status FROM employees WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/employees/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    await pool.query('DELETE FROM employees WHERE id = ?', [id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'Server error. Cannot delete employee if they have applications.' });
  }
});

export default router;
