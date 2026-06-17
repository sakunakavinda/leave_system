import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/settings - Fetch all settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching settings' });
  }
});

// PUT /api/settings - Update settings
router.put('/', async (req, res) => {
  const settingsData = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const [key, value] of Object.entries(settingsData)) {
      await client.query(`
        INSERT INTO settings (setting_key, setting_value) 
        VALUES ($1, $2)
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2
      `, [key, value]);
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error updating settings', details: err.message });
  } finally {
    client.release();
  }
});

export default router;
