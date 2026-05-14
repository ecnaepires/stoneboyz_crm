import { Client } from "pg";
import { describe, expect, it } from "vitest";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://stoneboyz_test:stoneboyz_test@localhost:5433/stoneboyz_crm_test";

describe("PostgreSQL test database", () => {
  it("accepts connections", async () => {
    const client = new Client({ connectionString: databaseUrl });

    await client.connect();

    try {
      const result = await client.query<{ value: number }>("SELECT 1 AS value");

      expect(result.rows[0]?.value).toBe(1);
    } finally {
      await client.end();
    }
  });

  it("loads seeded customers", async () => {
    const client = new Client({ connectionString: databaseUrl });

    await client.connect();

    try {
      const result = await client.query<{
        id: string;
        name: string;
        status: string;
        type: string;
      }>(
        `
          SELECT id, name, status, type
          FROM customers
          WHERE id = '11111111-1111-4111-8111-111111111111'
        `,
      );

      expect(result.rows[0]).toEqual({
        id: "11111111-1111-4111-8111-111111111111",
        name: "Acme Stone Works",
        status: "lead",
        type: "prospect",
      });
    } finally {
      await client.end();
    }
  });

  it("loads seeded customer contacts", async () => {
    const client = new Client({ connectionString: databaseUrl });

    await client.connect();

    try {
      const result = await client.query<{
        id: string;
        customer_id: string;
        first_name: string;
        is_primary: boolean;
      }>(
        `
          SELECT id, customer_id, first_name, is_primary
          FROM customer_contacts
          WHERE id = '33333333-3333-4333-8333-333333333333'
        `,
      );

      expect(result.rows[0]).toEqual({
        id: "33333333-3333-4333-8333-333333333333",
        customer_id: "11111111-1111-4111-8111-111111111111",
        first_name: "Alex",
        is_primary: true,
      });
    } finally {
      await client.end();
    }
  });
});
