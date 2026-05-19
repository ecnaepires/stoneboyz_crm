import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://stoneboyz_test:stoneboyz_test@localhost:5433/stoneboyz_crm_test";

const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query("DROP TABLE IF EXISTS quote_line_items CASCADE;");
  await client.query("DROP TABLE IF EXISTS quote_areas CASCADE;");
  await client.query("DROP TABLE IF EXISTS quotes CASCADE;");
  await client.query("DROP TABLE IF EXISTS projects CASCADE;");
  await client.query("DROP TABLE IF EXISTS customer_notes CASCADE;");
  await client.query("DROP TABLE IF EXISTS customer_addresses CASCADE;");
  await client.query("DROP TABLE IF EXISTS customers CASCADE;");
  await client.query("DROP TABLE IF EXISTS customer_contacts CASCADE;");
  await client.query("DROP TABLE IF EXISTS price_list_items CASCADE;");
  await client.query("DROP TABLE IF EXISTS price_lists CASCADE;");

  const migrationsDir = join(process.cwd(), "db/migrations");
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migrationSql = await readFile(join(migrationsDir, migrationFile), "utf8");

    await client.query(migrationSql);
  }

  const seedSql = await readFile(
    join(process.cwd(), "db/seeds/test-customers.sql"),
    "utf8",
  );

  await client.query(seedSql);

  console.log("Test database reset complete.");
} finally {
  await client.end();
}
