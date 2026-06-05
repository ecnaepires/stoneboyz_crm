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
      widthIn: 70,
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
      kind: 'full_slab',
      availability: 'available',
      ownership: 'shop_owned',
      condition: 'good',
      costCents: 120000
    });
    expect(typeof created.body.tagCode).toBe('string');
    expect((created.body.tagCode as string).startsWith('S-')).toBe(true);

    const response = await fetch(slabsUrl());
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ hasMore: false, nextCursor: null });
    expect(body.data).toHaveLength(1);
  });

  it('rejects customer-supplied slab without an owning customer', async () => {
    const created = await createSlab({ ownership: 'customer_supplied' });

    expect(created.response.status).toBe(400);
  });

  it('persists the owning customer for customer-supplied slabs', async () => {
    const created = await createSlab({
      ownership: 'customer_supplied',
      ownerCustomerId: SEEDED_CUSTOMER_ID
    });

    expect(created.response.status).toBe(201);
    expect(created.body.ownerCustomerId).toBe(SEEDED_CUSTOMER_ID);
  });

  it('rejects an owning customer on non customer-supplied slabs', async () => {
    const created = await createSlab({
      ownership: 'shop_owned',
      ownerCustomerId: SEEDED_CUSTOMER_ID
    });

    expect(created.response.status).toBe(400);
  });

  it('filters slabs by owning customer', async () => {
    await createSlab();
    await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });

    const response = await fetch(`${slabsUrl()}?ownerCustomerId=${SEEDED_CUSTOMER_ID}`);
    const body = await response.json() as { data: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.ownerCustomerId).toBe(SEEDED_CUSTOMER_ID);
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
    expect((body.slab as Record<string, unknown>).availability).toBe('cut');
    expect(body.remnants).toHaveLength(1);
    expect(((body.remnants as Array<Record<string, unknown>>)[0] as Record<string, unknown>).status).toBe('remnant');
    expect(((body.remnants as Array<Record<string, unknown>>)[0] as Record<string, unknown>).kind).toBe('remnant');
    expect(((body.remnants as Array<Record<string, unknown>>)[0] as Record<string, unknown>).availability).toBe('hold');
    expect(((body.remnants as Array<Record<string, unknown>>)[0] as Record<string, unknown>).ownership).toBe('shop_owned');
  });

  it('keeps customer supplied remnants held for the job after cut', async () => {
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });
    const projectResponse = await fetch(projectsUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerId: SEEDED_CUSTOMER_ID,
        title: 'Customer material job',
        ownerUserId: ACTOR_USER_ID
      })
    });
    const project = await projectResponse.json() as Record<string, unknown>;

    await fetch(projectSlabsUrl(project.id as string), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, slabId: slab.body.id })
    });

    const response = await fetch(`${projectSlabsUrl(project.id as string)}/${slab.body.id}/cut`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        remnants: [{
          stoneType: 'Granite Black Galaxy',
          finish: 'polished',
          qualityGrade: 'B',
          lengthIn: 24,
          widthIn: 24,
          thicknessCm: 3
        }]
      })
    });
    const body = await response.json() as Record<string, unknown>;
    const remnant = (body.remnants as Array<Record<string, unknown>>)[0]!;

    expect(response.status).toBe(200);
    expect(remnant).toMatchObject({
      kind: 'remnant',
      ownership: 'customer_supplied',
      availability: 'reserved'
    });

    const listResponse = await fetch(projectSlabsUrl(project.id as string));
    const listBody = await listResponse.json() as Record<string, unknown>;
    expect((listBody.data as Array<Record<string, unknown>>).some((item) => item.id === remnant.id)).toBe(true);
  });

  it('records damage marks and promotes condition to minor damage', async () => {
    const slab = await createSlab();

    const response = await fetch(`${slabsUrl()}/${slab.body.id}/damage-marks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'scratch',
        severity: 'minor',
        shape: { kind: 'circle', x: 10, y: 20, radius: 12 },
        note: 'top right scratch'
      })
    });
    const mark = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(mark).toMatchObject({ type: 'scratch', severity: 'minor' });

    const slabResponse = await fetch(`${slabsUrl()}/${slab.body.id}`);
    const updated = await slabResponse.json() as Record<string, unknown>;
    expect(updated.condition).toBe('minor_damage');
  });

  it('finds available remnants that fit needed dimensions when rotated', async () => {
    await createSlab({
      kind: 'remnant',
      availability: 'available',
      lengthIn: 30,
      widthIn: 50,
      storageLocationId: null
    });

    const response = await fetch(`${slabsUrl()}/find-material?minLengthIn=48&minWidthIn=24&kind=remnant`);
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect((body.data as Array<Record<string, unknown>>)[0]).toMatchObject({ fitsRotated: true });
  });

  it('attaches, detaches, and cuts slabs in project context', async () => {
    const slab = await createSlab();
    const projectResponse = await fetch(projectsUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerId: SEEDED_CUSTOMER_ID,
        title: 'Kitchen project',
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

  it('returns an empty audit history for a new slab', async () => {
    const slab = await createSlab();

    const response = await fetch(`${slabsUrl()}/${slab.body.id}/audit`);
    expect(response.status).toBe(200);

    const body = await response.json() as Record<string, unknown>;
    expect(body.data).toEqual([]);
  });

  it('records a reserved audit event when a slab is attached to a project', async () => {
    const slab = await createSlab();
    const projectResponse = await fetch(projectsUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerId: SEEDED_CUSTOMER_ID,
        title: 'Audit project',
        ownerUserId: ACTOR_USER_ID
      })
    });
    const project = await projectResponse.json() as Record<string, unknown>;

    await fetch(projectSlabsUrl(project.id as string), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, slabId: slab.body.id })
    });

    const response = await fetch(`${slabsUrl()}/${slab.body.id}/audit`);
    const body = await response.json() as Record<string, unknown>;
    const events = body.data as Array<Record<string, unknown>>;

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: 'reserved',
      toProjectId: project.id,
      actorUserId: ACTOR_USER_ID
    });
  });

  const createProject = async (title: string): Promise<Record<string, unknown>> => {
    const response = await fetch(projectsUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, customerId: SEEDED_CUSTOMER_ID, title, ownerUserId: ACTOR_USER_ID })
    });
    return await response.json() as Record<string, unknown>;
  };

  const attachSlab = (projectId: string, slabId: unknown): Promise<Response> =>
    fetch(projectSlabsUrl(projectId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, slabId })
    });

  it('detaching a shop-owned slab returns it to available and records a released event', async () => {
    const slab = await createSlab();
    const project = await createProject('Detach shop project');
    await attachSlab(project.id as string, slab.body.id);

    const detachResponse = await fetch(`${projectSlabsUrl(project.id as string)}/${slab.body.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(detachResponse.status).toBe(200);

    const slabAfter = await (await fetch(`${slabsUrl()}/${slab.body.id}`)).json() as Record<string, unknown>;
    expect(slabAfter.availability).toBe('available');

    const events = (await (await fetch(`${slabsUrl()}/${slab.body.id}/audit`)).json() as Record<string, unknown>).data as Array<Record<string, unknown>>;
    expect(events.some((e) => e.action === 'released' && e.fromProjectId === project.id)).toBe(true);
  });

  it('blocks detaching customer-supplied material and keeps it reserved', async () => {
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });
    const project = await createProject('Detach restricted project');
    await attachSlab(project.id as string, slab.body.id);

    const detachResponse = await fetch(`${projectSlabsUrl(project.id as string)}/${slab.body.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(detachResponse.status).toBe(409);

    const slabAfter = await (await fetch(`${slabsUrl()}/${slab.body.id}`)).json() as Record<string, unknown>;
    expect(slabAfter.availability).toBe('reserved');

    const events = (await (await fetch(`${slabsUrl()}/${slab.body.id}/audit`)).json() as Record<string, unknown>).data as Array<Record<string, unknown>>;
    expect(events.some((e) => e.action === 'released')).toBe(false);
  });

  it('releases restricted material to shop stock, flipping ownership and availability', async () => {
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });

    const response = await fetch(`${slabsUrl()}/${slab.body.id}/release-to-shop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'Customer abandoned the job' })
    });
    expect(response.status).toBe(200);

    const slabAfter = await (await fetch(`${slabsUrl()}/${slab.body.id}`)).json() as Record<string, unknown>;
    expect(slabAfter.ownership).toBe('shop_owned');
    expect(slabAfter.availability).toBe('available');

    const events = (await (await fetch(`${slabsUrl()}/${slab.body.id}/audit`)).json() as Record<string, unknown>).data as Array<Record<string, unknown>>;
    expect(events.some((e) => e.action === 'released_to_shop' && e.reason === 'Customer abandoned the job')).toBe(true);
  });

  it('rejects release to shop stock without a reason', async () => {
    const slab = await createSlab({ ownership: 'job_purchased' });

    const response = await fetch(`${slabsUrl()}/${slab.body.id}/release-to-shop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(response.status).toBe(400);
  });

  it('forbids release to shop stock for non-managers', async () => {
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });

    const salespersonToken = await seedTestSession(app.get(DATABASE_POOL), 'salesperson');
    setTestAuthToken(salespersonToken);

    const response = await fetch(`${slabsUrl()}/${slab.body.id}/release-to-shop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'trying as salesperson' })
    });
    expect(response.status).toBe(403);
  });

  const createCustomer = async (name: string): Promise<Record<string, unknown>> => {
    const response = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, customerKind: 'company', name, companyName: name, status: 'lead', type: 'customer', ownerUserId: ACTOR_USER_ID })
    });
    return await response.json() as Record<string, unknown>;
  };

  const createProjectForCustomer = async (customerId: string, title: string): Promise<Record<string, unknown>> => {
    const response = await fetch(projectsUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, customerId, title, ownerUserId: ACTOR_USER_ID })
    });
    return await response.json() as Record<string, unknown>;
  };

  const reassign = (sourceProjectId: string, slabId: unknown, body: Record<string, unknown>): Promise<Response> =>
    fetch(`${projectSlabsUrl(sourceProjectId)}/${slabId}/reassign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, ...body })
    });

  it('blocks attaching customer-supplied material to a different customer job', async () => {
    const otherCustomer = await createCustomer('Foreign Owner Co');
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: otherCustomer.id });
    const project = await createProject('Wrong-customer attach');

    const response = await attachSlab(project.id as string, slab.body.id);
    expect(response.status).toBe(409);

    const slabAfter = await (await fetch(`${slabsUrl()}/${slab.body.id}`)).json() as Record<string, unknown>;
    expect(slabAfter.availability).toBe('available');

    const list = await (await fetch(projectSlabsUrl(project.id as string))).json() as Record<string, unknown>;
    expect(list.data).toHaveLength(0);
  });

  it('allows attaching customer-supplied material to its owning customer job', async () => {
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });
    const project = await createProject('Owner attach');

    const response = await attachSlab(project.id as string, slab.body.id);
    expect(response.status).toBe(201);
  });

  it('clears the owning customer when releasing customer-supplied material to shop stock', async () => {
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });

    const response = await fetch(`${slabsUrl()}/${slab.body.id}/release-to-shop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'Customer abandoned the job' })
    });
    expect(response.status).toBe(200);

    const slabAfter = await (await fetch(`${slabsUrl()}/${slab.body.id}`)).json() as Record<string, unknown>;
    expect(slabAfter.ownerCustomerId).toBeNull();
  });

  it('reassigns shop-owned material to another customer job and keeps it reserved', async () => {
    const slab = await createSlab();
    const source = await createProject('Reassign source');
    await attachSlab(source.id as string, slab.body.id);

    const otherCustomer = await createCustomer('Other Stone Co');
    const target = await createProjectForCustomer(otherCustomer.id as string, 'Reassign target');

    const response = await reassign(source.id as string, slab.body.id, {
      targetCustomerId: otherCustomer.id,
      targetProjectId: target.id,
      reason: 'Overage allocated to other job'
    });
    expect(response.status).toBe(200);

    const slabAfter = await (await fetch(`${slabsUrl()}/${slab.body.id}`)).json() as Record<string, unknown>;
    expect(slabAfter.availability).toBe('reserved');

    const events = (await (await fetch(`${slabsUrl()}/${slab.body.id}/audit`)).json() as Record<string, unknown>).data as Array<Record<string, unknown>>;
    expect(events.some((e) => e.action === 'reassigned' && e.fromProjectId === source.id && e.toProjectId === target.id)).toBe(true);

    const sourceList = await (await fetch(projectSlabsUrl(source.id as string))).json() as Record<string, unknown>;
    expect(sourceList.data).toHaveLength(0);
  });

  it('blocks reassigning customer-supplied material to a different customer', async () => {
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });
    const source = await createProject('CS source');
    await attachSlab(source.id as string, slab.body.id);

    const otherCustomer = await createCustomer('Different Co');
    const target = await createProjectForCustomer(otherCustomer.id as string, 'CS target');

    const response = await reassign(source.id as string, slab.body.id, {
      targetCustomerId: otherCustomer.id,
      targetProjectId: target.id,
      reason: 'should be blocked'
    });
    expect(response.status).toBe(409);

    const sourceList = await (await fetch(projectSlabsUrl(source.id as string))).json() as Record<string, unknown>;
    expect(sourceList.data).toHaveLength(1);
  });

  it('allows reassigning customer-supplied material within the same customer', async () => {
    const slab = await createSlab({ ownership: 'customer_supplied', ownerCustomerId: SEEDED_CUSTOMER_ID });
    const source = await createProject('CS same source');
    await attachSlab(source.id as string, slab.body.id);
    const target = await createProject('CS same target');

    const response = await reassign(source.id as string, slab.body.id, {
      targetCustomerId: SEEDED_CUSTOMER_ID,
      targetProjectId: target.id,
      reason: 'moved to other room job'
    });
    expect(response.status).toBe(200);
  });

  it('forbids reassignment for non-managers', async () => {
    const slab = await createSlab();
    const source = await createProject('Forbid source');
    await attachSlab(source.id as string, slab.body.id);
    const target = await createProject('Forbid target');

    const salespersonToken = await seedTestSession(app.get(DATABASE_POOL), 'salesperson');
    setTestAuthToken(salespersonToken);

    const response = await reassign(source.id as string, slab.body.id, {
      targetCustomerId: SEEDED_CUSTOMER_ID,
      targetProjectId: target.id,
      reason: 'as salesperson'
    });
    expect(response.status).toBe(403);
  });
});
