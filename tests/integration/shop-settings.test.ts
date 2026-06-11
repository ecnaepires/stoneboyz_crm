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
