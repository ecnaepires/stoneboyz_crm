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
const ASSIGNEE_USER_ID = '44444444-4444-4444-8444-444444444444';
const MISSING_ID = '99999999-9999-4999-8999-999999999999';

const resetDatabase = async (app: INestApplication): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);

  await pool.query('DROP TABLE IF EXISTS scheduled_events CASCADE;');
  await pool.query('DROP TABLE IF EXISTS quote_line_items CASCADE;');
  await pool.query('DROP TABLE IF EXISTS quotes CASCADE;');
  await pool.query('DROP TABLE IF EXISTS projects CASCADE;');
  await pool.query('DROP TABLE IF EXISTS customer_notes CASCADE;');
  await pool.query('DROP TABLE IF EXISTS customer_addresses CASCADE;');
  await pool.query('DROP TABLE IF EXISTS customer_contacts CASCADE;');
  await pool.query('DROP TABLE IF EXISTS customers CASCADE;');

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

const eventsUrl = (customerId = SEEDED_CUSTOMER_ID): string => `${baseUrl}/api/v1/customers/${customerId}/events`;

const createEvent = async (
  body: Record<string, unknown> = {},
  customerId = SEEDED_CUSTOMER_ID
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(eventsUrl(customerId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      eventType: 'appointment',
      appointmentType: 'template',
      title: 'Measure kitchen countertops',
      scheduledAt: '2026-06-01T14:00:00.000Z',
      durationMinutes: 90,
      assigneeUserIds: [ASSIGNEE_USER_ID],
      address: '123 Main St',
      notes: 'Bring laser measure',
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

const transitionEvent = async (
  eventId: string,
  action: 'confirm' | 'start' | 'finish' | 'complete' | 'cancel' | 'archive'
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(`${eventsUrl()}/${eventId}/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

describe('scheduled events', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    await resetDatabase(app);
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('creates an appointment event', async () => {
    const { response, body } = await createEvent();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      eventType: 'appointment',
      appointmentType: 'template',
      title: 'Measure kitchen countertops',
      scheduledAt: '2026-06-01T14:00:00.000Z',
      durationMinutes: 90,
      assigneeUserIds: [ASSIGNEE_USER_ID],
      status: 'scheduled',
      archivedAt: null,
      archivedByUserId: null
    });
  });

  it('creates a shop job event', async () => {
    const { response, body } = await createEvent({
      eventType: 'shop_job',
      appointmentType: null,
      title: 'Fabricate island slab',
      address: undefined
    });

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      eventType: 'shop_job',
      appointmentType: null,
      title: 'Fabricate island slab',
      status: 'scheduled'
    });
  });

  it('creates a cut appointment event', async () => {
    const { response, body } = await createEvent({
      appointmentType: 'cut',
      title: 'Cut kitchen slabs'
    });

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      eventType: 'appointment',
      appointmentType: 'cut',
      title: 'Cut kitchen slabs',
      status: 'scheduled'
    });
  });

  it('lists events for a customer', async () => {
    await createEvent({ title: 'First event' });

    const response = await fetch(eventsUrl());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.hasMore).toBe(false);
  });

  it('gets an event by id', async () => {
    const created = await createEvent();

    const response = await fetch(`${eventsUrl()}/${created.body.id}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(created.body.id);
  });

  it('updates an event in scheduled status', async () => {
    const created = await createEvent();

    const response = await fetch(`${eventsUrl()}/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        title: 'Updated measurement',
        scheduledAt: '2026-06-02T15:00:00.000Z',
        durationMinutes: 120
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe('Updated measurement');
    expect(body.scheduledAt).toBe('2026-06-02T15:00:00.000Z');
    expect(body.durationMinutes).toBe(120);
  });

  it('confirms an event', async () => {
    const created = await createEvent();
    const { response, body } = await transitionEvent(created.body.id as string, 'confirm');

    expect(response.status).toBe(200);
    expect(body.status).toBe('confirmed');
  });

  it('starts a confirmed event', async () => {
    const created = await createEvent();
    await transitionEvent(created.body.id as string, 'confirm');

    const { response, body } = await transitionEvent(created.body.id as string, 'start');

    expect(response.status).toBe(200);
    expect(body.status).toBe('in_progress');
  });

  it('completes an in-progress event', async () => {
    const created = await createEvent();
    await transitionEvent(created.body.id as string, 'confirm');
    await transitionEvent(created.body.id as string, 'start');

    const { response, body } = await transitionEvent(created.body.id as string, 'finish');

    expect(response.status).toBe(200);
    expect(body.status).toBe('completed');
  });

  it('cancels an event', async () => {
    const created = await createEvent();
    const { response, body } = await transitionEvent(created.body.id as string, 'cancel');

    expect(response.status).toBe(200);
    expect(body.status).toBe('cancelled');
  });

  it('returns 409 for invalid transition when starting a scheduled event', async () => {
    const created = await createEvent();
    const { response, body } = await transitionEvent(created.body.id as string, 'start');

    expect(response.status).toBe(409);
    expect(body.code).toBe('INVALID_SCHEDULED_EVENT_STATUS');
  });

  it('archives a completed event', async () => {
    const created = await createEvent();
    await transitionEvent(created.body.id as string, 'confirm');
    await transitionEvent(created.body.id as string, 'start');
    await transitionEvent(created.body.id as string, 'finish');

    const { response, body } = await transitionEvent(created.body.id as string, 'archive');

    expect(response.status).toBe(200);
    expect(body.archivedAt).toEqual(expect.any(String));
    expect(body.archivedByUserId).toBe(ACTOR_USER_ID);
  });

  it('returns 409 when archiving a scheduled event', async () => {
    const created = await createEvent();
    const { response, body } = await transitionEvent(created.body.id as string, 'archive');

    expect(response.status).toBe(409);
    expect(body.code).toBe('INVALID_SCHEDULED_EVENT_STATUS');
  });

  it('returns 404 for a missing event', async () => {
    const response = await fetch(`${eventsUrl()}/${MISSING_ID}`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Scheduled event not found');
  });

  it('returns 400 when creating an appointment without appointmentType', async () => {
    const { response, body } = await createEvent({ appointmentType: undefined });

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details.appointmentType).toBeDefined();
  });
});
