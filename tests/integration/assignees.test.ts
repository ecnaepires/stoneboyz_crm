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

const assigneesUrl = (): string => `${baseUrl}/api/v1/assignees`;
const eventsUrl = (): string => `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events`;

const createAssignee = async (
  body: Record<string, unknown>
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(assigneesUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  return { response, body: (await response.json()) as Record<string, unknown> };
};

const createEvent = async (
  body: Record<string, unknown> = {}
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(eventsUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      eventType: 'appointment',
      appointmentType: 'install',
      title: 'Install visit',
      scheduledAt: '2026-07-06T14:00:00.000Z',
      durationMinutes: 90,
      ...body
    })
  });

  return { response, body: (await response.json()) as Record<string, unknown> };
};

describe('assignees API', () => {
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

  it('creates person and resource assignees and lists them by name', async () => {
    const person = await createAssignee({ name: 'John Smith' });
    const truck = await createAssignee({ name: 'Truck 1', assigneeType: 'truck' });

    expect(person.response.status).toBe(201);
    expect(person.body).toMatchObject({
      name: 'John Smith',
      assigneeType: 'person',
      active: true,
      linkedUserId: null
    });
    expect(truck.response.status).toBe(201);
    expect(truck.body).toMatchObject({ name: 'Truck 1', assigneeType: 'truck' });

    const listResponse = await fetch(assigneesUrl());
    const list = (await listResponse.json()) as Array<Record<string, unknown>>;

    expect(listResponse.status).toBe(200);
    expect(list.map((assignee) => assignee.name)).toEqual(['John Smith', 'Truck 1']);
  });

  it('rejects an invalid assignee type', async () => {
    const { response, body } = await createAssignee({ name: 'Ghost', assigneeType: 'spaceship' });

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('creates a scheduled event with zero assignees', async () => {
    const { response, body } = await createEvent();

    expect(response.status).toBe(201);
    expect(body.assigneeIds).toEqual([]);
  });

  it('creates a scheduled event with multiple assignees and returns them on reads', async () => {
    const crew = await createAssignee({ name: 'Install Crew 1', assigneeType: 'crew' });
    const truck = await createAssignee({ name: 'Truck 1', assigneeType: 'truck' });

    const { response, body } = await createEvent({
      assigneeIds: [crew.body.id, truck.body.id]
    });

    expect(response.status).toBe(201);
    expect([...(body.assigneeIds as string[])].sort()).toEqual(
      [crew.body.id as string, truck.body.id as string].sort()
    );

    const fetched = await (await fetch(`${eventsUrl()}/${body.id}`)).json();
    expect([...(fetched.assigneeIds as string[])].sort()).toEqual(
      [crew.body.id as string, truck.body.id as string].sort()
    );
  });

  it('replaces assignees on event update', async () => {
    const crew = await createAssignee({ name: 'Install Crew 1', assigneeType: 'crew' });
    const truck = await createAssignee({ name: 'Truck 1', assigneeType: 'truck' });

    const created = await createEvent({ assigneeIds: [crew.body.id] });

    const response = await fetch(`${eventsUrl()}/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, assigneeIds: [truck.body.id] })
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.assigneeIds).toEqual([truck.body.id]);
  });

  it('rejects unknown assignee ids on event create', async () => {
    const { response, body } = await createEvent({
      assigneeIds: ['99999999-9999-4999-8999-999999999999']
    });

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate assignee ids on event create', async () => {
    const crew = await createAssignee({ name: 'Install Crew 1', assigneeType: 'crew' });

    const { response, body } = await createEvent({
      assigneeIds: [crew.body.id, crew.body.id]
    });

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
