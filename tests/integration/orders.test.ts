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

const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222';
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

const quotesUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/quotes`;

const ordersUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/orders`;

const createProject = async (title = 'Deposit Pipeline Job'): Promise<Record<string, unknown>> => {
  const jobTemplateId = await getDefaultJobTemplateId(baseUrl);
  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerId: SEEDED_CUSTOMER_ID,
      title,
      jobTemplateId,
      ownerUserId: ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createPhase = async (projectId: string, name = 'Kitchen'): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${projectId}/phases`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, name })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createAndAcceptQuote = async (
  customerId = SEEDED_CUSTOMER_ID,
  options: { projectId?: string; phaseId?: string } = {}
): Promise<string> => {
  const createRes = await fetch(quotesUrl(customerId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      title: 'Kitchen countertop',
      ...(options.projectId ? { projectId: options.projectId } : {}),
      ...(options.phaseId ? { phaseId: options.phaseId } : {}),
      lineItems: [
        {
          stoneType: 'Granite',
          qty: 1,
          qtyUnit: 'each',
          unitPriceCents: 100000
        }
      ]
    })
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

const getProject = async (projectId: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}`);
  expect(response.status).toBe(200);
  return await response.json() as Record<string, unknown>;
};

const getChecklist = async (projectId: string, phaseId: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${projectId}/phases/${phaseId}/checklist`);
  expect(response.status).toBe(200);
  return await response.json() as Record<string, unknown>;
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
    expect(body['depositStatus']).toBe('not_requested');
    expect(body['depositRequiredCents']).toBe(0);
    expect(body['depositPaidCents']).toBe(0);
    expect(body['depositBalanceCents']).toBe(0);
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
    expect(body['status']).toBe('recorded');
    expect(body['referenceNumber']).toBe('CHK-001');

    const detailRes = await fetch(`${ordersUrl()}/${orderId}`);
    const detail = await detailRes.json() as Record<string, unknown>;
    expect(detail['totalPaidCents']).toBe(50000);
    expect(detail['balanceDueCents']).toBe(50000);
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

  it('rejects a payment greater than the balance due', async () => {
    const quoteId = await createAndAcceptQuote();
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const response = await fetch(`${ordersUrl()}/${orderId}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        paymentDate: '2026-05-14',
        amountCents: 100001,
        paymentMethod: 'cash'
      })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(body['code']).toBe('PAYMENT_EXCEEDS_BALANCE');
  });
});

describe('POST /customers/:customerId/orders/:orderId/deposit/request', () => {
  it('requests a manual deposit and satisfies the job checklist when payment is recorded', async () => {
    const project = await createProject();
    const projectId = project['id'] as string;
    const phase = await createPhase(projectId);
    const phaseId = phase['id'] as string;
    const quoteId = await createAndAcceptQuote(SEEDED_CUSTOMER_ID, { projectId, phaseId });
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const requestResponse = await fetch(`${ordersUrl()}/${orderId}/deposit/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        depositRequiredCents: 30000
      })
    });
    const requested = await requestResponse.json() as Record<string, unknown>;

    expect(requestResponse.status).toBe(200);
    expect(requested['depositRequiredCents']).toBe(30000);
    expect(requested['depositPaidCents']).toBe(0);
    expect(requested['depositBalanceCents']).toBe(30000);
    expect(requested['depositStatus']).toBe('requested');
    expect((await getProject(projectId))['pipelineStage']).toBe('deposit');
    expect((await getChecklist(projectId, phaseId))['depositReceived']).toBe(false);

    const addPaymentResponse = await fetch(`${ordersUrl()}/${orderId}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        paymentDate: '2026-05-14',
        amountCents: 30000,
        paymentMethod: 'cash'
      })
    });
    expect(addPaymentResponse.status).toBe(201);

    const paidResponse = await fetch(`${ordersUrl()}/${orderId}`);
    const paidOrder = await paidResponse.json() as Record<string, unknown>;
    expect(paidOrder['depositPaidCents']).toBe(30000);
    expect(paidOrder['depositBalanceCents']).toBe(0);
    expect(paidOrder['depositStatus']).toBe('paid');
    expect(paidOrder['totalPaidCents']).toBe(30000);
    expect((await getChecklist(projectId, phaseId))['depositReceived']).toBe(true);

    const payment = (paidOrder['payments'] as Array<Record<string, unknown>>)[0];
    const voidResponse = await fetch(`${ordersUrl()}/${orderId}/payments/${String(payment?.['id'])}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(voidResponse.status).toBe(200);

    const voidedResponse = await fetch(`${ordersUrl()}/${orderId}`);
    const voidedOrder = await voidedResponse.json() as Record<string, unknown>;
    expect(voidedOrder['depositPaidCents']).toBe(0);
    expect(voidedOrder['depositBalanceCents']).toBe(30000);
    expect(voidedOrder['depositStatus']).toBe('requested');
    expect(voidedOrder['totalPaidCents']).toBe(0);
    expect((await getChecklist(projectId, phaseId))['depositReceived']).toBe(false);
  });

  it('rejects a deposit greater than the order total', async () => {
    const quoteId = await createAndAcceptQuote();
    const { body: order } = await convertToOrder(quoteId);
    const orderId = order['id'] as string;

    const response = await fetch(`${ordersUrl()}/${orderId}/deposit/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        depositRequiredCents: 100001
      })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body['code']).toBe('DEPOSIT_EXCEEDS_ORDER_TOTAL');
  });
});

describe('DELETE /customers/:customerId/orders/:orderId/payments/:paymentId', () => {
  it('voids a payment and removes it from totals without deleting history', async () => {
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
      method: 'DELETE'
    });

    expect(response.status).toBe(200);
    const voidedPayment = await response.json() as Record<string, unknown>;
    expect(voidedPayment['status']).toBe('void');
    expect(voidedPayment['voidedByUserId']).toBe(ACTOR_USER_ID);

    const detailRes = await fetch(`${ordersUrl()}/${orderId}`);
    const detail = await detailRes.json() as Record<string, unknown>;
    const payments = detail['payments'] as Array<Record<string, unknown>>;
    expect(payments).toHaveLength(1);
    expect(payments[0]?.['status']).toBe('void');
    expect(detail['totalPaidCents']).toBe(0);
    expect(detail['balanceDueCents']).toBe(100000);
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
