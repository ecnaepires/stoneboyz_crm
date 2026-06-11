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

  // Full schema reset — drift-proof against tables added by other modules.
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

const dashboardUrl = (): string => `${baseUrl}/api/v1/dashboard`;
const quotesUrl = (): string => `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/quotes`;

const assertOk = async (response: Response, context: string): Promise<void> => {
  if (response.ok) return;

  const body = await response.text();
  throw new Error(`${context} failed with ${response.status}: ${body}`);
};

const createQuote = async (): Promise<string> => {
  const response = await fetch(quotesUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, title: 'Kitchen countertop proposal' })
  });
  await assertOk(response, 'Create quote');

  const body = (await response.json()) as Record<string, unknown>;
  return body['id'] as string;
};

const addLineItem = async (quoteId: string): Promise<void> => {
  const response = await fetch(`${quotesUrl()}/${quoteId}/line-items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      stoneType: 'Marble Calacatta',
      qty: 2,
      qtyUnit: 'sqm',
      unitPriceCents: 500,
      laborPriceCents: 100
    })
  });
  await assertOk(response, 'Add quote line item');
};

const sendQuote = async (quoteId: string): Promise<void> => {
  const response = await fetch(`${quotesUrl()}/${quoteId}/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
  });
  await assertOk(response, 'Send quote');
};

const getDashboard = async (): Promise<Record<string, unknown>> => {
  const response = await fetch(dashboardUrl());
  expect(response.status).toBe(200);
  return (await response.json()) as Record<string, unknown>;
};

describe('dashboard', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    baseUrl = await app.getUrl();
    await resetDatabase(app);
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  beforeEach(async () => {
    // Full-schema reset drops the auth tables too, so re-seed the session each time.
    await resetDatabase(app);
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the full dashboard shape with empty data', async () => {
    const body = await getDashboard();

    expect(body['pipeline']).toEqual({ draft: 0, sent: 0, accepted: 0, rejected: 0 });
    expect(body['recentQuotes']).toEqual([]);

    const revenueSeries = body['revenueSeries'] as Array<Record<string, unknown>>;
    expect(revenueSeries).toHaveLength(6);
    for (const point of revenueSeries) {
      expect(point).toHaveProperty('month');
      expect(point['quotesCents']).toBe(0);
      expect(point['ordersCents']).toBe(0);
    }
    // months are ordered oldest first
    const months = revenueSeries.map((point) => point['month'] as string);
    expect([...months].sort()).toEqual(months);
  });

  it('computes pipeline counts, quote value, and current-month revenue', async () => {
    const quoteId = await createQuote();
    await addLineItem(quoteId);
    await sendQuote(quoteId);

    const body = await getDashboard();

    // qty 2 × (unit 500 + labor 100), tax 0, discount 0 → 1200 cents
    const recentQuotes = body['recentQuotes'] as Array<Record<string, unknown>>;
    expect(recentQuotes).toHaveLength(1);
    expect(recentQuotes[0]?.['valueCents']).toBe(1200);
    expect(recentQuotes[0]?.['status']).toBe('sent');

    expect(body['pipeline']).toEqual({ draft: 0, sent: 1, accepted: 0, rejected: 0 });

    // the quote was created this month → last revenue point carries its value
    const revenueSeries = body['revenueSeries'] as Array<Record<string, unknown>>;
    expect(revenueSeries[revenueSeries.length - 1]?.['quotesCents']).toBe(1200);
  });
});
