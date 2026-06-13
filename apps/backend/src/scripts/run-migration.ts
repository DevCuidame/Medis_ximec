import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client, Pool } = pg;

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  console.log('🔍 Parsing DATABASE_URL...');
  const parsed = new URL(connectionString);
  const user = parsed.username;
  const password = parsed.password;
  const host = parsed.hostname;
  const port = parsed.port || '5432';
  const databaseName = parsed.pathname.substring(1);

  // 1. Connect to postgres database to ensure target database exists
  console.log(`🔌 Connecting to default 'postgres' database at ${host}:${port}...`);
  const defaultClient = new Client({
    host,
    port: parseInt(port, 10),
    user,
    password,
    database: 'postgres',
  });

  try {
    await defaultClient.connect();
    const dbCheck = await defaultClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`📁 Database "${databaseName}" does not exist. Creating...`);
      // CREATE DATABASE cannot run inside a transaction, so we use default client
      await defaultClient.query(`CREATE DATABASE ${databaseName}`);
      console.log(`✅ Database "${databaseName}" created successfully!`);
    } else {
      console.log(`📁 Database "${databaseName}" already exists.`);
    }
  } catch (err) {
    console.error('❌ Failed to check/create database:', err);
    throw err;
  } finally {
    await defaultClient.end();
  }

  // 2. Establish connection to target database
  console.log(`🔌 Connecting to target database "${databaseName}"...`);
  const pool = new Pool({ connectionString });

  try {
    // 3. Run all SQL migration files in order
    const migrationsDir = path.resolve('migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`🔄 Running migration ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`✅ Migration ${file} successful!`);
    }

    console.log('\n🌟 ALL MIGRATIONS APPLIED SUCCESSFULLY! 🌟');
  } catch (err) {
    console.error('❌ Migration execution failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

setupDatabase().catch((e) => {
  console.error('Fatal error during setup:', e);
  process.exit(1);
});
