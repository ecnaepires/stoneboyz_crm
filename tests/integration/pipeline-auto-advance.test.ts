import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module.js';
import { DATABASE_POOL } from '../../apps/api/src/database.provider.js';
import { seedTestSession, TEST_ACTOR_USER_ID } from './helpers/auth.js';
import { setTestAuthToken } from './helpers/test-auth.js';

const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';

const resetDatabase = async (app: INestApplication): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);
  await pool.query('DROP SCHEMA public CASCADE;');
  await pool.query('CREATE SCHEMA public;');

  const migrationsDir = join(process.cwd(), 'db/migrations');
  const migrationFiles = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const migrationFile of migrationFiles) {
    await pool.query(await readFile(join(migrationsDir, migrationFile), 'utf8'));
  }
  await pool.query(await readFile(join(process.cwd(), 'db/seeds/test-customers.sql'), 'utf8'));
};

let app: INestApplication;
let baseUrl: string;

const createProject = async (title = 'Auto Advance Job'): Promise<string> => {
  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ customerId: SEEDED_CUSTOMER_ID, title, ownerUserId: TEST_ACTOR_USER_ID })
  });
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
};

const getProject = async (projectId: string): Promise<{ pipelineStage: string; status: string }> => {
  const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}`);
  expect(response.status).toBe(200);
  return (await response.json()) as { pipelineStage: string; status: string };
};

const setStage = async (projectId: string, stage: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}/stage`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stage })
  });
  expect(response.status).toBe(200);
};

const createEvent = async (params: { projectId?: string; appointmentType: string }): Promise<string> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventType: 'appointment',
      appointmentType: params.appointmentType,
      title: 'Appt',
      scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
      assigneeUserIds: [TEST_ACTOR_USER_ID],
      ...(params.projectId ? { projectId: params.projectId } : {})
    })
  });
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
};

const transition = async (eventId: string, action: string): Promise<number> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events/${eventId}/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  return response.status;
};

const finishEvent = async (eventId: string): Promise<number> => {
  expect(await transition(eventId, 'confirm')).toBe(200);
  expect(await transition(eventId, 'start')).toBe(200);
  return transition(eventId, 'finish');
};

const waitForStage = async (projectId: string, expected: string): Promise<string> => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const project = await getProject(projectId);
    if (project.pipelineStage === expected) {
      return project.status;
    }
    await delay(100);
  }
  const project = await getProject(projectId);
  return project.status;
};

describe('pipeline auto-advance', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    baseUrl = await app.getUrl();
    await resetDatabase(app);
    setTestAuthToken(await seedTestSession(app.get(DATABASE_POOL)));
  });

  beforeEach(async () => {
    await resetDatabase(app);
    setTestAuthToken(await seedTestSession(app.get(DATABASE_POOL)));
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('advances a linked project when its appointment is finished', async () => {
    const projectId = await createProject();
    const eventId = await createEvent({ projectId, appointmentType: 'template' });

    expect(await finishEvent(eventId)).toBe(200);

    const status = await waitForStage(projectId, 'template');
    const project = await getProject(projectId);
    expect(project.pipelineStage).toBe('template');
    expect(status).toBe('active');
  });

  it('ignores appointments that are not linked to a project', async () => {
    const projectId = await createProject();
    const eventId = await createEvent({ appointmentType: 'template' });

    expect(await finishEvent(eventId)).toBe(200);
    await delay(800);

    expect((await getProject(projectId)).pipelineStage).toBe('new');
  });

  it('ignores non-stage appointment types like repair', async () => {
    const projectId = await createProject();
    const eventId = await createEvent({ projectId, appointmentType: 'repair' });

    expect(await finishEvent(eventId)).toBe(200);
    await delay(800);

    expect((await getProject(projectId)).pipelineStage).toBe('new');
  });

  it('never moves a project backward (idempotent for earlier stages)', async () => {
    const projectId = await createProject();
    await setStage(projectId, 'install');
    const eventId = await createEvent({ projectId, appointmentType: 'deposit' });

    expect(await finishEvent(eventId)).toBe(200);
    await delay(800);

    expect((await getProject(projectId)).pipelineStage).toBe('install');
  });
});
