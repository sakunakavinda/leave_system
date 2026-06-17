import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all branches
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM branches ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new branch
router.post('/', async (req, res) => {
  const { name, location, status, manager_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO branches (name, location, status) VALUES ($1, $2, $3) RETURNING *',
      [name, location, status || 'active']
    );
    const branch = result.rows[0];
    
    if (manager_id) {
      await pool.query('UPDATE managers SET branch_id = $1 WHERE id = $2', [branch.id, manager_id]);
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
    const result = await pool.query(
      'UPDATE branches SET name = $1, location = $2, status = $3 WHERE id = $4 RETURNING *',
      [name, location, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    
    // Unlink old managers for this branch
    await pool.query('UPDATE managers SET branch_id = NULL WHERE branch_id = $1', [id]);
    
    // Link new manager
    if (manager_id) {
      await pool.query('UPDATE managers SET branch_id = $1 WHERE id = $2', [id, manager_id]);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a branch
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM branches WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Branch not found' });
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Cannot delete branch if it is referenced.' });
  }
});

export default router;
