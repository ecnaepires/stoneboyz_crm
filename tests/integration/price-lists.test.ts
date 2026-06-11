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

const ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222';

const resetDatabase = async (app: INestApplication): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);

  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  const migrationsDir = join(process.cwd(), 'db/migrations');
  const migrationFiles = (await readdir(migrationsDir)).filter((fileName) => fileName.endsWith('.sql')).sort();

  for (const migrationFile of migrationFiles) {
    await pool.query(await readFile(join(migrationsDir, migrationFile), 'utf8'));
  }
};

let app: INestApplication;
let baseUrl: string;

const priceListsUrl = (): string => `${baseUrl}/api/v1/price-lists`;
const priceListUrl = (priceListId: string): string => `${priceListsUrl()}/${priceListId}`;
const itemsUrl = (priceListId: string): string => `${priceListUrl(priceListId)}/items`;

const createPriceList = async (body: Record<string, unknown> = {}): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(priceListsUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      name: 'Contractor Standard',
      description: 'Default contractor pricing',
      defaultTaxRateBps: 700,
      defaultPaymentTerms: 'Due on receipt',
      expirationDays: 30,
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

const createItem = async (
  priceListId: string,
  body: Record<string, unknown> = {}
): Promise<{ response: Response; body: Record<string, unknown> }> => {
  const response = await fetch(itemsUrl(priceListId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      category: 'Materials',
      itemType: 'material',
      name: 'Granite Black Galaxy',
      unit: 'sq_ft',
      priceCents: 9500,
      ...body
    })
  });

  return { response, body: await response.json() as Record<string, unknown> };
};

