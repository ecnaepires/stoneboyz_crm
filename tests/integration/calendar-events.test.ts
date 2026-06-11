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
import { setTestAuthToken } from './helpers/test-auth.js';

const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222';

let app: INestApplication;
let baseUrl: string;

const resetDatabase = async (): Promise<void> => {
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

const eventsUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/events`;

const createAssignee = async (name: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/assignees`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, assigneeType: 'crew' })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createCustomer = async (name: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerKind: 'company',
      name,
      companyName: name,
      status: 'lead',
      type: 'customer',
      ownerUserId: ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createEvent = async (
  customerId: string,
  body: Record<string, unknown> = {}
): Promise<Record<string, unknown>> => {
  const response = await fetch(eventsUrl(customerId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      eventType: 'appointment',
      appointmentType: 'template',
      title: 'Template appointment',
      scheduledAt: '2026-06-03T14:00:00.000Z',
      durationMinutes: 90,
      assigneeIds: [],
      ...body
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

describe('calendar events', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    await resetDatabase();
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  beforeEach(async () => {
    await resetDatabase();
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('lists events across accounts in one response', async () => {
    const secondCustomer = await createCustomer('Beta Countertops');
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Acme template',
      scheduledAt: '2026-06-03T14:00:00.000Z'
    });
    await createEvent(String(secondCustomer.id), {
      title: 'Beta install',
      appointmentType: 'install',
      scheduledAt: '2026-06-04T16:00:00.000Z'
    });

    const response = await fetch(`${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.map((event: { title: string }) => event.title)).toEqual([
      'Acme template',
      'Beta install'
    ]);
    expect(body.data[0]).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      customerName: 'Acme Stone Works',
      projectTitle: null,
      jobNumber: null
    });
    expect(body.data[1]).toMatchObject({
      customerId: secondCustomer.id,
      customerName: 'Beta Countertops'
    });
  });

  it('filters by appointment type and customer', async () => {
    const secondCustomer = await createCustomer('Beta Countertops');
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Acme template',
      appointmentType: 'template',
      scheduledAt: '2026-06-03T14:00:00.000Z'
    });
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Acme install',
      appointmentType: 'install',
      scheduledAt: '2026-06-04T14:00:00.000Z'
    });
    await createEvent(String(secondCustomer.id), {
      title: 'Beta install',
      appointmentType: 'install',
      scheduledAt: '2026-06-05T14:00:00.000Z'
    });

    const response = await fetch(
      `${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08&appointmentTypes=install&customerId=${SEEDED_CUSTOMER_ID}`
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((event: { title: string }) => event.title)).toEqual([
      'Acme install'
    ]);
  });

  it('filters by status and hideCompleted', async () => {
    const scheduled = await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Scheduled template',
      scheduledAt: '2026-06-03T14:00:00.000Z'
    });
    const completed = await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Completed template',
      scheduledAt: '2026-06-04T14:00:00.000Z'
    });
    await app.get<Pool>(DATABASE_POOL).query(
      "UPDATE scheduled_events SET status = 'completed' WHERE id = $1",
      [String(completed.id)]
    );

    const statusResponse = await fetch(
      `${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08&statuses=completed`
    );
    const statusBody = await statusResponse.json();
    const hideCompletedResponse = await fetch(
      `${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08&hideCompleted=true`
    );
    const hideCompletedBody = await hideCompletedResponse.json();

    expect(statusResponse.status).toBe(200);
    expect(statusBody.data.map((event: { title: string }) => event.title)).toEqual([
      'Completed template'
    ]);
    expect(hideCompletedResponse.status).toBe(200);
    expect(hideCompletedBody.data.map((event: { id: string }) => event.id)).toEqual([
      String(scheduled.id)
    ]);
  });

  it('filters by assignee id', async () => {
    const installCrew = await createAssignee('Install Crew');
    const templateCrew = await createAssignee('Template Crew');
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Assigned install',
      appointmentType: 'install',
      scheduledAt: '2026-06-03T14:00:00.000Z',
      assigneeIds: [String(installCrew.id)]
    });
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Assigned template',
      appointmentType: 'template',
      scheduledAt: '2026-06-04T14:00:00.000Z',
      assigneeIds: [String(templateCrew.id)]
    });

    const response = await fetch(
      `${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08&assigneeIds=${String(installCrew.id)}`
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((event: { title: string }) => event.title)).toEqual([
      'Assigned install'
    ]);
  });

  it('treats to as an exclusive upper bound', async () => {
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Inside range',
      scheduledAt: '2026-06-07T23:59:00.000Z'
    });
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'At exclusive boundary',
      scheduledAt: '2026-06-08T00:00:00.000Z'
    });

    const response = await fetch(`${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((event: { title: string }) => event.title)).toEqual(['Inside range']);
  });

  it('returns 400 when from or to is missing', async () => {
    const response = await fetch(`${baseUrl}/api/v1/events?from=2026-06-01`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
    expect(body.details.to).toBeDefined();
  });

  it('returns 400 when range is longer than 62 days', async () => {
    const response = await fetch(`${baseUrl}/api/v1/events?from=2026-06-01&to=2026-08-03`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
    expect(body.details.to).toContain('Range must be 62 days or fewer');
  });
});
