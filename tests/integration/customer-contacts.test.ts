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
const SEEDED_PRIMARY_CONTACT_ID = '33333333-3333-4333-8333-333333333333';
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
let captured: CapturedEvent[];

const createContact = async (
  body: Record<string, unknown>,
  customerId = SEEDED_CUSTOMER_ID
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/contacts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      firstName: 'Contact',
      preferredChannel: 'email',
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

describe('customer contacts', () => {
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
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('make-primary switches primary flag between two contacts', async () => {
    const second = await createContact({ firstName: 'Primary Two', isPrimary: false });
    captured.length = 0;

    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/${second.body.id}/make-primary`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
      }
    );

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual(['customer.primary_contact_changed']);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      contactId: second.body.id,
      actorUserId: ACTOR_USER_ID
    });

    const listResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`);
    const listBody = await listResponse.json();
    const contacts = listBody.data as Array<{ id: string; isPrimary: boolean }>;
    expect(contacts.find((contact) => contact.id === SEEDED_PRIMARY_CONTACT_ID)?.isPrimary).toBe(false);
    expect(contacts.find((contact) => contact.id === second.body.id)?.isPrimary).toBe(true);
  });

  it('make-billing switches billing flag between two contacts', async () => {
    const first = await createContact({ firstName: 'Billing One', isBilling: true });
    const second = await createContact({ firstName: 'Billing Two', isBilling: false });
    captured.length = 0;

    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/${second.body.id}/make-billing`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
      }
    );

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual(['customer.billing_contact_changed']);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      contactId: second.body.id,
      actorUserId: ACTOR_USER_ID
    });

    const listResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`);
    const listBody = await listResponse.json();
    const contacts = listBody.data as Array<{ id: string; isBilling: boolean }>;
    expect(contacts.find((contact) => contact.id === first.body.id)?.isBilling).toBe(false);
    expect(contacts.find((contact) => contact.id === second.body.id)?.isBilling).toBe(true);
  });

  it('returns 404 when making a missing contact primary', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/99999999-9999-4999-8999-999999999999/make-primary`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
      }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });

  it('returns 404 when making a missing contact billing', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/99999999-9999-4999-8999-999999999999/make-billing`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
      }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });
});
