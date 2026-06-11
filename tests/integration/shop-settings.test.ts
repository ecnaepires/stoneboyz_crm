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

let app: INestApplication;
let baseUrl: string;

const settingsUrl = () => `${baseUrl}/api/v1/shop-settings`;
const depthPresetsUrl = () => `${settingsUrl()}/depth-presets`;

const resetDatabase = async (): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const migrationsDir = join(process.cwd(), 'db/migrations');
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    await pool.query(await readFile(join(migrationsDir, f), 'utf8'));
  }
  await pool.query(await readFile(join(process.cwd(), 'db/seeds/test-customers.sql'), 'utf8'));
};

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  await app.listen(0);
  const port = (app.getHttpServer() as { address(): { port: number } }).address().port;
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => { await app.close(); });

beforeEach(async () => {
  await resetDatabase();
  const token = await seedTestSession(app.get(DATABASE_POOL));
  setTestAuthToken(token);
});

describe('counter depth presets', () => {
  it('returns counterDepthPresets in GET and round-trips PUT', async () => {
    // GET → counterDepthPresets starts empty
    const getRes = await fetch(settingsUrl());
    const getBody = await getRes.json() as { data: { workDays: number[]; counterDepthPresets: number[] } };
    expect(getRes.status).toBe(200);
    expect(getBody.data.counterDepthPresets).toEqual([]);

    // PUT with duplicates and unsorted → deduped and sorted
    const putRes = await fetch(depthPresetsUrl(), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ counterDepthPresets: [26, 22.5, 26] }),
    });
    const putBody = await putRes.json() as { data: { workDays: number[]; counterDepthPresets: number[] } };
    expect(putRes.status).toBe(200);
    expect(putBody.data.counterDepthPresets).toEqual([22.5, 26]);

    // GET again → persisted
    const get2Res = await fetch(settingsUrl());
    const get2Body = await get2Res.json() as { data: { workDays: number[]; counterDepthPresets: number[] } };
    expect(get2Body.data.counterDepthPresets).toEqual([22.5, 26]);
  });

  it('rejects invalid depths', async () => {
    // below minimum (1")
    const res1 = await fetch(depthPresetsUrl(), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ counterDepthPresets: [0.5] }),
    });
    expect(res1.status).toBe(400);

    // not a 1/16 multiple
    const res2 = await fetch(depthPresetsUrl(), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ counterDepthPresets: [25.03] }),
    });
    expect(res2.status).toBe(400);
  });

  it('allows non-admin users to PUT depth presets', async () => {
    // re-seed as non-admin
    const token = await seedTestSession(app.get(DATABASE_POOL), 'templater');
    setTestAuthToken(token);

    const res = await fetch(depthPresetsUrl(), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ counterDepthPresets: [25.5] }),
    });
    expect(res.status).toBe(200);
  });
});

describe('work days', () => {
  it('GET returns default [1,2,3,4,5]', async () => {
    const res = await fetch(settingsUrl());
    const body = await res.json() as { data: { workDays: number[] } };
    expect(res.status).toBe(200);
    expect(body.data.workDays).toEqual([1, 2, 3, 4, 5]);
  });

  it('admin PATCH persists new work days', async () => {
    const res = await fetch(settingsUrl(), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workDays: [2, 3, 4, 5, 6] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { workDays: number[] } };
    expect(body.data.workDays).toEqual([2, 3, 4, 5, 6]);

    const get2 = await fetch(settingsUrl());
    const get2Body = await get2.json() as { data: { workDays: number[] } };
    expect(get2Body.data.workDays).toEqual([2, 3, 4, 5, 6]);
  });

  it('non-admin PATCH → 403', async () => {
    const token = await seedTestSession(app.get(DATABASE_POOL), 'templater');
    setTestAuthToken(token);
    const res = await fetch(settingsUrl(), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workDays: [1, 2, 3] }),
    });
    expect(res.status).toBe(403);
  });

  it('empty workDays → 400', async () => {
    const res = await fetch(settingsUrl(), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workDays: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('out-of-range value [7] → 400', async () => {
    const res = await fetch(settingsUrl(), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workDays: [7] }),
    });
    expect(res.status).toBe(400);
  });

  it('duplicate values → 400', async () => {
    const res = await fetch(settingsUrl(), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workDays: [1, 1, 2] }),
    });
    expect(res.status).toBe(400);
  });
});

describe('holidays', () => {
  const holidaysUrl = () => `${settingsUrl()}/holidays`;

  it('creates, lists within range, duplicate date → 409, deletes', async () => {
    // Create
    const postRes = await fetch(holidaysUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holidayDate: '2026-11-26', name: 'Thanksgiving' }),
    });
    expect(postRes.status).toBe(201);
    const holiday = await postRes.json() as { id: string; holidayDate: string; name: string };
    expect(holiday.holidayDate).toBe('2026-11-26');
    expect(holiday.name).toBe('Thanksgiving');

    // List
    const listRes = await fetch(`${holidaysUrl()}?from=2026-01-01&to=2027-12-31`);
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as { data: { id: string }[] };
    expect(listBody.data.some((h) => h.id === holiday.id)).toBe(true);

    // Duplicate → 409
    const dupRes = await fetch(holidaysUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holidayDate: '2026-11-26', name: 'Duplicate' }),
    });
    expect(dupRes.status).toBe(409);

    // Delete
    const delRes = await fetch(`${holidaysUrl()}/${holiday.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(204);

    // Gone
    const afterDel = await fetch(`${holidaysUrl()}?from=2026-01-01&to=2027-12-31`);
    const afterBody = await afterDel.json() as { data: { id: string }[] };
    expect(afterBody.data.find((h) => h.id === holiday.id)).toBeUndefined();
  });

  it('DELETE unknown id → 404', async () => {
    const res = await fetch(`${holidaysUrl()}/00000000-0000-4000-8000-000000000000`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('non-admin POST → 403', async () => {
    const token = await seedTestSession(app.get(DATABASE_POOL), 'templater');
    setTestAuthToken(token);
    const res = await fetch(holidaysUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holidayDate: '2026-12-25', name: 'Christmas' }),
    });
    expect(res.status).toBe(403);
  });

  it('non-admin DELETE → 403', async () => {
    // Admin creates
    const created = await fetch(holidaysUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holidayDate: '2026-07-04', name: 'Independence Day' }),
    });
    const { id } = await created.json() as { id: string };

    // Non-admin tries to delete
    const token = await seedTestSession(app.get(DATABASE_POOL), 'templater');
    setTestAuthToken(token);
    const res = await fetch(`${holidaysUrl()}/${id}`, { method: 'DELETE' });
    expect(res.status).toBe(403);
  });

  it('GET with from/to range filters by date', async () => {
    await fetch(holidaysUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holidayDate: '2026-01-01', name: "New Year's" }),
    });
    await fetch(holidaysUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holidayDate: '2026-12-25', name: 'Christmas' }),
    });

    const res = await fetch(`${holidaysUrl()}?from=2026-06-01&to=2026-12-31`);
    const body = await res.json() as { data: { holidayDate: string }[] };
    expect(res.status).toBe(200);
    expect(body.data.every((h) => h.holidayDate >= '2026-06-01')).toBe(true);
    expect(body.data.find((h) => h.holidayDate === '2026-01-01')).toBeUndefined();
  });
});
