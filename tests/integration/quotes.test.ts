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

const quotesUrl = (customerId = SEEDED_CUSTOMER_ID): string => `${baseUrl}/api/v1/customers/${customerId}/quotes`;

const createQuote = async (
  body: Record<string, unknown> = {},
  customerId = SEEDED_CUSTOMER_ID
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(quotesUrl(customerId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      title: 'Kitchen countertop proposal',
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

const addLineItem = async (
  quoteId: string,
  body: Record<string, unknown> = {}
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(`${quotesUrl()}/${quoteId}/line-items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      stoneType: 'Marble Calacatta',
      qty: 2,
      qtyUnit: 'sqm',
      unitPriceCents: 500,
      laborPriceCents: 100,
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

const transitionQuote = async (
  quoteId: string,
  action: 'send' | 'accept' | 'reject' | 'archive'
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(`${quotesUrl()}/${quoteId}/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

describe('quotes', () => {
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
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('creates a quote with a generated quote number', async () => {
    const { response, body } = await createQuote();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      title: 'Kitchen countertop proposal',
      status: 'draft',
      subtotalCents: 0,
      totalCents: 0,
      lineItems: []
    });
    expect(body.quoteNumber).toMatch(/^Q-\d{4}-\d{3}$/);
  });

  it('lists quotes for a customer', async () => {
    await createQuote({ title: 'First quote' });

    const response = await fetch(quotesUrl());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.hasMore).toBe(false);
  });

  it('gets a quote by id with embedded line items and computed subtotal', async () => {
    const created = await createQuote();
    await addLineItem(created.body.id as string);

    const response = await fetch(`${quotesUrl()}/${created.body.id}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.lineItems).toHaveLength(1);
    expect(body.lineItems[0].lineTotalCents).toBe(1200);
    expect(body.subtotalCents).toBe(1200);
    expect(body.totalCents).toBe(1200);
  });

  it('updates a draft quote', async () => {
    const created = await createQuote();

    const response = await fetch(`${quotesUrl()}/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        title: 'Updated quote title',
        taxRateBps: 1500
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe('Updated quote title');
    expect(body.taxRateBps).toBe(1500);
  });

  it('sends a quote', async () => {
    const created = await createQuote();
    const { response, body } = await transitionQuote(created.body.id as string, 'send');

    expect(response.status).toBe(200);
    expect(body.status).toBe('sent');
    expect(body.sentAt).toEqual(expect.any(String));
  });

  it('accepts a sent quote', async () => {
    const created = await createQuote();
    await transitionQuote(created.body.id as string, 'send');

    const { response, body } = await transitionQuote(created.body.id as string, 'accept');

    expect(response.status).toBe(200);
    expect(body.status).toBe('accepted');
    expect(body.acceptedAt).toEqual(expect.any(String));
  });

  it('rejects a sent quote', async () => {
    const created = await createQuote();
    await transitionQuote(created.body.id as string, 'send');

    const { response, body } = await transitionQuote(created.body.id as string, 'reject');

    expect(response.status).toBe(200);
    expect(body.status).toBe('rejected');
    expect(body.rejectedAt).toEqual(expect.any(String));
  });

  it('returns 409 for invalid transition when accepting a draft quote', async () => {
    const created = await createQuote();
    const { response, body } = await transitionQuote(created.body.id as string, 'accept');

    expect(response.status).toBe(409);
    expect(body.code).toBe('INVALID_QUOTE_STATUS');
  });

  it('archives a quote', async () => {
    const created = await createQuote();
    const { response, body } = await transitionQuote(created.body.id as string, 'archive');

    expect(response.status).toBe(200);
    expect(body.archivedAt).toEqual(expect.any(String));
    expect(body.archivedByUserId).toBe(ACTOR_USER_ID);
  });

  it('adds a line item with computed line total', async () => {
    const created = await createQuote();
    const { response, body } = await addLineItem(created.body.id as string);

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      quoteId: created.body.id,
      stoneType: 'Marble Calacatta',
      qty: 2,
      unitPriceCents: 500,
      laborPriceCents: 100,
      lineTotalCents: 1200
    });
  });

  it('updates a line item', async () => {
    const created = await createQuote();
    const lineItem = await addLineItem(created.body.id as string);

    const response = await fetch(`${quotesUrl()}/${created.body.id}/line-items/${lineItem.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        qty: 3,
        laborPriceCents: 200
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.qty).toBe(3);
    expect(body.lineTotalCents).toBe(2100);
  });

  it('removes a line item', async () => {
    const created = await createQuote();
    const lineItem = await addLineItem(created.body.id as string);

    const response = await fetch(`${quotesUrl()}/${created.body.id}/line-items/${lineItem.body.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(lineItem.body.id);
  });

  it('returns 409 when editing a non-draft quote', async () => {
    const created = await createQuote();
    await transitionQuote(created.body.id as string, 'send');

    const response = await fetch(`${quotesUrl()}/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        title: 'Cannot update sent quote'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('INVALID_QUOTE_STATUS');
  });

  it('returns 404 for a missing quote', async () => {
    const response = await fetch(`${quotesUrl()}/${MISSING_ID}`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Quote not found');
  });

  it('creates a quote with a priceListId', async () => {
    const pool = app.get<Pool>(DATABASE_POOL);
    const PRICE_LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await pool.query(
      `INSERT INTO price_lists (id, name, created_by_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [PRICE_LIST_ID, 'Test Price List', ACTOR_USER_ID]
    );

    const { response, body } = await createQuote({ priceListId: PRICE_LIST_ID });

    expect(response.status).toBe(201);
    expect(body.priceListId).toBe(PRICE_LIST_ID);
  });

  it('creates a quote without priceListId and defaults to null', async () => {
    const { response, body } = await createQuote();

    expect(response.status).toBe(201);
    expect(body.priceListId).toBeNull();
  });

  it('updates quote to set priceListId', async () => {
    const pool = app.get<Pool>(DATABASE_POOL);
    const PRICE_LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await pool.query(
      `INSERT INTO price_lists (id, name, created_by_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [PRICE_LIST_ID, 'Test Price List', ACTOR_USER_ID]
    );

    const created = await createQuote();

    const response = await fetch(`${quotesUrl()}/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        priceListId: PRICE_LIST_ID
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.priceListId).toBe(PRICE_LIST_ID);
  });

  it('updates quote to clear priceListId', async () => {
    const pool = app.get<Pool>(DATABASE_POOL);
    const PRICE_LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await pool.query(
      `INSERT INTO price_lists (id, name, created_by_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [PRICE_LIST_ID, 'Test Price List', ACTOR_USER_ID]
    );

    const created = await createQuote({ priceListId: PRICE_LIST_ID });

    const response = await fetch(`${quotesUrl()}/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        priceListId: null
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.priceListId).toBeNull();
  });

  it('returns 404 when creating a quote with a nonexistent priceListId', async () => {
    const { response } = await createQuote({ priceListId: MISSING_ID });

    expect(response.status).toBe(404);
  });
});
