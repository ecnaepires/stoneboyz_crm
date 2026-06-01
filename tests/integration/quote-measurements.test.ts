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

  await pool.query('DROP TABLE IF EXISTS sink_cutouts CASCADE;');
  await pool.query('DROP TABLE IF EXISTS edge_segments CASCADE;');
  await pool.query('DROP TABLE IF EXISTS counter_pieces CASCADE;');
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

const measurementsUrl = (
  quoteId: string,
  areaId: string,
  kind: 'pieces' | 'edges' | 'sinks',
  customerId = SEEDED_CUSTOMER_ID
): string => `${areasUrl(quoteId, customerId)}/${areaId}/${kind}`;

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

const createQuoteWithArea = async (areaOverrides: Record<string, unknown> = {}): Promise<{ quoteId: string; areaId: string }> => {
  const quoteId = await createQuote();
  const { body: area } = await createArea(quoteId, areaOverrides);

  return { quoteId, areaId: area['id'] as string };
};

const expectValidationError = async (response: Response): Promise<Record<string, unknown>> => {
  const body = await response.json() as Record<string, unknown>;

  expect(response.status).toBe(400);
  expect(body['code']).toBe('VALIDATION_ERROR');

  return body;
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

describe('Quote measurement CRUD', () => {
  it('creates, lists, updates, and deletes pieces, edges, and sinks', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    const pieceRes = await fetch(measurementsUrl(quoteId, areaId, 'pieces'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Sink run', lengthIn: 100, widthIn: 25.5, quantity: 1 })
    });
    const piece = await pieceRes.json() as Record<string, unknown>;
    expect(pieceRes.status).toBe(201);
    expect(piece['name']).toBe('Sink run');
    expect(piece['lengthIn']).toBe(100);

    const edgeRes = await fetch(measurementsUrl(quoteId, areaId, 'edges'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lengthIn: 100, treatment: 'finished', splashHeightIn: 4 })
    });
    const edge = await edgeRes.json() as Record<string, unknown>;
    expect(edgeRes.status).toBe(201);
    expect(edge['treatment']).toBe('finished');
    expect(edge['splashHeightIn']).toBe(4);

    const sinkRes = await fetch(measurementsUrl(quoteId, areaId, 'sinks'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: '3018',
        sinkType: 'undermount',
        shape: 'rectangle',
        cutoutLengthIn: 29,
        cutoutWidthIn: 18,
        faucetHoleCount: 1,
        centerline: 'center'
      })
    });
    const sink = await sinkRes.json() as Record<string, unknown>;
    expect(sinkRes.status).toBe(201);
    expect(sink['model']).toBe('3018');
    expect(sink['centerline']).toBe('center');

    const piecesList = await (await fetch(measurementsUrl(quoteId, areaId, 'pieces'))).json() as Record<string, unknown>;
    const edgesList = await (await fetch(measurementsUrl(quoteId, areaId, 'edges'))).json() as Record<string, unknown>;
    const sinksList = await (await fetch(measurementsUrl(quoteId, areaId, 'sinks'))).json() as Record<string, unknown>;
    expect((piecesList['data'] as unknown[]).length).toBe(1);
    expect((edgesList['data'] as unknown[]).length).toBe(1);
    expect((sinksList['data'] as unknown[]).length).toBe(1);

    const patchPiece = await fetch(`${measurementsUrl(quoteId, areaId, 'pieces')}/${piece['id'] as string}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Main sink run', lengthIn: 101 })
    });
    const updatedPiece = await patchPiece.json() as Record<string, unknown>;
    expect(patchPiece.status).toBe(200);
    expect(updatedPiece['name']).toBe('Main sink run');
    expect(updatedPiece['lengthIn']).toBe(101);

    const patchEdge = await fetch(`${measurementsUrl(quoteId, areaId, 'edges')}/${edge['id'] as string}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ treatment: 'mitered', splashHeightIn: null })
    });
    const updatedEdge = await patchEdge.json() as Record<string, unknown>;
    expect(patchEdge.status).toBe(200);
    expect(updatedEdge['treatment']).toBe('mitered');
    expect(updatedEdge['splashHeightIn']).toBeNull();

    const patchSink = await fetch(`${measurementsUrl(quoteId, areaId, 'sinks')}/${sink['id'] as string}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: '3219', faucetHoleCount: 2, centerline: 'right' })
    });
    const updatedSink = await patchSink.json() as Record<string, unknown>;
    expect(patchSink.status).toBe(200);
    expect(updatedSink['model']).toBe('3219');
    expect(updatedSink['faucetHoleCount']).toBe(2);
    expect(updatedSink['centerline']).toBe('right');

    const deletePiece = await fetch(`${measurementsUrl(quoteId, areaId, 'pieces')}/${piece['id'] as string}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const deleteEdge = await fetch(`${measurementsUrl(quoteId, areaId, 'edges')}/${edge['id'] as string}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const deleteSink = await fetch(`${measurementsUrl(quoteId, areaId, 'sinks')}/${sink['id'] as string}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(deletePiece.status).toBe(200);
    expect(deleteEdge.status).toBe(200);
    expect(deleteSink.status).toBe(200);

    const finalPieces = await (await fetch(measurementsUrl(quoteId, areaId, 'pieces'))).json() as Record<string, unknown>;
    const finalEdges = await (await fetch(measurementsUrl(quoteId, areaId, 'edges'))).json() as Record<string, unknown>;
    const finalSinks = await (await fetch(measurementsUrl(quoteId, areaId, 'sinks'))).json() as Record<string, unknown>;
    expect((finalPieces['data'] as unknown[]).length).toBe(0);
    expect((finalEdges['data'] as unknown[]).length).toBe(0);
    expect((finalSinks['data'] as unknown[]).length).toBe(0);
  });
});

