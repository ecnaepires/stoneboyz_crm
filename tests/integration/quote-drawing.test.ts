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

  await pool.query('DROP TABLE IF EXISTS drawing_revisions CASCADE;');
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

const quotesUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/quotes`;

const areasUrl = (quoteId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${quotesUrl(customerId)}/${quoteId}/areas`;

const drawingUrl = (quoteId: string, areaId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${areasUrl(quoteId, customerId)}/${areaId}/drawing`;

const drawingRevisionsUrl = (quoteId: string, areaId: string, customerId = SEEDED_CUSTOMER_ID): string =>
  `${drawingUrl(quoteId, areaId, customerId)}/revisions`;

const createQuote = async (customerId = SEEDED_CUSTOMER_ID): Promise<string> => {
  const res = await fetch(quotesUrl(customerId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, title: 'Kitchen countertop' })
  });
  const body = await res.json() as Record<string, unknown>;
  return body['id'] as string;
};

const createArea = async (quoteId: string): Promise<string> => {
  const res = await fetch(areasUrl(quoteId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, name: 'Kitchen' })
  });
  const body = await res.json() as Record<string, unknown>;
  return body['id'] as string;
};

const createQuoteWithArea = async (): Promise<{ quoteId: string; areaId: string }> => {
  const quoteId = await createQuote();
  const areaId = await createArea(quoteId);
  return { quoteId, areaId };
};

const sendQuote = async (quoteId: string): Promise<void> => {
  await fetch(`${quotesUrl()}/${quoteId}/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
  });
};

const minimalLayout = { layout: { pieces: [], sinks: [], corners: [], edges: [] } };

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
  const token = await seedTestSession(app.get(DATABASE_POOL));
  setTestAuthToken(token);
});

describe('Quote drawing GET', () => {
  it('returns null when no revision saved yet', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();
    const res = await fetch(drawingUrl(quoteId, areaId));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body['data']).toBeNull();
  });
});

describe('Quote drawing save and load', () => {
  it('saves first revision and retrieves it', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    const saveRes = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(minimalLayout)
    });
    const saved = await saveRes.json() as Record<string, unknown>;

    expect(saveRes.status).toBe(201);
    expect(saved['quoteAreaId']).toBe(areaId);
    expect(saved['revisionNumber']).toBe(1);
    expect(saved['layout']).toEqual({
      pieces: [],
      sinks: [],
      corners: [],
      edges: [],
      deletedLines: [],
      referenceLines: []
    });
    expect(saved['notes']).toBeNull();
    expect(saved['id']).toEqual(expect.any(String));
    expect(saved['createdAt']).toEqual(expect.any(String));

    const getRes = await fetch(drawingUrl(quoteId, areaId));
    const loaded = await getRes.json() as Record<string, unknown>;

    expect(getRes.status).toBe(200);
    expect((loaded['data'] as Record<string, unknown>)['revisionNumber']).toBe(1);
  });

  it('increments revision number on each save and GET returns latest', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(minimalLayout)
    });

    const secondSave = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(minimalLayout)
    });
    const second = await secondSave.json() as Record<string, unknown>;

    expect(secondSave.status).toBe(201);
    expect(second['revisionNumber']).toBe(2);

    const getRes = await fetch(drawingUrl(quoteId, areaId));
    const loaded = await getRes.json() as Record<string, unknown>;
    expect((loaded['data'] as Record<string, unknown>)['revisionNumber']).toBe(2);
  });

  it('stores optional revision notes', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    const saveRes = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...minimalLayout, notes: 'Adjusted layout for island overhang.' })
    });
    const saved = await saveRes.json() as Record<string, unknown>;

    expect(saveRes.status).toBe(201);
    expect(saved['notes']).toBe('Adjusted layout for island overhang.');
  });

  it('round-trips piece and sink layout data', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();
    const pieceId = '33333333-3333-4333-8333-333333333333';
    const sinkId = '44444444-4444-4444-8444-444444444444';

    const layout = {
      layout: {
        pieces: [{ pieceId, x: 100, y: 200, rotation: 90 }],
        sinks: [{ sinkId, pieceId, x: 50, y: 75, rotation: 0 }],
        corners: [{ pieceId, corner: 'topLeft', treatment: 'radius', valueIn: 3 }],
        edges: [{ pieceId, edge: 'top', treatment: 'splash', splashHeightIn: 4, label: 'S4' }]
      }
    };

    const saveRes = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(layout)
    });
    const saved = await saveRes.json() as Record<string, unknown>;
    const savedLayout = saved['layout'] as Record<string, unknown>;
    const pieces = savedLayout['pieces'] as Array<Record<string, unknown>>;
    const sinks = savedLayout['sinks'] as Array<Record<string, unknown>>;

    expect(saveRes.status).toBe(201);
    expect(pieces[0]?.['pieceId']).toBe(pieceId);
    expect(pieces[0]?.['x']).toBe(100);
    expect(pieces[0]?.['rotation']).toBe(90);
    expect(sinks[0]?.['sinkId']).toBe(sinkId);
    expect(sinks[0]?.['pieceId']).toBe(pieceId);
    expect(sinks[0]?.['y']).toBe(75);
    expect((savedLayout['corners'] as Array<Record<string, unknown>>)[0]).toEqual({
      pieceId,
      corner: 'topLeft',
      treatment: 'radius',
      valueIn: 3
    });
    expect((savedLayout['edges'] as Array<Record<string, unknown>>)[0]).toEqual({
      pieceId,
      edge: 'top',
      treatment: 'splash',
      splashHeightIn: 4,
      label: 'S4'
    });
  });
});

