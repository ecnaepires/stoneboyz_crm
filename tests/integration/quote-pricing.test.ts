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

  // Full schema reset — drift-proof against tables added by other modules.
  // Migrations recreate everything (including `CREATE EXTENSION IF NOT EXISTS pgcrypto`).
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

const drawingUrl = (quoteId: string, areaId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${areasUrl(quoteId, customerId)}/${areaId}/drawing`;

const saveDrawing = async (quoteId: string, areaId: string, layout: unknown): Promise<Response> =>
  fetch(drawingUrl(quoteId, areaId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ layout })
  });

const PIECE_A = '00000000-0000-4000-8000-0000000000a1';
const PIECE_B = '00000000-0000-4000-8000-0000000000a2';
const SINK_A = '00000000-0000-4000-8000-0000000000b1';

// A rectangle modelled as two abutting horizontal halves (schema requires >=2 chain segments).
const twoSegRect = (lengthIn: number, widthIn: number) => {
  const half = lengthIn / 2;
  const scale = 3;
  return {
    type: 'chain',
    segments: [
      { x: 0, y: 0, w: half * scale, h: widthIn * scale, lengthIn: half, widthIn, orientation: 'horizontal' },
      { x: half * scale, y: 0, w: half * scale, h: widthIn * scale, lengthIn: half, widthIn, orientation: 'horizontal' }
    ]
  };
};

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
  // The drawing is the single source of truth (ADR 0003): seed totals by saving a
  // layout. Sink run + island counters, one splash edge, one plain finished edge,
  // one sink with one faucet hole.
  const layout = {
    pieces: [
      { pieceId: PIECE_A, x: 0, y: 0, rotation: 0, kind: 'countertop', shape: twoSegRect(100, 25.5) },
      { pieceId: PIECE_B, x: 0, y: 0, rotation: 0, kind: 'countertop', shape: twoSegRect(72, 36) }
    ],
    edges: [
      { pieceId: PIECE_A, edge: 'top', treatment: 'splash', splashHeightIn: 4 },
      { pieceId: PIECE_B, edge: 'top', treatment: 'finished' }
    ],
    sinks: [
      { sinkId: SINK_A, pieceId: PIECE_A, x: 0, y: 0, rotation: 0, quantity: 1, faucetHoleCount: 1 }
    ]
  };
  const saved = await saveDrawing(quoteId, areaId, layout);
  expect(saved.status).toBe(201);
};

const lineTotalsByCategory = (lines: Array<Record<string, unknown>>): Record<string, unknown> =>
  Object.fromEntries(lines.map((line) => [line['category'], line['lineTotalCents']]));

const expectGoldenLines = (lines: Array<Record<string, unknown>>): void => {
  expect(lines).toHaveLength(6);
  const totals = lineTotalsByCategory(lines);

  // Layout-derived totals (rounded to 3 dp by the domain) priced at the configured rates:
  // combinedSqFt 35.708 -> material 35.708*2000, fabrication 35.708*1500;
  // finishedEdgeLinFt 15 (splash outline 100+2*4 + island 72 = 180in/12) -> 15*800;
  // splashSqFt 2.778 -> 2.778*1200; sink 1 -> 15000; faucet 1 -> 5000.
  expect(totals['material']).toBe(71416);
  expect(totals['fabrication']).toBe(53562);
  expect(totals['finished_edge']).toBe(12000);
  expect(totals['splash']).toBe(3334);
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
      quantity: 15,
      unit: 'linft',
      lineTotalCents: Math.round(15 * 2000)
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
