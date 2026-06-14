import { pool } from './src/config/database.js';

async function check() {
  const { rows } = await pool.query('SELECT id, email, first_name, id_type, id_number FROM users WHERE role = $1', ['PROFESSIONAL']);
  console.log(rows);
  process.exit(0);
}

check().catch(console.error);
