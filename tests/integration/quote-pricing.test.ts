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

  await pool.query('DROP TABLE IF EXISTS generated_price_lines CASCADE;');
  await pool.query('DROP TABLE IF EXISTS sink_cutouts CASCADE;');
  await pool.query('DROP TABLE IF EXISTS edge_segments CASCADE;');
  await pool.query('DROP TABLE IF EXISTS counter_pieces CASCADE;');
  await pool.query('DROP TABLE IF EXISTS price_list_items CASCADE;');
  await pool.query('DROP TABLE IF EXISTS price_lists CASCADE;');
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
let quoteId: string;
let areaId: string;
let priceListId: string;

const quotesUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/quotes`;

const areasUrl = (quoteId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${quotesUrl(customerId)}/${quoteId}/areas`;

const measurementsUrl = (
  quoteId: string,
  areaId: string,
  kind: 'pieces' | 'edges' | 'sinks',
  customerId = SEEDED_CUSTOMER_ID
): string => `${areasUrl(quoteId, customerId)}/${areaId}/${kind}`;

const pricingUrl = (quoteId: string, areaId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/quotes/${quoteId}/areas/${areaId}/pricing`;

const priceListsUrl = (): string => `${baseUrl}/api/v1/price-lists`;
const priceListUrl = (priceListId: string): string => `${priceListsUrl()}/${priceListId}`;
const itemsUrl = (priceListId: string): string => `${priceListUrl(priceListId)}/items`;

const createQuote = async (customerId = SEEDED_CUSTOMER_ID): Promise<string> => {
  const res = await fetch(quotesUrl(customerId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, title: 'Kitchen countertop' })
  });
  const body = await res.json() as Record<string, unknown>;
  return body['id'] as string;
};

const createArea = async (
  quoteId: string,
  overrides: Record<string, unknown> = {}
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(areasUrl(quoteId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      name: 'Island',
      ...overrides
    })
  });
  return { response, body: await response.json() as Record<string, unknown> };
};

const createPriceList = async (): Promise<string> => {
  const response = await fetch(priceListsUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      name: 'Contractor Standard',
      description: 'Default contractor pricing',
      defaultTaxRateBps: 700,
      defaultPaymentTerms: 'Due on receipt',
      expirationDays: 30
    })
  });
  const body = await response.json() as Record<string, unknown>;
  return body['id'] as string;
};

const createPriceListItem = async (
  priceListId: string,
  category: string,
  priceCents: number,
  overrides: Record<string, unknown> = {}
): Promise<Record<string, unknown>> => {
  const response = await fetch(itemsUrl(priceListId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      category,
      itemType: category,
      name: category,
      unit: 'ea',
      priceCents,
      ...overrides
    })
  });

  return await response.json() as Record<string, unknown>;
};

const setQuotePriceList = async (quoteId: string, priceListId: string): Promise<void> => {
  await fetch(`${quotesUrl()}/${quoteId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, priceListId })
  });
};

const createGoldenMeasurements = async (quoteId: string, areaId: string): Promise<void> => {
  await fetch(measurementsUrl(quoteId, areaId, 'pieces'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Sink run', lengthIn: 100, widthIn: 25.5, quantity: 1 })
  });
  await fetch(measurementsUrl(quoteId, areaId, 'pieces'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Island', lengthIn: 72, widthIn: 36, quantity: 1 })
  });
  await fetch(measurementsUrl(quoteId, areaId, 'edges'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lengthIn: 100, treatment: 'finished', splashHeightIn: 4 })
  });
  await fetch(measurementsUrl(quoteId, areaId, 'edges'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ lengthIn: 72, treatment: 'finished' })
  });
  await fetch(measurementsUrl(quoteId, areaId, 'sinks'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sinkType: 'undermount',
      shape: 'rectangle',
      cutoutLengthIn: 30,
      cutoutWidthIn: 18,
      faucetHoleCount: 1,
      quantity: 1
    })
  });
};

const lineTotalsByCategory = (lines: Array<Record<string, unknown>>): Record<string, unknown> =>
  Object.fromEntries(lines.map((line) => [line['category'], line['lineTotalCents']]));

