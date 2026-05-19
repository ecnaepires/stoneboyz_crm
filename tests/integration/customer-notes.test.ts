import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module.js';
import { DATABASE_POOL } from '../../apps/api/src/database.provider.js';
import { seedTestSession } from './helpers/auth.js';
import { setTestAuthToken } from './helpers/test-auth.js';

const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222';

interface CapturedEvent {
  name: string;
  payload: {
    eventId: string;
    occurredAt: string;
    version: number;
    data: Record<string, unknown>;
  };
}

const resetDatabase = async (app: INestApplication): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);

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
let captured: CapturedEvent[];

const createNote = async (
  body: Record<string, unknown>,
  customerId = SEEDED_CUSTOMER_ID
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      body: 'Initial customer note',
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

describe('customer notes', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    await resetDatabase(app);
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);

    const emitter = app.get(EventEmitter2);
    captured = [];
    emitter.onAny((name, payload) => captured.push({ name: String(name), payload }));
  });

  beforeEach(async () => {
    captured.length = 0;
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('lists empty notes', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/notes`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('creates a note and emits customer.note_created', async () => {
    const { response, body } = await createNote({ body: 'Measure twice before install' });

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      authorUserId: ACTOR_USER_ID,
      body: 'Measure twice before install',
      archivedAt: null
    });
    expect(captured.map((event) => event.name)).toEqual(['customer.note_created']);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      noteId: body.id,
      actorUserId: ACTOR_USER_ID
    });
  });

  it('lists created notes newest first', async () => {
    const first = await createNote({ body: 'First note' });
    const second = await createNote({ body: 'Second note' });

    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/notes`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((note: { id: string }) => note.id)).toEqual([second.body.id, first.body.id]);
  });

  it('returns 400 for bad customer UUID', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/not-a-uuid/notes`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
  });

  it('returns 404 when creating for a missing customer', async () => {
    const { response, body } = await createNote({}, '99999999-9999-4999-8999-999999999999');

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Customer not found');
  });

  it('returns 400 for empty body', async () => {
    const { response, body } = await createNote({ body: '' });

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
  });

  it('updates body and emits customer.note_updated', async () => {
    const created = await createNote({ body: 'Before' });
    captured.length = 0;

    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/notes/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        body: 'After'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.body).toBe('After');
    expect(captured.map((event) => event.name)).toEqual(['customer.note_updated']);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      noteId: created.body.id,
      actorUserId: ACTOR_USER_ID,
      changedFields: ['body']
    });
  });

  it('returns 404 when updating a nonexistent note', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/notes/99999999-9999-4999-8999-999999999999`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actorUserId: ACTOR_USER_ID,
          body: 'Missing note'
        })
      }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Customer note not found');
  });

  it('soft-deletes a note, hides it from list, and emits archive event', async () => {
    const created = await createNote({ body: 'Archive me' });
    captured.length = 0;

    const archiveResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/notes/${created.body.id}`,
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
      }
    );
    const archived = await archiveResponse.json();

    expect(archiveResponse.status).toBe(200);
    expect(archived.archivedAt).toEqual(expect.any(String));
    expect(captured.map((event) => event.name)).toEqual(['customer.note_archived']);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      noteId: created.body.id,
      actorUserId: ACTOR_USER_ID
    });

    const listResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/notes`);
    const listBody = await listResponse.json();
    expect(listBody.data.some((note: { id: string }) => note.id === created.body.id)).toBe(false);
  });

  it('returns 404 when archiving a nonexistent note', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/notes/99999999-9999-4999-8999-999999999999`,
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
      }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Customer note not found');
  });

});
