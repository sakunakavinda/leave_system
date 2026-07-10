import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.id, a.employee_id, a.substitute_employee_id, a.leave_type, 
        a.applied_date, a.returning_date, a.substitute_confirmed, a.status,
        a.created_at, a.updated_at,
        (SELECT GROUP_CONCAT(DATE_FORMAT(d.leave_date, '%Y-%m-%d')) 
         FROM leave_application_dates d 
         WHERE d.leave_application_id = a.id) AS leave_dates
      FROM leave_applications a
      ORDER BY a.created_at DESC
    `);
    
    const apps = rows.map(row => ({
      id: row.id,
      employee_id: row.employee_id,
      substitute_employee_id: row.substitute_employee_id,
      leave_type: row.leave_type,
      appliedDate: row.applied_date,
      returningDate: row.returning_date,
      substituteConfirmed: row.substitute_confirmed,
      status: row.status,
      leaveDates: row.leave_dates ? row.leave_dates.split(',') : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(apps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

import crypto from 'crypto';

router.post('/', async (req, res) => {
  const { secretCode, leave_type, appliedDate, leaveDates, returningDate, substitute_employee_id } = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Lookup employee
    const [empRows] = await connection.query('SELECT id, role_id, branch_id FROM employees WHERE secret_code = ?', [secretCode]);
    if (empRows.length === 0) {
      await connection.rollback();
      return res.status(401).json({ error: 'Invalid secret code. Employee not found.' });
    }
    
    const { id: employee_id, role_id, branch_id } = empRows[0];

    // Balance & Quota Check
    const requestedDays = leaveDates ? leaveDates.length : 0;
    if (requestedDays > 0) {
      const [rulesRows] = await connection.query('SELECT * FROM leave_rules WHERE role_id = ? AND branch_id = ?', [role_id, branch_id]);
      if (rulesRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Leave rules not found for your role and branch. Please contact Admin.' });
      }
      const rule = rulesRows[0];

      const currentYear = new Date().getFullYear();
      let [takenRows] = await connection.query('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?', [employee_id, currentYear]);
      
      if (takenRows.length === 0) {
        const balanceId = crypto.randomUUID();
        await connection.query(
          'INSERT INTO leave_balances (id, employee_id, year, annual_taken, sick_taken, casual_taken) VALUES (?, ?, ?, 0, 0, 0)',
          [balanceId, employee_id, currentYear]
        );
        [takenRows] = await connection.query('SELECT * FROM leave_balances WHERE employee_id = ? AND year = ?', [employee_id, currentYear]);
      }
      const balances = takenRows[0];

      let quota = 0;
      let taken = 0;
      if (leave_type === 'annual') { quota = rule.annual_leave; taken = balances.annual_taken; }
      else if (leave_type === 'sick') { quota = rule.sick_leave; taken = balances.sick_taken; }
      else if (leave_type === 'casual') { quota = rule.casual_leave; taken = balances.casual_taken; }
      
      if (taken + requestedDays > quota) {
        await connection.rollback();
        return res.status(400).json({ error: `You only have ${quota - taken} ${leave_type} leave days remaining.` });
      }

      // Max Per Day Check
      for (const date of leaveDates) {
        const [onLeaveRows] = await connection.query(`
          SELECT COUNT(DISTINCT a.employee_id) AS count
          FROM leave_applications a
          JOIN leave_application_dates d ON a.id = d.leave_application_id
          JOIN employees e ON a.employee_id = e.id
          WHERE d.leave_date = ? 
            AND e.role_id = ? 
            AND e.branch_id = ?
            AND a.status IN ('approved', 'pending')
        `, [date, role_id, branch_id]);

        const countOnLeave = parseInt(onLeaveRows[0].count);
        if (countOnLeave >= rule.max_per_day) {
          await connection.rollback();
          return res.status(400).json({ error: `Maximum allowed employees on leave reached for date: ${date}` });
        }

        // Substitute Check
        const [subCheckRows] = await connection.query(`
          SELECT e.name 
          FROM leave_applications a
          JOIN leave_application_dates d ON a.id = d.leave_application_id
          JOIN employees e ON a.employee_id = e.id
          WHERE a.substitute_employee_id = ?
            AND d.leave_date = ?
            AND a.status IN ('pending', 'approved')
        `, [employee_id, date]);

        if (subCheckRows.length > 0) {
          await connection.rollback();
          const requesterName = subCheckRows[0].name;
          return res.status(400).json({ error: `You cannot take leave on ${date} because you are assigned as a substitute for ${requesterName}.` });
        }

        // Double Substitute Check
        if (substitute_employee_id) {
          const [doubleSubCheck] = await connection.query(`
            SELECT e.name 
            FROM leave_applications a
            JOIN leave_application_dates d ON a.id = d.leave_application_id
            JOIN employees e ON a.employee_id = e.id
            WHERE a.substitute_employee_id = ?
              AND d.leave_date = ?
              AND a.status IN ('pending', 'approved')
          `, [substitute_employee_id, date]);

          if (doubleSubCheck.length > 0) {
            await connection.rollback();
            const requesterName = doubleSubCheck[0].name;
            const [subEmpRows] = await connection.query('SELECT name FROM employees WHERE id = ?', [substitute_employee_id]);
            const subName = subEmpRows[0]?.name || 'the selected substitute';
            return res.status(400).json({ error: `${subName} cannot be your substitute on ${date} because they are already substituting for ${requesterName}.` });
          }
        }
      }
    }
    
    const appId = crypto.randomUUID();
    const [appResult] = await connection.query(
      `INSERT INTO leave_applications (id, employee_id, substitute_employee_id, leave_type, applied_date, returning_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [appId, employee_id, substitute_employee_id || null, leave_type, appliedDate, returningDate]
    );
    
    if (leaveDates && leaveDates.length > 0) {
      for (const date of leaveDates) {
        const dateId = crypto.randomUUID();
        await connection.query(
          'INSERT INTO leave_application_dates (id, leave_application_id, leave_date) VALUES (?, ?, ?)',
          [dateId, appId, date]
        );
      }
    }
    
    if (requestedDays > 0) {
      let updateCol = '';
      if (leave_type === 'annual') updateCol = 'annual_taken';
      else if (leave_type === 'sick') updateCol = 'sick_taken';
      else if (leave_type === 'casual') updateCol = 'casual_taken';

      if (updateCol) {
        const currentYear = new Date().getFullYear();
        await connection.query(`
          UPDATE leave_balances SET ${updateCol} = ${updateCol} + ? 
          WHERE employee_id = ? AND year = ?
        `, [requestedDays, employee_id, currentYear]);
      }
    }

    await connection.commit();
    res.status(201).json({ id: appId, message: 'Application submitted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    connection.release();
  }
});