const expectGoldenLines = (lines: Array<Record<string, unknown>>): void => {
  expect(lines).toHaveLength(6);
  const totals = lineTotalsByCategory(lines);

  expect(totals['material']).toBe(71417);
  expect(totals['fabrication']).toBe(53563);
  expect(totals['finished_edge']).toBe(11467);
  expect(totals['splash']).toBe(3333);
  expect(totals['sink_cutout']).toBe(15000);
  expect(totals['faucet_hole']).toBe(5000);
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

  quoteId = await createQuote();
  const { body: area } = await createArea(quoteId);
  areaId = area['id'] as string;
  priceListId = await createPriceList();
  await createPriceListItem(priceListId, 'material', 2000);
  await createPriceListItem(priceListId, 'fabrication', 1500);
  await createPriceListItem(priceListId, 'finished_edge', 800);
  await createPriceListItem(priceListId, 'splash', 1200);
  await createPriceListItem(priceListId, 'sink_cutout', 15000);
  await createPriceListItem(priceListId, 'faucet_hole', 5000);
  await setQuotePriceList(quoteId, priceListId);
  await createGoldenMeasurements(quoteId, areaId);
});

describe('Quote pricing generate and list', () => {
  it('generates and persists the expected golden pricing lines', async () => {
    const generateRes = await fetch(`${pricingUrl(quoteId, areaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });
    const generateBody = await generateRes.json() as { data: Array<Record<string, unknown>> };

    expect(generateRes.status).toBe(200);
    expectGoldenLines(generateBody.data);

    const listRes = await fetch(pricingUrl(quoteId, areaId));
    const listBody = await listRes.json() as { data: Array<Record<string, unknown>> };

    expect(listRes.status).toBe(200);
    expectGoldenLines(listBody.data);
  });

  it('generates pricing idempotently without duplicates', async () => {
    await fetch(`${pricingUrl(quoteId, areaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });
    const secondRes = await fetch(`${pricingUrl(quoteId, areaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });
    const secondBody = await secondRes.json() as { data: Array<Record<string, unknown>> };

    expect(secondRes.status).toBe(200);
    expectGoldenLines(secondBody.data);

    const listBody = await (await fetch(pricingUrl(quoteId, areaId))).json() as { data: Array<Record<string, unknown>> };
    expectGoldenLines(listBody.data);
  });

  it('returns empty pricing lines when a quote has no price list', async () => {
    const freshQuoteId = await createQuote();
    const { body: freshArea } = await createArea(freshQuoteId);
    const freshAreaId = freshArea['id'] as string;
    await createGoldenMeasurements(freshQuoteId, freshAreaId);

    const response = await fetch(`${pricingUrl(freshQuoteId, freshAreaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });
    const body = await response.json() as { data: unknown[] };

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('uses the price list item measurement basis when generating lines', async () => {
    const customPriceListId = await createPriceList();
    await createPriceListItem(customPriceListId, 'material', 2000, {
      unit: 'linft',
      chargeMethod: 'linear_foot',
      measurementBasis: 'finished_edge_linft'
    });
    await setQuotePriceList(quoteId, customPriceListId);

    const response = await fetch(`${pricingUrl(quoteId, areaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });
    const body = await response.json() as { data: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      category: 'material',
      quantity: 14.333333333333334,
      unit: 'linft',
      lineTotalCents: Math.round(14.333333333333334 * 2000)
    });
  });
});

describe('Quote pricing overrides', () => {
  it('overrides and clears a generated pricing line override', async () => {
    const generateBody = await (await fetch(`${pricingUrl(quoteId, areaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    })).json() as { data: Array<Record<string, unknown>> };
    const lineId = generateBody.data[0]?.['id'] as string;

    const overrideRes = await fetch(`${pricingUrl(quoteId, areaId)}/${lineId}/override`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ overridePriceCents: 50000, overrideReason: 'Special deal' })
    });
    const overrideBody = await overrideRes.json() as Record<string, unknown>;

    expect(overrideRes.status).toBe(200);
    expect(overrideBody['overridePriceCents']).toBe(50000);

    const clearRes = await fetch(`${pricingUrl(quoteId, areaId)}/${lineId}/override`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ overridePriceCents: null, overrideReason: null })
    });
    const clearBody = await clearRes.json() as Record<string, unknown>;

    expect(clearRes.status).toBe(200);
    expect(clearBody['overridePriceCents']).toBeNull();
  });

  it('returns 404 for missing generated pricing line override', async () => {
    const response = await fetch(`${pricingUrl(quoteId, areaId)}/${MISSING_ID}/override`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ overridePriceCents: 50000, overrideReason: 'Special deal' })
    });

    expect(response.status).toBe(404);
  });
});

describe('Quote pricing not found cases', () => {
  it('returns 404 for missing area', async () => {
    const response = await fetch(pricingUrl(quoteId, MISSING_ID));

    expect(response.status).toBe(404);
  });
});

describe('Quote pricing status rules', () => {
  it('rejects pricing generation on non-draft quotes', async () => {
    await fetch(`${quotesUrl()}/${quoteId}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    const response = await fetch(`${pricingUrl(quoteId, areaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(body['code']).toBe('INVALID_QUOTE_STATUS');
  });
});
