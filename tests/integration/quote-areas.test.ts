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

const quotesUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/quotes`;

const areasUrl = (quoteId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${quotesUrl(customerId)}/${quoteId}/areas`;

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

describe('POST /customers/:customerId/quotes/:quoteId/areas', () => {
  it('creates area on draft quote', async () => {
    const quoteId = await createQuote();
    const { response, body } = await createArea(quoteId, {
      name: 'Island',
      material: 'QUARTZ Calacatta',
      color: 'White',
      edgeProfile: 'eased'
    });

    expect(response.status).toBe(201);
    expect(body['id']).toBeDefined();
    expect(body['name']).toBe('Island');
    expect(body['material']).toBe('QUARTZ Calacatta');
    expect(body['color']).toBe('White');
    expect(body['edgeProfile']).toBe('eased');
    expect(body['subtotalCents']).toBe(0);
  });

  it('rejects area creation on sent quote', async () => {
    const quoteId = await createQuote();
    await fetch(`${quotesUrl()}/${quoteId}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    const { response, body } = await createArea(quoteId);

    expect(response.status).toBe(409);
    expect(body['code']).toBe('INVALID_QUOTE_STATUS');
  });

  it('returns 404 for missing quote', async () => {
    const { response } = await createArea(MISSING_ID);

    expect(response.status).toBe(404);
  });

  it('rejects missing name', async () => {
    const quoteId = await createQuote();
    const response = await fetch(areasUrl(quoteId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(response.status).toBe(400);
  });
});

describe('GET /customers/:customerId/quotes/:quoteId/areas', () => {
  it('lists areas for quote', async () => {
    const quoteId = await createQuote();
    await createArea(quoteId, { name: 'Island' });
    await createArea(quoteId, { name: 'Master Bath' });

    const response = await fetch(areasUrl(quoteId));
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Array.isArray(body['data'])).toBe(true);
    expect((body['data'] as unknown[]).length).toBe(2);
  });

  it('returns empty list for quote with no areas', async () => {
    const quoteId = await createQuote();
    const response = await fetch(areasUrl(quoteId));
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect((body['data'] as unknown[]).length).toBe(0);
  });
});

describe('PATCH /customers/:customerId/quotes/:quoteId/areas/:areaId', () => {
  it('updates area on draft quote', async () => {
    const quoteId = await createQuote();
    const { body: created } = await createArea(quoteId, { name: 'Island' });
    const areaId = created['id'] as string;

    const response = await fetch(`${areasUrl(quoteId)}/${areaId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, name: 'Kitchen Island', material: 'Granite' })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body['name']).toBe('Kitchen Island');
    expect(body['material']).toBe('Granite');
  });

  it('returns 404 for missing area', async () => {
    const quoteId = await createQuote();
    const response = await fetch(`${areasUrl(quoteId)}/${MISSING_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, name: 'Updated' })
    });

    expect(response.status).toBe(404);
  });

  it('rejects update on sent quote', async () => {
    const quoteId = await createQuote();
    const { body: created } = await createArea(quoteId, { name: 'Island' });
    const areaId = created['id'] as string;

    await fetch(`${quotesUrl()}/${quoteId}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    const response = await fetch(`${areasUrl(quoteId)}/${areaId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, name: 'Updated' })
    });

    expect(response.status).toBe(409);
  });
});

describe('DELETE /customers/:customerId/quotes/:quoteId/areas/:areaId', () => {
  it('deletes area with no line items', async () => {
    const quoteId = await createQuote();
    const { body: created } = await createArea(quoteId, { name: 'Island' });
    const areaId = created['id'] as string;

    const response = await fetch(`${areasUrl(quoteId)}/${areaId}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(response.status).toBe(200);

    const listRes = await fetch(areasUrl(quoteId));
    const listBody = await listRes.json() as Record<string, unknown>;
    expect((listBody['data'] as unknown[]).length).toBe(0);
  });

  it('blocks delete when area has line items', async () => {
    const quoteId = await createQuote();
    const { body: created } = await createArea(quoteId, { name: 'Island' });
    const areaId = created['id'] as string;

    await fetch(`${quotesUrl()}/${quoteId}/line-items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        quoteAreaId: areaId,
        stoneType: 'Marble',
        qty: 10,
        qtyUnit: 'sqft',
        unitPriceCents: 5000,
        laborPriceCents: 1000
      })
    });

    const response = await fetch(`${areasUrl(quoteId)}/${areaId}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(body['code']).toBe('AREA_HAS_LINE_ITEMS');
  });

  it('returns 404 for missing area', async () => {
    const quoteId = await createQuote();
    const response = await fetch(`${areasUrl(quoteId)}/${MISSING_ID}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(response.status).toBe(404);
  });
});

describe('Quote detail includes areas', () => {
  it('quote getById includes areas array', async () => {
    const quoteId = await createQuote();
    await createArea(quoteId, { name: 'Island' });
    await createArea(quoteId, { name: 'Master Bath' });

    const response = await fetch(`${quotesUrl()}/${quoteId}`);
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(Array.isArray(body['areas'])).toBe(true);
    expect((body['areas'] as unknown[]).length).toBe(2);
  });

  it('area subtotalCents reflects line items assigned to it', async () => {
    const quoteId = await createQuote();
    const { body: area } = await createArea(quoteId, { name: 'Island' });
    const areaId = area['id'] as string;

    await fetch(`${quotesUrl()}/${quoteId}/line-items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        quoteAreaId: areaId,
        stoneType: 'Marble',
        qty: 10,
        qtyUnit: 'sqft',
        unitPriceCents: 5000,
        laborPriceCents: 1000
      })
    });

    const areasRes = await fetch(areasUrl(quoteId));
    const areasBody = await areasRes.json() as Record<string, unknown>;
    const areas = areasBody['data'] as Array<Record<string, unknown>>;
    const islandArea = areas.find((a) => a['id'] === areaId);

    expect(islandArea?.['subtotalCents']).toBe(60000);
  });
});