describe('Quote drawing validation', () => {
  it('rejects invalid UUID params', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    const badCustomer = await fetch(drawingUrl(quoteId, areaId, 'not-a-uuid'));
    expect(badCustomer.status).toBe(400);
    expect((await badCustomer.json() as Record<string, unknown>)['code']).toBe('VALIDATION_ERROR');

    const badQuote = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/quotes/not-a-uuid/areas/${areaId}/drawing`
    );
    expect(badQuote.status).toBe(400);

    const badArea = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/quotes/${quoteId}/areas/not-a-uuid/drawing`
    );
    expect(badArea.status).toBe(400);
  });

  it('rejects missing layout in POST body', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    const res = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body['code']).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid pieceId in layout', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    const res = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        layout: {
          pieces: [{ pieceId: 'not-a-uuid', x: 0, y: 0 }],
          sinks: []
        }
      })
    });
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(400);
    expect(body['code']).toBe('VALIDATION_ERROR');
  });

  it('rejects notes longer than 500 characters', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    const res = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...minimalLayout, notes: 'x'.repeat(501) })
    });

    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>)['code']).toBe('VALIDATION_ERROR');
  });
});

describe('Quote drawing revisions', () => {
  it('lists saved revisions newest first', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...minimalLayout, notes: 'First pass' })
    });

    await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...minimalLayout, notes: 'Second pass' })
    });

    const res = await fetch(drawingRevisionsUrl(quoteId, areaId));
    const body = await res.json() as Record<string, unknown>;
    const data = body['data'] as Array<Record<string, unknown>>;

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]?.['revisionNumber']).toBe(2);
    expect(data[0]?.['notes']).toBe('Second pass');
    expect(data[1]?.['revisionNumber']).toBe(1);
  });

  it('reverts by creating a new latest revision from an earlier revision', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();
    const firstLayout = {
      layout: {
        pieces: [{ pieceId: '33333333-3333-4333-8333-333333333333', x: 10, y: 20, rotation: 0 }],
        sinks: [],
        corners: [],
        edges: [],
        deletedLines: [],
        referenceLines: []
      }
    };
    const secondLayout = {
      layout: {
        pieces: [{ pieceId: '33333333-3333-4333-8333-333333333333', x: 100, y: 200, rotation: 90 }],
        sinks: [],
        corners: [],
        edges: []
      }
    };

    const firstSave = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...firstLayout, notes: 'Original' })
    });
    const firstSaved = await firstSave.json() as Record<string, unknown>;

    await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...secondLayout, notes: 'Moved piece' })
    });

    const revertRes = await fetch(`${drawingRevisionsUrl(quoteId, areaId)}/${firstSaved['id']}/revert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }
    });
    const reverted = await revertRes.json() as Record<string, unknown>;

    expect(revertRes.status).toBe(201);
    expect(reverted['revisionNumber']).toBe(3);
    expect(reverted['layout']).toEqual(firstLayout.layout);
    expect(reverted['notes']).toBe('Reverted to revision 1');

    const latestRes = await fetch(drawingUrl(quoteId, areaId));
    const latest = await latestRes.json() as Record<string, unknown>;
    expect((latest['data'] as Record<string, unknown>)['layout']).toEqual(firstLayout.layout);
  });
});

describe('Quote drawing not found', () => {
  it('returns 404 for missing area', async () => {
    const quoteId = await createQuote();
    const res = await fetch(drawingUrl(quoteId, MISSING_ID));
    expect(res.status).toBe(404);
  });

  it('returns 404 for missing quote', async () => {
    const res = await fetch(drawingUrl(MISSING_ID, MISSING_ID));
    expect(res.status).toBe(404);
  });
});

describe('Quote drawing non-draft conflict', () => {
  it('returns 409 when saving to a non-draft quote', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();
    await sendQuote(quoteId);

    const res = await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(minimalLayout)
    });
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(409);
    expect(body['code']).toBe('INVALID_QUOTE_STATUS');
  });
});

describe('Quote drawing cascade delete', () => {
  it('deleting quote area removes all drawing revisions', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(minimalLayout)
    });
    await fetch(drawingUrl(quoteId, areaId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(minimalLayout)
    });

    const deleteRes = await fetch(`${areasUrl(quoteId)}/${areaId}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(deleteRes.status).toBe(200);

    const pool = app.get<Pool>(DATABASE_POOL);
    const { rows } = await pool.query<{ count: string }>(
      'SELECT count(*) FROM drawing_revisions WHERE quote_area_id = $1',
      [areaId]
    );
    expect(Number(rows[0]?.count)).toBe(0);
  });
});
