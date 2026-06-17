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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mount routes
app.use('/api/branches', branchesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/managers', managersRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/settings', settingsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