describe('Quote measurement validation', () => {
  it('rejects invalid UUID params', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    await expectValidationError(await fetch(measurementsUrl('not-a-uuid', areaId, 'pieces')));
    await expectValidationError(await fetch(`${measurementsUrl(quoteId, areaId, 'pieces')}/not-a-uuid`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lengthIn: 10 })
    }));
  });

  it('rejects invalid enum values and invalid dimensions', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    await expectValidationError(await fetch(measurementsUrl(quoteId, areaId, 'edges'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lengthIn: 10, treatment: 'polished' })
    }));
    await expectValidationError(await fetch(measurementsUrl(quoteId, areaId, 'edges'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lengthIn: 10, treatment: 'finished', splashHeightIn: 0 })
    }));
    await expectValidationError(await fetch(measurementsUrl(quoteId, areaId, 'sinks'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sinkType: 'vessel',
        shape: 'triangle',
        cutoutLengthIn: 29,
        cutoutWidthIn: 18,
        centerline: 'rear'
      })
    }));
    await expectValidationError(await fetch(measurementsUrl(quoteId, areaId, 'pieces'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lengthIn: 0, widthIn: -1, quantity: 1 })
    }));
    await expectValidationError(await fetch(measurementsUrl(quoteId, areaId, 'sinks'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sinkType: 'undermount',
        shape: 'rectangle',
        cutoutLengthIn: -29,
        cutoutWidthIn: 18,
        faucetHoleCount: 6
      })
    }));
    await expectValidationError(await fetch(measurementsUrl(quoteId, areaId, 'sinks'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sinkType: 'undermount',
        shape: 'rectangle',
        cutoutLengthIn: 29,
        cutoutWidthIn: 18,
        faucetHoleCount: -1
      })
    }));
  });
});

describe('Quote measurement not found cases', () => {
  it('returns 404 for missing area', async () => {
    const quoteId = await createQuote();
    const response = await fetch(measurementsUrl(quoteId, MISSING_ID, 'pieces'));

    expect(response.status).toBe(404);
  });

  it('returns 404 for missing piece id', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();
    const response = await fetch(`${measurementsUrl(quoteId, areaId, 'pieces')}/${MISSING_ID}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lengthIn: 100 })
    });

    expect(response.status).toBe(404);
  });
});

describe('Quote measurement cascade delete', () => {
  it('deleting a quote area removes pieces, edges, and sinks', async () => {
    const { quoteId, areaId } = await createQuoteWithArea();

    await fetch(measurementsUrl(quoteId, areaId, 'pieces'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lengthIn: 100, widthIn: 25.5 })
    });
    await fetch(measurementsUrl(quoteId, areaId, 'edges'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lengthIn: 100, treatment: 'finished' })
    });
    await fetch(measurementsUrl(quoteId, areaId, 'sinks'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sinkType: 'undermount',
        shape: 'rectangle',
        cutoutLengthIn: 29,
        cutoutWidthIn: 18
      })
    });

    const deleteArea = await fetch(`${areasUrl(quoteId)}/${areaId}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(deleteArea.status).toBe(200);

    const pool = app.get<Pool>(DATABASE_POOL);
    const counts = await pool.query<{ counter_pieces: string; edge_segments: string; sink_cutouts: string }>(
      `
        SELECT
          (SELECT count(*) FROM counter_pieces WHERE quote_area_id = $1) AS counter_pieces,
          (SELECT count(*) FROM edge_segments WHERE quote_area_id = $1) AS edge_segments,
          (SELECT count(*) FROM sink_cutouts WHERE quote_area_id = $1) AS sink_cutouts
      `,
      [areaId]
    );

    expect(Number(counts.rows[0]?.counter_pieces)).toBe(0);
    expect(Number(counts.rows[0]?.edge_segments)).toBe(0);
    expect(Number(counts.rows[0]?.sink_cutouts)).toBe(0);
  });
});

describe('Quote measurement golden acceptance scenario', () => {
  it('returns the expected Kitchen measurement totals on quote detail', async () => {
    const { quoteId, areaId } = await createQuoteWithArea({ name: 'Kitchen' });

    await fetch(measurementsUrl(quoteId, areaId, 'pieces'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Sink run', lengthIn: 100, widthIn: 25.5 })
    });
    await fetch(measurementsUrl(quoteId, areaId, 'pieces'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Island', lengthIn: 72, widthIn: 36 })
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
        model: '3018',
        sinkType: 'undermount',
        shape: 'rectangle',
        cutoutLengthIn: 29,
        cutoutWidthIn: 18,
        faucetHoleCount: 1,
        centerline: 'center'
      })
    });

    const response = await fetch(`${quotesUrl()}/${quoteId}`);
    const body = await response.json() as Record<string, unknown>;
    const areas = body['areas'] as Array<Record<string, unknown>>;
    const kitchen = areas.find((area) => area['id'] === areaId);

    expect(response.status).toBe(200);
    expect(kitchen?.['name']).toBe('Kitchen');
    expect(kitchen?.['measurementTotals']).toEqual({
      pieceCount: 2,
      countertopSqFt: 35.708,
      backsplashSqFt: 0,
      combinedSqFt: 35.708,
      finishedEdgeLinFt: 14.333,
      splashSqFt: 2.778,
      sinkCutoutCount: 1,
      faucetHoleCount: 1
    });
  });
});
