import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = express.Router();

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, role, branch_id, status, created_at FROM managers ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const hash = hashPassword(password || '');
  
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status FROM managers WHERE username = ? AND password_hash = ? AND status = ?',
      [username, hash, 'active']
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { username, password, role, branch_id, status } = req.body;
  const hash = hashPassword(password || 'password');
  
  try {
    const [result] = await pool.query(
      'INSERT INTO managers (username, password_hash, role, branch_id, status) VALUES (?, ?, ?, ?, ?)',
      [username, hash, role || 'manager', branch_id || null, status || 'active']
    );
    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status, created_at FROM managers WHERE id = ?',
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
  const { username, password, role, branch_id, status } = req.body;
  
  try {
    let result;
    if (password && password.trim() !== '') {
      const hash = hashPassword(password);
      [result] = await pool.query(
        'UPDATE managers SET username = ?, password_hash = ?, role = ?, branch_id = ?, status = ? WHERE id = ?',
        [username, hash, role, branch_id || null, status, id]
      );
    } else {
      [result] = await pool.query(
        'UPDATE managers SET username = ?, role = ?, branch_id = ?, status = ? WHERE id = ?',
        [username, role, branch_id || null, status, id]
      );
    }
    
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Manager not found' });
    
    const [rows] = await pool.query(
      'SELECT id, username, role, branch_id, status FROM managers WHERE id = ?',
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
    const [rows] = await pool.query('SELECT id FROM managers WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Manager not found' });
    
    await pool.query('DELETE FROM managers WHERE id = ?', [id]);
    res.json({ message: 'Manager deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
