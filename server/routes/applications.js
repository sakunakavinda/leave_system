import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id, a.employee_id, a.substitute_employee_id, a.leave_type, 
        a.applied_date, a.returning_date, a.substitute_confirmed, a.status,
        a.created_at, a.updated_at,
        COALESCE(
          (SELECT array_agg(d.leave_date::text) 
           FROM leave_application_dates d 
           WHERE d.leave_application_id = a.id), 
          '{}'
        ) AS leave_dates
      FROM leave_applications a
      ORDER BY a.created_at DESC
    `);
    
    // Map leave_dates correctly to match frontend (camelCase where necessary)
    const apps = result.rows.map(row => ({
      id: row.id,
      employee_id: row.employee_id,
      substitute_employee_id: row.substitute_employee_id,
      leave_type: row.leave_type,
      appliedDate: row.applied_date,
      returningDate: row.returning_date,
      substituteConfirmed: row.substitute_confirmed,
      status: row.status,
      leaveDates: row.leave_dates
    }));
    
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { secretCode, leave_type, appliedDate, leaveDates, returningDate, substitute_employee_id } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Hash the provided secret code to match the DB
    const hash = crypto.createHash('sha256').update(secretCode).digest('hex');
    
    // Lookup employee
    const empResult = await client.query('SELECT id FROM employees WHERE secret_code_hash = $1', [hash]);
    if (empResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid secret code. Employee not found.' });
    }
    
    const employee_id = empResult.rows[0].id;
    
    const appResult = await client.query(
      `INSERT INTO leave_applications (employee_id, substitute_employee_id, leave_type, applied_date, returning_date, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
      [employee_id, substitute_employee_id || null, leave_type, appliedDate, returningDate]
    );
    
    const appId = appResult.rows[0].id;
    
    if (leaveDates && leaveDates.length > 0) {
      for (const date of leaveDates) {
        await client.query(
          'INSERT INTO leave_application_dates (leave_application_id, leave_date) VALUES ($1, $2)',
          [appId, date]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({ id: appId, message: 'Application submitted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE leave_applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { secretCode } = req.body;
  
  try {
    const hash = crypto.createHash('sha256').update(secretCode).digest('hex');
    
    // First, verify the secret code belongs to the designated substitute
    const appResult = await pool.query('SELECT substitute_employee_id FROM leave_applications WHERE id = $1', [id]);
    if (appResult.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    
    const { substitute_employee_id } = appResult.rows[0];
    if (!substitute_employee_id) return res.status(400).json({ error: 'No substitute assigned' });
    
    const empResult = await pool.query('SELECT id FROM employees WHERE secret_code_hash = $1 AND id = $2', [hash, substitute_employee_id]);
    if (empResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid secret code for the designated substitute.' });
    }
    
    // Update the application
    const result = await pool.query(
      'UPDATE leave_applications SET substitute_confirmed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