router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const [appRows] = await connection.query('SELECT * FROM leave_applications WHERE id = ?', [id]);
    if (appRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = appRows[0];

    if (app.status !== 'rejected' && status === 'rejected') {
      const [daysRows] = await connection.query('SELECT COUNT(*) AS count FROM leave_application_dates WHERE leave_application_id = ?', [id]);
      const requestedDays = parseInt(daysRows[0].count);
      const currentYear = new Date(app.applied_date).getFullYear();

      let updateCol = '';
      if (app.leave_type === 'annual') updateCol = 'annual_taken';
      else if (app.leave_type === 'sick') updateCol = 'sick_taken';
      else if (app.leave_type === 'casual') updateCol = 'casual_taken';

      if (updateCol) {
        await connection.query(`
          UPDATE leave_balances SET ${updateCol} = ${updateCol} - ? 
          WHERE employee_id = ? AND year = ?
        `, [requestedDays, app.employee_id, currentYear]);
      }
    } 
    else if (app.status === 'rejected' && status !== 'rejected') {
      const [daysRows] = await connection.query('SELECT COUNT(*) AS count FROM leave_application_dates WHERE leave_application_id = ?', [id]);
      const requestedDays = parseInt(daysRows[0].count);
      const currentYear = new Date(app.applied_date).getFullYear();

      await connection.query(`
        INSERT IGNORE INTO leave_balances (employee_id, year, annual_taken, sick_taken, casual_taken) 
        VALUES (?, ?, 0, 0, 0)
      `, [app.employee_id, currentYear]);

      let updateCol = '';
      if (app.leave_type === 'annual') updateCol = 'annual_taken';
      else if (app.leave_type === 'sick') updateCol = 'sick_taken';
      else if (app.leave_type === 'casual') updateCol = 'casual_taken';

      if (updateCol) {
        await connection.query(`
          UPDATE leave_balances SET ${updateCol} = ${updateCol} + ? 
          WHERE employee_id = ? AND year = ?
        `, [requestedDays, app.employee_id, currentYear]);
      }
    }

    await connection.query(
      'UPDATE leave_applications SET status = ? WHERE id = ?',
      [status, id]
    );

    const [updatedRows] = await connection.query('SELECT * FROM leave_applications WHERE id = ?', [id]);
    await connection.commit();
    res.json(updatedRows[0]);
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    connection.release();
  }
});

