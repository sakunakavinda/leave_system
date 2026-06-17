import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = express.Router();

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, branch_id, status, created_at FROM managers ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const hash = hashPassword(password || '');
  
  try {
    const result = await pool.query(
      'SELECT id, username, role, branch_id, status FROM managers WHERE username = $1 AND password_hash = $2 AND status = $3',
      [username, hash, 'active']
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { username, password, role, branch_id, status } = req.body;
  const hash = hashPassword(password || 'password');
  
  try {
    const result = await pool.query(
      'INSERT INTO managers (username, password_hash, role, branch_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, branch_id, status, created_at',
      [username, hash, role || 'manager', branch_id || null, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, role, branch_id, status } = req.body;
  
  try {
    let result;
    if (password && password.trim() !== '') {
      const hash = hashPassword(password);
      result = await pool.query(
        'UPDATE managers SET username = $1, password_hash = $2, role = $3, branch_id = $4, status = $5 WHERE id = $6 RETURNING id, username, role, branch_id, status',
        [username, hash, role, branch_id || null, status, id]
      );
    } else {
      result = await pool.query(
        'UPDATE managers SET username = $1, role = $2, branch_id = $3, status = $4 WHERE id = $5 RETURNING id, username, role, branch_id, status',
        [username, role, branch_id || null, status, id]
      );
    }
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Manager not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM managers WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Manager not found' });
    res.json({ message: 'Manager deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
