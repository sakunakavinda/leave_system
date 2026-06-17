import express from 'express';
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
    
    // Lookup employee
    const empResult = await client.query('SELECT id, role_id, branch_id FROM employees WHERE secret_code = $1', [secretCode]);
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: 'Invalid secret code. Employee not found.' });
    }
    
    const { id: employee_id, role_id, branch_id } = empResult.rows[0];

    // Balance & Quota Check
    const requestedDays = leaveDates ? leaveDates.length : 0;
    if (requestedDays > 0) {
      const rulesResult = await client.query('SELECT * FROM leave_rules WHERE role_id = $1 AND branch_id = $2', [role_id, branch_id]);
      if (rulesResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Leave rules not found for your role and branch. Please contact Admin.' });
      }
      const rule = rulesResult.rows[0];

      const currentYear = new Date().getFullYear();
      let takenResult = await client.query('SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2', [employee_id, currentYear]);
      
      if (takenResult.rows.length === 0) {
        takenResult = await client.query(
          'INSERT INTO leave_balances (employee_id, year, annual_taken, sick_taken, casual_taken) VALUES ($1, $2, 0, 0, 0) RETURNING *',
          [employee_id, currentYear]
        );
      }
      const balances = takenResult.rows[0];

      let quota = 0;
      let taken = 0;
      if (leave_type === 'annual') { quota = rule.annual_leave; taken = balances.annual_taken; }
      else if (leave_type === 'sick') { quota = rule.sick_leave; taken = balances.sick_taken; }
      else if (leave_type === 'casual') { quota = rule.casual_leave; taken = balances.casual_taken; }
      
      if (taken + requestedDays > quota) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `You only have ${quota - taken} ${leave_type} leave days remaining.` });
      }

      // Max Per Day Check
      for (const date of leaveDates) {
        const onLeaveResult = await client.query(`
          SELECT COUNT(DISTINCT a.employee_id) 
          FROM leave_applications a
          JOIN leave_application_dates d ON a.id = d.leave_application_id
          JOIN employees e ON a.employee_id = e.id
          WHERE d.leave_date = $1 
            AND e.role_id = $2 
            AND e.branch_id = $3
            AND a.status IN ('approved', 'pending')
        `, [date, role_id, branch_id]);

        const countOnLeave = parseInt(onLeaveResult.rows[0].count);
        if (countOnLeave >= rule.max_per_day) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Maximum allowed employees on leave reached for date: ${date}` });
        }
      }
    }
    
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
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    client.release();
  }
});

router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const appResult = await client.query('SELECT * FROM leave_applications WHERE id = $1', [id]);
    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = appResult.rows[0];

    // If changing to 'approved' from something else
    if (app.status !== 'approved' && status === 'approved') {
      const daysResult = await client.query('SELECT COUNT(*) FROM leave_application_dates WHERE leave_application_id = $1', [id]);
      const requestedDays = parseInt(daysResult.rows[0].count);
      const currentYear = new Date(app.applied_date).getFullYear();

      await client.query(`
        INSERT INTO leave_balances (employee_id, year, annual_taken, sick_taken, casual_taken) 
        VALUES ($1, $2, 0, 0, 0) 
        ON CONFLICT (employee_id, year) DO NOTHING
      `, [app.employee_id, currentYear]);

      let updateCol = '';
      if (app.leave_type === 'annual') updateCol = 'annual_taken';
      else if (app.leave_type === 'sick') updateCol = 'sick_taken';
      else if (app.leave_type === 'casual') updateCol = 'casual_taken';

      if (updateCol) {
        await client.query(`
          UPDATE leave_balances SET ${updateCol} = ${updateCol} + $1 
          WHERE employee_id = $2 AND year = $3
        `, [requestedDays, app.employee_id, currentYear]);
      }
    } 
    // If changing from 'approved' to something else (refund)
    else if (app.status === 'approved' && status !== 'approved') {
      const daysResult = await client.query('SELECT COUNT(*) FROM leave_application_dates WHERE leave_application_id = $1', [id]);
      const requestedDays = parseInt(daysResult.rows[0].count);
      const currentYear = new Date(app.applied_date).getFullYear();

      let updateCol = '';
      if (app.leave_type === 'annual') updateCol = 'annual_taken';
      else if (app.leave_type === 'sick') updateCol = 'sick_taken';
      else if (app.leave_type === 'casual') updateCol = 'casual_taken';

      if (updateCol) {
        await client.query(`
          UPDATE leave_balances SET ${updateCol} = ${updateCol} - $1 
          WHERE employee_id = $2 AND year = $3
        `, [requestedDays, app.employee_id, currentYear]);
      }
    }

    const result = await client.query(
      'UPDATE leave_applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    client.release();
  }
});

router.put('/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { secretCode } = req.body;
  
  try {
    // First, verify the secret code belongs to the designated substitute
    const appResult = await pool.query('SELECT substitute_employee_id FROM leave_applications WHERE id = $1', [id]);
    if (appResult.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    
    const { substitute_employee_id } = appResult.rows[0];
    if (!substitute_employee_id) return res.status(400).json({ error: 'No substitute assigned' });
    
    const empResult = await pool.query('SELECT id FROM employees WHERE secret_code = $1 AND id = $2', [secretCode, substitute_employee_id]);
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
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