router.put('/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const { secretCode } = req.body;
  
  try {
    const [appRows] = await pool.query('SELECT substitute_employee_id FROM leave_applications WHERE id = ?', [id]);
    if (appRows.length === 0) return res.status(404).json({ error: 'Application not found' });
    
    const { substitute_employee_id } = appRows[0];
    if (!substitute_employee_id) return res.status(400).json({ error: 'No substitute assigned' });
    
    const [empRows] = await pool.query('SELECT id FROM employees WHERE secret_code = ? AND id = ?', [secretCode, substitute_employee_id]);
    if (empRows.length === 0) {
      return res.status(401).json({ error: 'Invalid secret code for the designated substitute.' });
    }
    
    await pool.query(
      'UPDATE leave_applications SET substitute_confirmed = true WHERE id = ?',
      [id]
    );
    const [updatedRows] = await pool.query('SELECT * FROM leave_applications WHERE id = ?', [id]);
    res.json(updatedRows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const [appRows] = await connection.query('SELECT * FROM leave_applications WHERE id = ?', [id]);
    if (appRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const app = appRows[0];
    
    if (app.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Can only undo pending applications' });
    }
    
    const [daysRows] = await connection.query('SELECT COUNT(*) AS count FROM leave_application_dates WHERE leave_application_id = ?', [id]);
    const requestedDays = parseInt(daysRows[0].count);
    const currentYear = new Date(app.applied_date).getFullYear();

    let updateCol = '';
    if (app.leave_type === 'annual') updateCol = 'annual_taken';
    else if (app.leave_type === 'sick') updateCol = 'sick_taken';
    else if (app.leave_type === 'casual') updateCol = 'casual_taken';

    if (updateCol) {
      await connection.query(`
        UPDATE leave_balances SET ${updateCol} = ${updateCol} - ? 
        WHERE employee_id = ? AND year = ?
      `, [requestedDays, app.employee_id, currentYear]);
    }
    
    await connection.query('DELETE FROM leave_application_dates WHERE leave_application_id = ?', [id]);
    await connection.query('DELETE FROM leave_applications WHERE id = ?', [id]);
    
    await connection.commit();
    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    connection.release();
  }
});

router.get('/overview/:secretCode', async (req, res) => {
  const { secretCode } = req.params;
  try {
    const [empRows] = await pool.query(`
      SELECT e.id, e.name, e.role_id, e.branch_id,
             r.title AS role_title,
             b.name AS branch_name,
             d.name AS department_name
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN departments d ON r.department_id = d.id
      WHERE e.secret_code = ?
    `, [secretCode]);

    if (empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = empRows[0];
    const year = new Date().getFullYear();

    const [balanceRows] = await pool.query(`
      SELECT annual_taken, sick_taken, casual_taken
      FROM leave_balances
      WHERE employee_id = ? AND year = ?
    `, [emp.id, year]);

    const balance = balanceRows[0] || { annual_taken: 0, sick_taken: 0, casual_taken: 0 };

    const [rulesRows] = await pool.query(`
      SELECT annual_leave, sick_leave, casual_leave, max_per_day
      FROM leave_rules
      WHERE role_id = ? AND branch_id = ?
    `, [emp.role_id, emp.branch_id]);

    const rules = rulesRows[0] || { annual_leave: 14, sick_leave: 10, casual_leave: 7, max_per_day: 1 };

    const [appsRows] = await pool.query(`
      SELECT 
        a.id, a.leave_type, a.applied_date, a.returning_date,
        a.substitute_confirmed, a.status, a.created_at,
        sub.name AS substitute_name,
        (SELECT GROUP_CONCAT(DATE_FORMAT(d.leave_date, '%Y-%m-%d'))
         FROM leave_application_dates d
         WHERE d.leave_application_id = a.id) AS leave_dates
      FROM leave_applications a
      LEFT JOIN employees sub ON a.substitute_employee_id = sub.id
      WHERE a.employee_id = ?
      ORDER BY a.created_at DESC
    `, [emp.id]);

    res.json({
      employee: {
        id: emp.id,
        name: emp.name,
        role: emp.role_title,
        branch: emp.branch_name,
        department: emp.department_name,
      },
      balance: {
        annual_taken: balance.annual_taken,
        sick_taken: balance.sick_taken,
        casual_taken: balance.casual_taken,
      },
      rules: {
        annual_leave: rules.annual_leave,
        sick_leave: rules.sick_leave,
        casual_leave: rules.casual_leave,
      },
      applications: appsRows.map(row => ({
        id: row.id,
        leave_type: row.leave_type,
        appliedDate: row.applied_date,
        returningDate: row.returning_date,
        substituteConfirmed: row.substitute_confirmed,
        substituteName: row.substitute_name,
        status: row.status,
        leaveDates: row.leave_dates ? row.leave_dates.split(',') : [],
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
