import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://stoneboyz:stoneboyz@localhost:5432/stoneboyz_crm_dev';

const client = new Client({ connectionString });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows: applied } = await client.query(
    `SELECT filename FROM schema_migrations ORDER BY filename`
  );
  const appliedSet = new Set(applied.map((r) => r.filename));

  const migrationsDir = join(__dirname, '../../db/migrations');
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    console.log(`  apply ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
      await client.query('COMMIT');
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  FAILED ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log(
    `\nMigrations complete. ${ran} applied, ${appliedSet.size} already up to date.`
  );
} finally {
  await client.end();
}
