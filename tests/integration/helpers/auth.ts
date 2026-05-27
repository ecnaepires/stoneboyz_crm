import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

export const TEST_ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222';

export async function seedTestSession(pool: Pool): Promise<string> {
  const sessionId = randomUUID();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
     VALUES ($1, 'Test Actor', 'test@stoneboyz.test', true, now(), now(), 'admin')
     ON CONFLICT (id) DO UPDATE SET role = 'admin'`,
    [TEST_ACTOR_USER_ID]
  );

  await pool.query(
    `INSERT INTO session (id, "expiresAt", token, "userId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, now(), now())
     ON CONFLICT (id) DO NOTHING`,
    [sessionId, expiresAt, token, TEST_ACTOR_USER_ID]
  );

  return token;
}
