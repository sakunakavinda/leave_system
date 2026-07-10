import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/settings - Fetch all settings
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach(row => {
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
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    for (const [key, value] of Object.entries(settingsData)) {
      await connection.query(`
        INSERT INTO settings (setting_key, setting_value) 
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `, [key, value]);
    }
    
    await connection.commit();
    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error updating settings', details: err.message });
  } finally {
    connection.release();
  }
});

export default router;
