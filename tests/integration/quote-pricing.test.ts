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

const pricingSelectionsUrl = (quoteId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/quotes/${quoteId}/pricing-selections`;

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
const slabsUrl = (): string => `${baseUrl}/api/v1/inventory/slabs`;
const slabUrl = (slabId: string): string => `${slabsUrl()}/${slabId}`;

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

const createSlab = async (overrides: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
  const response = await fetch(slabsUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      stoneType: 'Uba Tuba',
      finish: 'polished',
      qualityGrade: 'A',
      lengthIn: 120,
      widthIn: 60,
      thicknessCm: 3,
      costCents: 120000,
      ...overrides
    })
  });

  expect(response.status).toBe(201);
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
  it('moves an inventory material slab to negotiating when area pricing is saved', async () => {
    const material = await createPriceListItem(priceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const slab = await createSlab();

    const selectionResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id'],
            materialSource: 'inventory',
            materialSlabId: slab['id']
          }
        ]
      })
    });

    expect(selectionResponse.status).toBe(200);

    const slabResponse = await fetch(slabUrl(slab['id'] as string));
    const slabBody = await slabResponse.json() as Record<string, unknown>;
    expect(slabBody['status']).toBe('negotiating');

    const savedSelection = await (await fetch(pricingSelectionsUrl(quoteId))).json() as {
      areas: Array<Record<string, unknown>>;
    };
    expect(savedSelection.areas[0]).toMatchObject({
      areaId,
      materialItemId: material['id'],
      materialSource: 'inventory',
      materialSlabId: slab['id'],
      externalMaterialNote: null
    });
  });

  it('releases a negotiating slab when area pricing changes to external material', async () => {
    const material = await createPriceListItem(priceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const slab = await createSlab();

    const inventoryResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id'],
            materialSource: 'inventory',
            materialSlabId: slab['id']
          }
        ]
      })
    });
    expect(inventoryResponse.status).toBe(200);

    const externalResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id'],
            materialSource: 'external',
            materialSlabId: null,
            externalMaterialNote: 'MSI special order'
          }
        ]
      })
    });

    expect(externalResponse.status).toBe(200);

    const slabBody = await (await fetch(slabUrl(slab['id'] as string))).json() as Record<string, unknown>;
    expect(slabBody['status']).toBe('available');

    const savedSelection = await (await fetch(pricingSelectionsUrl(quoteId))).json() as {
      areas: Array<Record<string, unknown>>;
    };
    expect(savedSelection.areas[0]).toMatchObject({
      areaId,
      materialItemId: material['id'],
      materialSource: 'external',
      materialSlabId: null,
      externalMaterialNote: 'MSI special order'
    });
  });

  it('allows multiple quote areas to negotiate the same slab without releasing it early', async () => {
    const material = await createPriceListItem(priceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const slab = await createSlab();
    const { body: secondArea } = await createArea(quoteId, { name: 'Vanity' });
    const secondAreaId = secondArea['id'] as string;

    const firstAreaResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id'],
            materialSource: 'inventory',
            materialSlabId: slab['id']
          }
        ]
      })
    });
    expect(firstAreaResponse.status).toBe(200);

    const secondAreaResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId: secondAreaId,
            materialItemId: material['id'],
            materialSource: 'inventory',
            materialSlabId: slab['id']
          }
        ]
      })
    });
    expect(secondAreaResponse.status).toBe(200);

    const firstAreaExternalResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id'],
            materialSource: 'external',
            materialSlabId: null,
            externalMaterialNote: 'Customer may choose a special order'
          }
        ]
      })
    });
    expect(firstAreaExternalResponse.status).toBe(200);

    const slabBody = await (await fetch(slabUrl(slab['id'] as string))).json() as Record<string, unknown>;
    expect(slabBody['status']).toBe('negotiating');

    const savedSelection = await (await fetch(pricingSelectionsUrl(quoteId))).json() as {
      areas: Array<Record<string, unknown>>;
    };
    expect(savedSelection.areas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          areaId,
          materialSource: 'external',
          materialSlabId: null
        }),
        expect.objectContaining({
          areaId: secondAreaId,
          materialSource: 'inventory',
          materialSlabId: slab['id']
        })
      ])
    );
  });

  it('rejects negotiating a slab already negotiating on another quote', async () => {
    const material = await createPriceListItem(priceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const slab = await createSlab();
    const otherQuoteId = await createQuote();
    const { body: otherArea } = await createArea(otherQuoteId, { name: 'Kitchen' });
    const otherAreaId = otherArea['id'] as string;

    const firstQuoteResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id'],
            materialSource: 'inventory',
            materialSlabId: slab['id']
          }
        ]
      })
    });
    expect(firstQuoteResponse.status).toBe(200);

    const otherQuoteResponse = await fetch(pricingSelectionsUrl(otherQuoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId: otherAreaId,
            materialItemId: material['id'],
            materialSource: 'inventory',
            materialSlabId: slab['id']
          }
        ]
      })
    });
    const otherQuoteBody = await otherQuoteResponse.json() as Record<string, unknown>;

    expect(otherQuoteResponse.status).toBe(409);
    expect(otherQuoteBody).toMatchObject({
      code: 'SLAB_NOT_AVAILABLE',
      message: 'This Slab is already being negotiated on another quote. Pick another inventory Slab or use external material.'
    });
  });

  it('promotes negotiating slabs to reserved when a quote is accepted', async () => {
    const material = await createPriceListItem(priceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const slab = await createSlab();

    const selectionResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id'],
            materialSource: 'inventory',
            materialSlabId: slab['id']
          }
        ]
      })
    });
    expect(selectionResponse.status).toBe(200);

    const sendResponse = await fetch(`${quotesUrl()}/${quoteId}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(sendResponse.status).toBe(200);

    const acceptResponse = await fetch(`${quotesUrl()}/${quoteId}/accept`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(acceptResponse.status).toBe(200);

    const slabBody = await (await fetch(slabUrl(slab['id'] as string))).json() as Record<string, unknown>;
    expect(slabBody['status']).toBe('reserved');
  });

  it('releases negotiating slabs when a sent quote is rejected', async () => {
    const material = await createPriceListItem(priceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const slab = await createSlab();

    const selectionResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id'],
            materialSource: 'inventory',
            materialSlabId: slab['id']
          }
        ]
      })
    });
    expect(selectionResponse.status).toBe(200);

    const sendResponse = await fetch(`${quotesUrl()}/${quoteId}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(sendResponse.status).toBe(200);

    const rejectResponse = await fetch(`${quotesUrl()}/${quoteId}/reject`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(rejectResponse.status).toBe(200);

    const slabBody = await (await fetch(slabUrl(slab['id'] as string))).json() as Record<string, unknown>;
    expect(slabBody['status']).toBe('available');
  });

  it('returns empty pricing lines when an area has no selections', async () => {
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

  it('generates pricing from quote selections and drawing measurements', async () => {
    const catalogPriceListId = await createPriceList();
    const material = await createPriceListItem(catalogPriceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const fabrication = await createPriceListItem(catalogPriceListId, 'fabrication', 2000, {
      itemGroup: 'fabrication',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Retail Fabrication'
    });
    const edge = await createPriceListItem(catalogPriceListId, 'finished_edge', 1400, {
      itemGroup: 'edge',
      unit: 'linft',
      chargeMethod: 'linear_foot',
      measurementBasis: 'finished_edge_linft',
      name: 'Bullnose'
    });
    const splash = await createPriceListItem(catalogPriceListId, 'splash', 1200, {
      itemGroup: 'splash',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'splash_sqft',
      name: 'Standard Splash'
    });
    const sink = await createPriceListItem(catalogPriceListId, 'sink_item', 15000, {
      itemGroup: 'sink',
      unit: 'ea',
      chargeMethod: 'each',
      measurementBasis: 'sink_count',
      name: '70/30 Sink'
    });
    const faucet = await createPriceListItem(
      catalogPriceListId,
      "faucet_hole",
      2500,
      {
        itemGroup: "faucet_hole",
        unit: "ea",
        chargeMethod: "each",
        measurementBasis: "faucet_hole_count",
        name: "Faucet Hole",
      },
    );

    const selectionResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        defaultFabricationItemId: fabrication["id"],
        areas: [
          {
            areaId,
            materialItemId: material["id"],
            edgeItemId: edge["id"],
            splashItemId: splash["id"],
            sinkItemId: sink["id"],
            faucetHoleItemId: faucet["id"],
          },
        ],
      }),
    });

    expect(selectionResponse.status).toBe(200);

    const response = await fetch(`${pricingUrl(quoteId, areaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });
    const body = await response.json() as { data: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(
      body.data.map((line) => [
        line["category"],
        line["label"],
        line["quantity"],
        line["lineTotalCents"],
      ]),
    ).toEqual([
      ["material", "Uba Tuba", 35.708, Math.round(35.708 * 1800)],
      ["fabrication", "Retail Fabrication", 35.708, Math.round(35.708 * 2000)],
      ["finished_edge", "Bullnose", 15, Math.round(15 * 1400)],
      ["splash", "Standard Splash", 2.778, Math.round(2.778 * 1200)],
      ["sink_item", "70/30 Sink", 1, 15000],
      ["faucet_hole", "Faucet Hole", 1, 2500],
    ]);
  });
});

