import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'adm_cursos_umss',
});

export async function checkDbConnection(): Promise<void> {
  const { rows } = await pool.query('SELECT NOW()');
  console.log(`Conexión a PostgreSQL exitosa: ${rows[0].now}`);
}