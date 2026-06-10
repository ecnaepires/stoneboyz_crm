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
import { getDefaultJobTemplateId } from './helpers/job-templates.js';
import { setTestAuthToken } from './helpers/test-auth.js';

const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222';

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

const slabsUrl = (): string => `${baseUrl}/api/v1/inventory/slabs`;
const quotesUrl = (): string => `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/quotes`;
const projectsUrl = (): string => `${baseUrl}/api/v1/projects`;
const projectSlabsUrl = (projectId: string): string => `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${projectId}/slabs`;

const createSlab = async (body: Record<string, unknown> = {}): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(slabsUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      stoneType: 'Granite Black Galaxy',
      finish: 'polished',
      qualityGrade: 'A',
      lengthIn: 120,
      widthIn: 60,
      thicknessCm: 3,
      costCents: 120000,
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

const createQuote = async (): Promise<Record<string, unknown>> => {
  const response = await fetch(quotesUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID, title: 'Kitchen quote' })
  });

  return await response.json() as Record<string, unknown>;
};

const addLineItem = async (quoteId: string, slabId: string): Promise<Response> => {
  return fetch(`${quotesUrl()}/${quoteId}/line-items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      slabId,
      stoneType: 'Granite Black Galaxy',
      qty: 1,
      qtyUnit: 'slab',
      unitPriceCents: 150000
    })
  });
};

describe('slabs', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    await resetDatabase(app);
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('creates and lists slabs with cursor pagination shape', async () => {
    const created = await createSlab();

    expect(created.response.status).toBe(201);
    expect(created.body).toMatchObject({
      stoneType: 'Granite Black Galaxy',
      status: 'available',
      costCents: 120000
    });

    const response = await fetch(slabsUrl());
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ hasMore: false, nextCursor: null });
    expect(body.data).toHaveLength(1);
  });

  it('uploads and removes slab photos', async () => {
    const slab = await createSlab();
    const formData = new FormData();
    formData.set(
      'image',
      new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
      'slab.png'
    );

    const uploadResponse = await fetch(`${slabsUrl()}/${slab.body.id}/images`, {
      method: 'POST',
      body: formData
    });
    const uploaded = await uploadResponse.json() as Record<string, unknown>;

    expect(uploadResponse.status).toBe(201);
    expect(uploaded.imageUrls).toHaveLength(1);
    expect((uploaded.imageUrls as string[])[0]).toContain('/uploads/slabs/');

    const deleteResponse = await fetch(`${slabsUrl()}/${slab.body.id}/images`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: (uploaded.imageUrls as string[])[0] })
    });
    const deleted = await deleteResponse.json() as Record<string, unknown>;

    expect(deleteResponse.status).toBe(200);
    expect(deleted.imageUrls).toEqual([]);
  });

  it('rejects slab measurements outside shop limits', async () => {
    const oversized = await createSlab({ widthIn: 61 });

    expect(oversized.response.status).toBe(400);
    expect(oversized.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { widthIn: ['slab exceeds maximum dimensions'] }
    });

    const invalidThickness = await createSlab({ thicknessCm: 1 });
    expect(invalidThickness.response.status).toBe(400);
    expect(invalidThickness.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { thicknessCm: ['thickness must be 2cm or 3cm'] }
    });
  });

  it('reserves and releases a slab through quote line items', async () => {
    const slab = await createSlab();
    const quote = await createQuote();
    const addResponse = await addLineItem(quote.id as string, slab.body.id as string);

    expect(addResponse.status).toBe(201);

    const reserved = await fetch(`${slabsUrl()}/${slab.body.id}`);
    expect((await reserved.json() as Record<string, unknown>).status).toBe('reserved');

    const lineItemsResponse = await fetch(`${quotesUrl()}/${quote.id}/line-items`);
    const lineItemsBody = await lineItemsResponse.json() as { data: Array<Record<string, unknown>> };
    const removeResponse = await fetch(`${quotesUrl()}/${quote.id}/line-items/${lineItemsBody.data[0]?.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(removeResponse.status).toBe(200);

    const released = await fetch(`${slabsUrl()}/${slab.body.id}`);
    expect((await released.json() as Record<string, unknown>).status).toBe('available');
  });

  it('cuts a slab and creates remnants', async () => {
    const slab = await createSlab();

    const response = await fetch(`${slabsUrl()}/${slab.body.id}/cut`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        remnants: [
          {
            actorUserId: ACTOR_USER_ID,
            stoneType: 'Granite Black Galaxy',
            finish: 'polished',
            qualityGrade: 'B',
            lengthIn: 36,
            widthIn: 24,
            thicknessCm: 3
          }
        ]
      })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect((body.slab as Record<string, unknown>).status).toBe('cut');
    expect(body.remnants).toHaveLength(1);
    expect(((body.remnants as Array<Record<string, unknown>>)[0] as Record<string, unknown>).status).toBe('remnant');
  });

  it('attaches, detaches, and cuts slabs in project context', async () => {
    const slab = await createSlab();
    const jobTemplateId = await getDefaultJobTemplateId(baseUrl);
    const projectResponse = await fetch(projectsUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerId: SEEDED_CUSTOMER_ID,
        title: 'Kitchen project',
        jobTemplateId,
        ownerUserId: ACTOR_USER_ID
      })
    });
    const project = await projectResponse.json() as Record<string, unknown>;

    const attachResponse = await fetch(projectSlabsUrl(project.id as string), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, slabId: slab.body.id })
    });

    expect(attachResponse.status).toBe(201);

    const listResponse = await fetch(projectSlabsUrl(project.id as string));
    const listBody = await listResponse.json() as Record<string, unknown>;
    expect(listBody.data).toHaveLength(1);

    const cutResponse = await fetch(`${projectSlabsUrl(project.id as string)}/${slab.body.id}/cut`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(cutResponse.status).toBe(200);
  });
});