describe('Quote pricing overrides', () => {
  it('overrides and clears a generated pricing line override', async () => {
    const material = await createPriceListItem(priceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const selectionResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id']
          }
        ]
      })
    });
    expect(selectionResponse.status).toBe(200);

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

    const overriddenQuote = await (await fetch(`${quotesUrl()}/${quoteId}`)).json() as {
      subtotalCents: number;
      totalCents: number;
      areas: Array<Record<string, unknown>>;
    };
    expect(overriddenQuote.subtotalCents).toBe(50000);
    expect(overriddenQuote.totalCents).toBe(50000);
    expect(overriddenQuote.areas.find((area) => area['id'] === areaId)?.['subtotalCents']).toBe(50000);

    const clearRes = await fetch(`${pricingUrl(quoteId, areaId)}/${lineId}/override`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ overridePriceCents: null, overrideReason: null })
    });
    const clearBody = await clearRes.json() as Record<string, unknown>;

    expect(clearRes.status).toBe(200);
    expect(clearBody['overridePriceCents']).toBeNull();

    const clearedQuote = await (await fetch(`${quotesUrl()}/${quoteId}`)).json() as {
      subtotalCents: number;
      areas: Array<Record<string, unknown>>;
    };
    const generatedMaterialTotal = Math.round(35.708 * 1800);
    expect(clearedQuote.subtotalCents).toBe(generatedMaterialTotal);
    expect(clearedQuote.areas.find((area) => area['id'] === areaId)?.['subtotalCents']).toBe(generatedMaterialTotal);
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

  it('rejects pricing line overrides on non-draft quotes', async () => {
    const material = await createPriceListItem(priceListId, 'material', 1800, {
      itemGroup: 'material',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      name: 'Uba Tuba'
    });
    const selectionResponse = await fetch(pricingSelectionsUrl(quoteId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        areas: [
          {
            areaId,
            materialItemId: material['id']
          }
        ]
      })
    });
    expect(selectionResponse.status).toBe(200);

    const generateBody = await (await fetch(`${pricingUrl(quoteId, areaId)}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    })).json() as { data: Array<Record<string, unknown>> };
    const lineId = generateBody.data[0]?.['id'] as string;

    await fetch(`${quotesUrl()}/${quoteId}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    const response = await fetch(`${pricingUrl(quoteId, areaId)}/${lineId}/override`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ overridePriceCents: 50000, overrideReason: 'Special deal' })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(body['code']).toBe('INVALID_QUOTE_STATUS');
  });
});
