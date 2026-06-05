import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module.js';
import { DATABASE_POOL } from '../../apps/api/src/database.provider.js';
import { seedTestSession, TEST_ACTOR_USER_ID } from './helpers/auth.js';
import { setTestAuthToken } from './helpers/test-auth.js';

const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const MISSING_ID = '99999999-9999-4999-8999-999999999999';

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

let app: INestApplication;
let baseUrl: string;

const createProject = async (title = 'Pipeline Project'): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerId: SEEDED_CUSTOMER_ID,
      title,
      ownerUserId: TEST_ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const setStage = async (
  projectId: unknown,
  body: Record<string, unknown>
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(`${baseUrl}/api/v1/projects/${String(projectId)}/stage`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

describe('pipeline stage API', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    await resetDatabase(app);
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('moves a project forward and derives active status', async () => {
    const project = await createProject();

    const { response, body } = await setStage(project.id, { stage: 'deposit' });

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ pipelineStage: 'deposit', status: 'active' });
  });

  it('rejects a backward move without allowBackward', async () => {
    const project = await createProject();
    await setStage(project.id, { stage: 'deposit' });

    const { response, body } = await setStage(project.id, { stage: 'new' });

    expect(response.status).toBe(409);
    expect(body.code).toBe('BACKWARD_STAGE_NOT_ALLOWED');
  });

  it('allows a backward move with allowBackward', async () => {
    const project = await createProject();
    await setStage(project.id, { stage: 'deposit' });

    const { response, body } = await setStage(project.id, {
      stage: 'new',
      allowBackward: true
    });

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ pipelineStage: 'new', status: 'draft' });
  });

  it('returns the project unchanged for a same-stage no-op', async () => {
    const project = await createProject();

    const { response, body } = await setStage(project.id, { stage: 'new' });

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ id: project.id, pipelineStage: 'new', status: 'draft' });
  });

  it('marks done projects completed', async () => {
    const project = await createProject();

    const { response, body } = await setStage(project.id, { stage: 'done' });

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ pipelineStage: 'done', status: 'completed' });
  });

  it('returns conflict for archived projects', async () => {
    const project = await createProject();
    const archiveResponse = await fetch(`${baseUrl}/api/v1/projects/${String(project.id)}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(archiveResponse.status).toBe(200);

    const { response } = await setStage(project.id, { stage: 'deposit' });

    expect(response.status).toBe(409);
  });

  it('returns validation error for an invalid stage', async () => {
    const project = await createProject();

    const { response } = await setStage(project.id, { stage: 'bogus' });

    expect(response.status).toBe(400);
  });

  it('returns not found for an unknown project id', async () => {
    const { response } = await setStage(MISSING_ID, { stage: 'deposit' });

    expect(response.status).toBe(404);
  });
});
