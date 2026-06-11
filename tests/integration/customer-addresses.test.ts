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

const resetAddresses = async (app: INestApplication): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);
  await pool.query('DELETE FROM customer_addresses WHERE customer_id = $1', [SEEDED_CUSTOMER_ID]);
};

let app: INestApplication;
let baseUrl: string;
let captured: CapturedEvent[];

const createAddress = async (
  body: Record<string, unknown>,
  customerId = SEEDED_CUSTOMER_ID
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/addresses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      type: 'shipping',
      line1: '100 Main St',
      city: 'Austin',
      country: 'US',
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

describe('customer addresses', () => {
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
    await resetAddresses(app);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('lists empty addresses', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('creates an address and emits customer.address_created', async () => {
    const { response, body } = await createAddress({ line1: '200 Quarry Rd' });

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      type: 'shipping',
      line1: '200 Quarry Rd',
      isPrimary: false,
      isBilling: false
    });
    expect(captured.map((event) => event.name)).toEqual(['customer.address_created']);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      addressId: body.id,
      actorUserId: ACTOR_USER_ID
    });
  });

  it('creates a billing address and emits billing change', async () => {
    const { response, body } = await createAddress({ type: 'billing', isBilling: true });

    expect(response.status).toBe(201);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.address_created',
      'customer.billing_address_changed'
    ]);
    expect(captured[1]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      addressId: body.id,
      actorUserId: ACTOR_USER_ID
    });
  });

  it('lists created addresses in primary-first order', async () => {
    const first = await createAddress({ type: 'shipping', line1: 'First' });
    const second = await createAddress({ type: 'billing', line1: 'Second', isPrimary: true });

    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((address: { id: string }) => address.id)).toEqual([second.body.id, first.body.id]);
  });

  it('returns 400 for bad customer UUID', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/not-a-uuid/addresses`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
  });

  it('returns 404 when creating for a missing customer', async () => {
    const { response, body } = await createAddress({}, '99999999-9999-4999-8999-999999999999');

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Customer not found');
  });

  it('updates line2 and emits changedFields', async () => {
    const created = await createAddress({});
    captured.length = 0;

    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        line2: 'Suite 3'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.line2).toBe('Suite 3');
    expect(captured.map((event) => event.name)).toEqual(['customer.address_updated']);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      addressId: created.body.id,
      actorUserId: ACTOR_USER_ID,
      changedFields: ['line2']
    });
  });

  it('emits billing change when isBilling flips false to true', async () => {
    const created = await createAddress({});
    captured.length = 0;

    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        isBilling: true
      })
    });

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.address_updated',
      'customer.billing_address_changed'
    ]);
  });

  it('soft-deletes an address, hides it from list, and emits archive event', async () => {
    const created = await createAddress({});
    captured.length = 0;

    const archiveResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses/${created.body.id}`,
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
      }
    );
    const archived = await archiveResponse.json();

    expect(archiveResponse.status).toBe(200);
    expect(archived.archivedAt).toEqual(expect.any(String));
    expect(captured.map((event) => event.name)).toEqual(['customer.address_archived']);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      addressId: created.body.id,
      actorUserId: ACTOR_USER_ID
    });

    const listResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses`);
    const listBody = await listResponse.json();
    expect(listBody.data.some((address: { id: string }) => address.id === created.body.id)).toBe(false);
  });

  it('make-billing switches billing flag between two addresses', async () => {
    const first = await createAddress({ type: 'billing', isBilling: true, line1: 'Billing One' });
    const second = await createAddress({ type: 'shipping', line1: 'Billing Two' });
    captured.length = 0;

    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses/${second.body.id}/make-billing`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
      }
    );

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual(['customer.billing_address_changed']);

    const listResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses`);
    const listBody = await listResponse.json();
    const addresses = listBody.data as Array<{ id: string; isBilling: boolean }>;
    expect(addresses.find((address) => address.id === first.body.id)?.isBilling).toBe(false);
    expect(addresses.find((address) => address.id === second.body.id)?.isBilling).toBe(true);
  });

  it('returns 409 for duplicate primary address per type', async () => {
    await createAddress({ type: 'shipping', isPrimary: true });

    const { response, body } = await createAddress({ type: 'shipping', isPrimary: true, line1: 'Duplicate' });

    expect(response.status).toBe(409);
    expect(body.code).toBe('CONFLICT');
    expect(body.message).toBe('Address conflicts with an existing active address rule');
  });
});
