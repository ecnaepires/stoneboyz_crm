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

const minimalLayout = { layout: { schemaVersion: 2, pieces: [], sinks: [], annotations: [], legend: [] } };

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
      schemaVersion: 2,
      pieces: [],
      sinks: [],
      annotations: [],
      legend: []
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

    const piece = {
      pieceId,
      kind: 'countertop',
      label: 'Counter 1',
      positionIn: { x: 100, y: 200 },
      rotationDeg: 90,
      outline: {
        vertices: [
          { vertexId: 'a', xIn: 0, yIn: 0 },
          { vertexId: 'b', xIn: 110, yIn: 0 },
          { vertexId: 'c', xIn: 110, yIn: 25.5 },
          { vertexId: 'd', xIn: 0, yIn: 25.5 }
        ]
      },
      edges: [{ startVertexId: 'a', paintColor: '#ef4444' }],
      cutouts: []
    };

    const sink = {
      sinkId,
      pieceId,
      type: 'sink',
      centerIn: { x: 55, y: 12 },
      rotationDeg: 0,
      showCenterline: 'left',
      faucetHoles: []
    };

    const layout = {
      layout: {
        schemaVersion: 2,
        pieces: [piece],
        sinks: [sink],
        annotations: [],
        legend: []
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
    expect(pieces[0]?.['positionIn']).toEqual({ x: 100, y: 200 });
    expect(pieces[0]?.['rotationDeg']).toBe(90);
    expect(sinks[0]?.['sinkId']).toBe(sinkId);
    expect(sinks[0]?.['pieceId']).toBe(pieceId);
    expect(sinks[0]?.['centerIn']).toEqual({ x: 55, y: 12 });
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
          schemaVersion: 2,
          pieces: [{ pieceId: 'not-a-uuid', kind: 'countertop', label: 'X', positionIn: { x: 0, y: 0 }, rotationDeg: 0, outline: { vertices: [{ vertexId: 'a', xIn: 0, yIn: 0 }, { vertexId: 'b', xIn: 100, yIn: 0 }, { vertexId: 'c', xIn: 100, yIn: 25 }] }, edges: [], cutouts: [] }],
          sinks: [],
          annotations: [],
          legend: []
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
    const piece1 = {
      pieceId: '33333333-3333-4333-8333-333333333333',
      kind: 'countertop',
      label: 'Counter 1',
      positionIn: { x: 10, y: 20 },
      rotationDeg: 0,
      outline: { vertices: [{ vertexId: 'a', xIn: 0, yIn: 0 }, { vertexId: 'b', xIn: 110, yIn: 0 }, { vertexId: 'c', xIn: 110, yIn: 25.5 }, { vertexId: 'd', xIn: 0, yIn: 25.5 }] },
      edges: [],
      cutouts: []
    };
    const piece2 = { ...piece1, positionIn: { x: 100, y: 200 }, rotationDeg: 90 as const };
    const firstLayout = {
      layout: {
        schemaVersion: 2,
        pieces: [piece1],
        sinks: [],
        annotations: [],
        legend: []
      }
    };
    const secondLayout = {
      layout: {
        schemaVersion: 2,
        pieces: [piece2],
        sinks: [],
        annotations: [],
        legend: []
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
    const revertedLayout = reverted['layout'] as Record<string, unknown>;
    expect(revertedLayout['schemaVersion']).toBe(2);
    expect((revertedLayout['pieces'] as Array<Record<string, unknown>>)[0]?.['positionIn']).toEqual({ x: 10, y: 20 });
    expect(reverted['notes']).toBe('Reverted to revision 1');

    const latestRes = await fetch(drawingUrl(quoteId, areaId));
    const latest = await latestRes.json() as Record<string, unknown>;
    const latestLayout = (latest['data'] as Record<string, unknown>)['layout'] as Record<string, unknown>;
    expect(latestLayout['schemaVersion']).toBe(2);
    expect((latestLayout['pieces'] as Array<Record<string, unknown>>)[0]?.['positionIn']).toEqual({ x: 10, y: 20 });
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

describe('Quote drawing v2 schema enforcement', () => {
  it("saves a schemaVersion 2 layout", async () => {
    const { quoteId, areaId } = await createQuoteWithArea();
    const layout = {
      schemaVersion: 2,
      pieces: [
        {
          pieceId: "33333333-3333-4333-8333-333333333333",
          kind: "countertop",
          label: "Counter 1",
          positionIn: { x: 0, y: 0 },
          rotationDeg: 0,
          outline: {
            vertices: [
              { vertexId: "a", xIn: 0, yIn: 0 },
              { vertexId: "b", xIn: 110, yIn: 0 },
              { vertexId: "c", xIn: 110, yIn: 25.5 },
              { vertexId: "d", xIn: 0, yIn: 25.5 },
            ],
          },
          edges: [],
          cutouts: [],
        },
      ],
      sinks: [],
      annotations: [],
      legend: [],
    };
    const res = await fetch(drawingUrl(quoteId, areaId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ layout, notes: "field check" }),
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(201);
    const data = body as Record<string, unknown>;
    expect(data["notes"]).toBe("field check");
  });

  it("rejects a legacy v1 layout body with 400", async () => {
    const { quoteId, areaId } = await createQuoteWithArea();
    const res = await fetch(drawingUrl(quoteId, areaId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ layout: { pieces: [], sinks: [] } }),
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect((body as Record<string, unknown>)["code"]).toBe("VALIDATION_ERROR");
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
