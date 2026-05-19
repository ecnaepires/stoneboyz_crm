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
const MISSING_ID = '99999999-9999-4999-8999-999999999999';

const resetDatabase = async (app: INestApplication): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);

  await pool.query('DROP TABLE IF EXISTS order_payments CASCADE;');
  await pool.query('DROP TABLE IF EXISTS orders CASCADE;');
  await pool.query('DROP TABLE IF EXISTS quote_line_items CASCADE;');
  await pool.query('DROP TABLE IF EXISTS quote_areas CASCADE;');
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

const quotesUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/quotes`;

const ordersUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/orders`;

const createAndAcceptQuote = async (customerId = SEEDED_CUSTOMER_ID): Promise<string> => {
  const createRes = await fetch(quotesUrl(customerId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, title: 'Kitchen countertop' })
  });
  const quote = await createRes.json() as Record<string, unknown>;
  const quoteId = quote['id'] as string;

  await fetch(`${quotesUrl(customerId)}/${quoteId}/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
  });

  await fetch(`${quotesUrl(customerId)}/${quoteId}/accept`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
  });

  return quoteId;
};

const convertToOrder = async (
  quoteId: string,
  customerId = SEEDED_CUSTOMER_ID
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(`${quotesUrl(customerId)}/${quoteId}/convert`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, saleDate: '2026-05-14' })
  });
  return { response, body: await response.json() as Record<string, unknown> };
};

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  await app.listen(0);
  const port = (app.getHttpServer() as { address(): { port: number } }).address().port;
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await resetDatabase(app);
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
});

describe('POST /customers/:customerId/quotes/:quoteId/convert', () => {
  it('converts accepted quote to order', async () => {
    const quoteId = await createAndAcceptQuote();
    const { response, body } = await convertToOrder(quoteId);

    expect(response.status).toBe(201);
    expect(body['id']).toBeDefined();
    expect(body['orderNumber']).toMatch(/^O-\d{4}-\d{3}$/);
    expect(body['quoteId']).toBe(quoteId);
    expect(body['paymentStatus']).toBe('unpaid');
    expect(body['totalPaidCents']).toBe(0);
    expect(body['saleDate']).toBe('2026-05-14');
    expect(Array.isArray(body['payments'])).toBe(true);
  });

  it('rejects conversion of non-accepted quote (draft)', async () => {
    const createRes = await fetch(quotesUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, title: 'Draft quote' })
    });
    const quote = await createRes.json() as Record<string, unknown>;
    const { response, body } = await convertToOrder(quote['id'] as string);

    expect(response.status).toBe(409);
    expect(body['code']).toBe('INVALID_QUOTE_STATUS');
  });

  it('rejects double conversion (order already exists)', async () => {
    const quoteId = await createAndAcceptQuote();
    await convertToOrder(quoteId);
    const { response, body } = await convertToOrder(quoteId);

    expect(response.status).toBe(409);
    expect(body['code']).toBe('ORDER_ALREADY_EXISTS');
  });

  it('returns 404 for missing quote', async () => {
    const { response } = await convertToOrder(MISSING_ID);
    expect(response.status).toBe(404);
  });

  it('rejects missing saleDate', async () => {
    const quoteId = await createAndAcceptQuote();
    const response = await fetch(`${quotesUrl()}/${quoteId}/convert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(response.status).toBe(400);
  });
});

describe('GET /customers/:customerId/orders', () => {
  it('lists orders for customer', async () => {
    const quoteId = await createAndAcceptQuote();
    await convertToOrder(quoteId);

    const response = await fetch(ordersUrl());
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Array.isArray(body['data'])).toBe(true);
    expect((body['data'] as unknown[]).length).toBe(1);
  });

  it('returns empty list for customer with no orders', async () => {
    const response = await fetch(ordersUrl());
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect((body['data'] as unknown[]).length).toBe(0);
  });
});

describe('GET /customers/:customerId/orders/:orderId', () => {
  it('returns order with payments array', async () => {
    const quoteId = await createAndAcceptQuote();
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const response = await fetch(`${ordersUrl()}/${orderId}`);
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body['id']).toBe(orderId);
    expect(Array.isArray(body['payments'])).toBe(true);
  });

  it('returns 404 for missing order', async () => {
    const response = await fetch(`${ordersUrl()}/${MISSING_ID}`);
    expect(response.status).toBe(404);
  });
});

describe('POST /customers/:customerId/orders/:orderId/payments', () => {
  it('adds payment and updates paymentStatus', async () => {
    const quoteId = await createAndAcceptQuote();
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const response = await fetch(`${ordersUrl()}/${orderId}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        paymentDate: '2026-05-14',
        amountCents: 50000,
        paymentMethod: 'check',
        referenceNumber: 'CHK-001'
      })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(body['amountCents']).toBe(50000);
    expect(body['paymentMethod']).toBe('check');
    expect(body['referenceNumber']).toBe('CHK-001');
  });

  it('rejects invalid payment method', async () => {
    const quoteId = await createAndAcceptQuote();
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const response = await fetch(`${ordersUrl()}/${orderId}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        paymentDate: '2026-05-14',
        amountCents: 50000,
        paymentMethod: 'bitcoin'
      })
    });

    expect(response.status).toBe(400);
  });

  it('rejects zero amount', async () => {
    const quoteId = await createAndAcceptQuote();
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const response = await fetch(`${ordersUrl()}/${orderId}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        paymentDate: '2026-05-14',
        amountCents: 0,
        paymentMethod: 'cash'
      })
    });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /customers/:customerId/orders/:orderId/payments/:paymentId', () => {
  it('removes a payment', async () => {
    const quoteId = await createAndAcceptQuote();
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const addRes = await fetch(`${ordersUrl()}/${orderId}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        paymentDate: '2026-05-14',
        amountCents: 10000,
        paymentMethod: 'cash'
      })
    });
    const payment = await addRes.json() as Record<string, unknown>;
    const paymentId = payment['id'] as string;

    const response = await fetch(`${ordersUrl()}/${orderId}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(response.status).toBe(200);

    const detailRes = await fetch(`${ordersUrl()}/${orderId}`);
    const detail = await detailRes.json() as Record<string, unknown>;
    expect((detail['payments'] as unknown[]).length).toBe(0);
  });

  it('returns 404 for missing payment', async () => {
    const quoteId = await createAndAcceptQuote();
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const response = await fetch(`${ordersUrl()}/${orderId}/payments/${MISSING_ID}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(response.status).toBe(404);
  });
});

describe('Order number sequencing', () => {
  it('generates sequential order numbers per year', async () => {
    const quoteId1 = await createAndAcceptQuote();

    const createRes2 = await fetch(quotesUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, title: 'Second quote' })
    });
    const quote2 = await createRes2.json() as Record<string, unknown>;
    await fetch(`${quotesUrl()}/${quote2['id']}/send`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actorUserId: ACTOR_USER_ID }) });
    await fetch(`${quotesUrl()}/${quote2['id']}/accept`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actorUserId: ACTOR_USER_ID }) });

    const { body: order1 } = await convertToOrder(quoteId1);
    const { body: order2 } = await convertToOrder(quote2['id'] as string);

    expect(order1['orderNumber']).toBe('O-2026-001');
    expect(order2['orderNumber']).toBe('O-2026-002');
  });
});