describe('price lists', () => {
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

  it('creates a price list', async () => {
    const created = await createPriceList();
    expect(created.response.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Contractor Standard', status: 'draft', revision: 1, currencyCode: 'USD' });
  });

  it('allows salespeople to create price lists', async () => {
    const token = await seedTestSession(app.get(DATABASE_POOL), 'salesperson');
    setTestAuthToken(token);

    const created = await createPriceList({ name: 'Salesperson Retail' });

    expect(created.response.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Salesperson Retail', status: 'draft' });

    const adminToken = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(adminToken);
  });

  it('rejects invalid price list create payloads', async () => {
    const created = await createPriceList({ name: '' });
    expect(created.response.status).toBe(400);
  });

  it('lists price lists with cursor pagination shape', async () => {
    await createPriceList({ name: 'A' });
    const response = await fetch(priceListsUrl());
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ hasMore: false, nextCursor: null });
    expect(body.data).toHaveLength(1);
  });

  it('returns a next cursor when over limit', async () => {
    await createPriceList({ name: 'A' });
    await createPriceList({ name: 'B' });
    const response = await fetch(`${priceListsUrl()}?limit=1`);
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.hasMore).toBe(true);
    expect(typeof body.nextCursor).toBe('string');
  });

  it('rejects invalid price list cursors', async () => {
    const response = await fetch(`${priceListsUrl()}?cursor=bad`);
    expect(response.status).toBe(400);
  });

  it('filters price lists by status', async () => {
    await createPriceList({ name: 'Draft' });
    const active = await createPriceList({ name: 'Active' });
    await fetch(`${priceListUrl(active.body.id as string)}/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const response = await fetch(`${priceListsUrl()}?status=active`);
    const body = await response.json() as { data: Array<Record<string, unknown>> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.name).toBe('Active');
  });

  it('filters price lists by search', async () => {
    await createPriceList({ name: 'Retail' });
    await createPriceList({ name: 'Contractor' });
    const response = await fetch(`${priceListsUrl()}?search=contract`);
    const body = await response.json() as { data: Array<Record<string, unknown>> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.name).toBe('Contractor');
  });

  it('gets a price list with items', async () => {
    const created = await createPriceList();
    await createItem(created.body.id as string);
    const response = await fetch(priceListUrl(created.body.id as string));
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
  });

  it('returns 404 for missing price lists', async () => {
    const response = await fetch(priceListUrl('33333333-3333-4333-8333-333333333333'));
    expect(response.status).toBe(404);
  });

  it('updates draft price lists', async () => {
    const created = await createPriceList();
    const response = await fetch(priceListUrl(created.body.id as string), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, name: 'Updated', description: null, defaultTaxRateBps: 825 })
    });
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ name: 'Updated', description: null, defaultTaxRateBps: 825 });
  });

  it('rejects empty price list updates', async () => {
    const created = await createPriceList();
    const response = await fetch(priceListUrl(created.body.id as string), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(response.status).toBe(400);
  });

  it('activates draft price lists', async () => {
    const created = await createPriceList();
    const response = await fetch(`${priceListUrl(created.body.id as string)}/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(body.status).toBe('active');
  });

  it('updates active price lists', async () => {
    const created = await createPriceList();
    await fetch(`${priceListUrl(created.body.id as string)}/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const response = await fetch(priceListUrl(created.body.id as string), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, name: 'Updated Active' })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ name: 'Updated Active', status: 'active' });
  });

  it('archives draft price lists', async () => {
    const created = await createPriceList();
    const response = await fetch(`${priceListUrl(created.body.id as string)}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ status: 'archived', archivedByUserId: ACTOR_USER_ID });
  });

  it('returns 409 when archiving active price lists', async () => {
    const created = await createPriceList();
    await fetch(`${priceListUrl(created.body.id as string)}/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const response = await fetch(`${priceListUrl(created.body.id as string)}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(response.status).toBe(409);
  });

  it('hides archived price lists from default list', async () => {
    const created = await createPriceList();
    await fetch(`${priceListUrl(created.body.id as string)}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const response = await fetch(priceListsUrl());
    const body = await response.json() as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it('lists archived price lists when requested', async () => {
    const created = await createPriceList();
    await fetch(`${priceListUrl(created.body.id as string)}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const response = await fetch(`${priceListsUrl()}?includeArchived=true`);
    const body = await response.json() as { data: Array<Record<string, unknown>> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.status).toBe('archived');
  });

  it('creates price list items', async () => {
    const priceList = await createPriceList();
    const item = await createItem(priceList.body.id as string);
    expect(item.response.status).toBe(201);
    expect(item.body).toMatchObject({ category: 'Materials', itemType: 'material', priceCents: 9500 });
  });

  it('creates price list items with salesperson pricing fields', async () => {
    const priceList = await createPriceList();
    const item = await createItem(priceList.body.id as string, {
      category: 'material',
      itemGroup: 'material',
      name: 'Uba Tuba',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      priceCents: 1800
    });

    expect(item.response.status).toBe(201);
    expect(item.body).toMatchObject({
      category: 'material',
      itemGroup: 'material',
      name: 'Uba Tuba',
      unit: 'sqft',
      chargeMethod: 'square_foot',
      measurementBasis: 'countertop_sqft',
      priceCents: 1800
    });
    expect(typeof item.body.catalogItemId).toBe('string');
  });

  it('creates admin price list items for unusual charges', async () => {
    const priceList = await createPriceList();
    const item = await createItem(priceList.body.id as string, {
      category: 'admin_item',
      itemGroup: 'admin',
      itemType: 'admin',
      name: 'Delivery Fee',
      unit: 'ea',
      chargeMethod: 'each',
      measurementBasis: 'each',
      priceCents: 25000
    });

    expect(item.response.status).toBe(201);
    expect(item.body).toMatchObject({
      category: 'admin_item',
      itemGroup: 'admin',
      itemType: 'admin',
      name: 'Delivery Fee',
      unit: 'ea',
      chargeMethod: 'each',
      measurementBasis: 'each',
      priceCents: 25000
    });
  });

  it('reuses catalog entries across price lists', async () => {
    const firstPriceList = await createPriceList({ name: 'Retail' });
    const firstItem = await createItem(firstPriceList.body.id as string, {
      category: 'sink_item',
      itemGroup: 'sink',
      itemType: 'sink',
      name: '70/30 Sink',
      unit: 'ea',
      chargeMethod: 'each',
      measurementBasis: 'sink_count',
      priceCents: 15000
    });

    const secondPriceList = await createPriceList({ name: 'Contractor' });
    const secondItem = await createItem(secondPriceList.body.id as string, {
      category: 'sink_item',
      itemGroup: 'sink',
      itemType: 'sink',
      name: '70/30 Sink',
      unit: 'ea',
      chargeMethod: 'each',
      measurementBasis: 'sink_count',
      priceCents: 12500
    });

    expect(firstItem.response.status).toBe(201);
    expect(secondItem.response.status).toBe(201);
    expect(secondItem.body.catalogItemId).toBe(firstItem.body.catalogItemId);
  });

  it('rejects invalid item payloads', async () => {
    const priceList = await createPriceList();
    const item = await createItem(priceList.body.id as string, { priceCents: -1 });
    expect(item.response.status).toBe(400);
  });

  it('lists items by sort order', async () => {
    const priceList = await createPriceList();
    await createItem(priceList.body.id as string, { name: 'Second', sortOrder: 20 });
    await createItem(priceList.body.id as string, { name: 'First', sortOrder: 10 });
    const response = await fetch(itemsUrl(priceList.body.id as string));
    const body = await response.json() as { data: Array<Record<string, unknown>> };
    expect(response.status).toBe(200);
    expect(body.data.map((item) => item.name)).toEqual(['First', 'Second']);
  });

  it('updates price list items', async () => {
    const priceList = await createPriceList();
    const item = await createItem(priceList.body.id as string);
    const response = await fetch(`${itemsUrl(priceList.body.id as string)}/${item.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, priceCents: 9900, taxable: false })
    });
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ priceCents: 9900, taxable: false });
  });

  it('rejects empty item updates', async () => {
    const priceList = await createPriceList();
    const item = await createItem(priceList.body.id as string);
    const response = await fetch(`${itemsUrl(priceList.body.id as string)}/${item.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 for missing items', async () => {
    const priceList = await createPriceList();
    const response = await fetch(`${itemsUrl(priceList.body.id as string)}/33333333-3333-4333-8333-333333333333`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, name: 'Missing' })
    });
    expect(response.status).toBe(404);
  });

  it('hard deletes price list items', async () => {
    const priceList = await createPriceList();
    const item = await createItem(priceList.body.id as string);
    const response = await fetch(`${itemsUrl(priceList.body.id as string)}/${item.body.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    expect(response.status).toBe(200);

    const list = await fetch(itemsUrl(priceList.body.id as string));
    const body = await list.json() as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it('allows item changes once price list is active', async () => {
    const priceList = await createPriceList();
    const item = await createItem(priceList.body.id as string);
    await fetch(`${priceListUrl(priceList.body.id as string)}/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const response = await fetch(`${itemsUrl(priceList.body.id as string)}/${item.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, priceCents: 8800 })
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.priceCents).toBe(8800);
  });

  it('returns 404 when creating items for missing price lists', async () => {
    const item = await createItem('33333333-3333-4333-8333-333333333333');
    expect(item.response.status).toBe(404);
  });
});
