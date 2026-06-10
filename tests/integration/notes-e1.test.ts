import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module.js';
import { DATABASE_POOL } from '../../apps/api/src/database.provider.js';
import { seedTestSession } from './helpers/auth.js';
import { getDefaultJobTemplateId } from './helpers/job-templates.js';
import { setTestAuthToken } from './helpers/test-auth.js';

const ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222';

const resetDatabase = async (app: INestApplication): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);

  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  const migrationsDir = join(process.cwd(), 'db/migrations');
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migrationSql = await readFile(join(migrationsDir, migrationFile), 'utf8');
    await pool.query(migrationSql);
  }

  const seedSql = await readFile(join(process.cwd(), 'db/seeds/test-customers.sql'), 'utf8');
  await pool.query(seedSql);
};

const getAuthHeaders = (): HeadersInit => ({ 'content-type': 'application/json' });

let app: INestApplication;
let baseUrl: string;

const createCustomer = async (): Promise<Record<string, unknown>> => {
  const res = await fetch(`${baseUrl}/api/v1/customers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerKind: 'company',
      name: 'Notes Test Co',
      companyName: 'Notes Test Co',
      status: 'lead',
      type: 'customer',
      ownerUserId: ACTOR_USER_ID
    })
  });
  expect(res.status).toBe(201);
  return await res.json() as Record<string, unknown>;
};

const createProject = async (customerId: string): Promise<Record<string, unknown>> => {
  const jobTemplateId = await getDefaultJobTemplateId(baseUrl);
  const res = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerId,
      title: 'Kitchen Remodel',
      jobTemplateId,
      description: 'Granite kitchen countertops',
      status: 'draft',
      ownerUserId: ACTOR_USER_ID
    })
  });
  expect(res.status).toBe(201);
  return await res.json() as Record<string, unknown>;
};

const createQuote = async (customerId: string, projectId: string): Promise<Record<string, unknown>> => {
  const res = await fetch(`${baseUrl}/api/v1/customers/${customerId}/quotes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, title: 'Quote v1', projectId })
  });
  expect(res.status).toBe(201);
  return await res.json() as Record<string, unknown>;
};

describe('Notes E1', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    baseUrl = await app.getUrl();
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  // ── JobNote ────────────────────────────────────────────────────────────────

  it('POST job note → 201, GET lists it', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));

    const postRes = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/projects/${project.id}/notes`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID, body: 'Soffit above sink confirmed with templater.' })
      }
    );
    expect(postRes.status).toBe(201);
    const note = await postRes.json() as Record<string, unknown>;
    expect(note.body).toBe('Soffit above sink confirmed with templater.');
    expect(note.authorUserId).toBe(ACTOR_USER_ID);
    expect(note.editedAt).toBeNull();
    expect(note.deletedAt).toBeNull();

    const getRes = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/projects/${project.id}/notes`,
      { headers: getAuthHeaders() }
    );
    expect(getRes.status).toBe(200);
    const list = await getRes.json() as unknown[];
    expect(list).toHaveLength(1);
    expect((list[0] as Record<string, unknown>).body).toBe('Soffit above sink confirmed with templater.');
  });
});
