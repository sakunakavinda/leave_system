import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Route imports
import branchesRouter from './routes/branches.js';
import departmentsRouter from './routes/departments.js';
import rolesRouter from './routes/roles.js';
import employeesRouter from './routes/employees.js';
import managersRouter from './routes/managers.js';
import rulesRouter from './routes/rules.js';
import applicationsRouter from './routes/applications.js';
import settingsRouter from './routes/settings.js';
import leaveTypesRouter from './routes/leaveTypes.js';
import leaveProfilesRouter from './routes/leaveProfiles.js';
import authRouter from './routes/auth.js';
import holidaysRouter from './routes/holidays.js';
import shiftsRouter from './routes/shifts.js';
import rostersRouter from './routes/rosters.js';
import contingenciesRouter from './routes/contingencies.js';
import payrollRouter from './routes/payroll.js';
import operatingSchedulesRouter, { initOperatingSchedulesTable } from './routes/operatingSchedules.js';

dotenv.config();

// Ensure operating_schedules table exists and defaults are seeded
initOperatingSchedulesTable();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/branches', branchesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/managers', managersRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/leave-types', leaveTypesRouter);
app.use('/api/leave-profiles', leaveProfilesRouter);
app.use('/api/holidays', holidaysRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/rosters', rostersRouter);
app.use('/api/contingencies', contingenciesRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/operating-schedules', operatingSchedulesRouter);

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '../dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'), (err) => {
    if (err) {
      res.status(404).send('<h1>Frontend Not Built</h1><p>The "dist" folder is missing on the server! Please make sure you have run "npm run build" and pushed the "dist" folder to Plesk.</p>');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
