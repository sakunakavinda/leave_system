import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.PGUSER || process.env.USER, // use current OS user
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'leave_system',
  password: process.env.PGPASSWORD || '',
  port: process.env.PGPORT || 5432,
});

export default pool;
