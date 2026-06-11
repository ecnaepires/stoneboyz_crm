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

let app: INestApplication;
let baseUrl: string;

const resetDatabase = async (): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');

  const migrationsDir = join(process.cwd(), 'db/migrations');
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    await pool.query(await readFile(join(migrationsDir, migrationFile), 'utf8'));
  }

  await pool.query(await readFile(join(process.cwd(), 'db/seeds/test-customers.sql'), 'utf8'));
};

const activityTypesUrl = () => `${baseUrl}/api/v1/activity-types`;
const eventsUrl = () => `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events`;

const listActivityTypes = async (includeArchived = false): Promise<Array<Record<string, unknown>>> => {
  const response = await fetch(`${activityTypesUrl()}${includeArchived ? '?includeArchived=true' : ''}`);
  expect(response.status).toBe(200);
  return ((await response.json()) as { data: Array<Record<string, unknown>> }).data;
};

const createActivityType = async (body: Record<string, unknown>) => {
  const response = await fetch(activityTypesUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: (await response.json()) as Record<string, unknown> };
};

const createEvent = async (body: Record<string, unknown>) => {
  const response = await fetch(eventsUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventType: 'appointment',
      title: 'Catalog event',
      scheduledAt: '2026-07-06T14:00:00.000Z',
      durationMinutes: 60,
      assigneeIds: [],
      ...body,
    }),
  });
  return { response, body: (await response.json()) as Record<string, unknown> };
};

describe('activity types API', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    baseUrl = await app.getUrl();
    await resetDatabase();
    setTestAuthToken(await seedTestSession(app.get(DATABASE_POOL)));
  });

  beforeEach(async () => {
    await resetDatabase();
    setTestAuthToken(await seedTestSession(app.get(DATABASE_POOL)));
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('lists the seeded catalog in sort order with expected flags', async () => {
    const types = await listActivityTypes();
    expect(types.map((type) => type.seedSlug)).toEqual([
      'template',
      'deposit',
      'material',
      'cut',
      'fabrication',
      'install',
      'invoice',
      'repair',
      'other',
    ]);
    expect(types[0]).toMatchObject({
      name: 'Template',
      color: '#00ff4c',
      pipelineStage: 'template',
      countsSquareFootage: true,
      autoscheduleEligible: true,
      usesTemplateKind: true,
      defaultDurationMinutes: 90,
      sortOrder: 1,
    });
    expect(types[7]).toMatchObject({ seedSlug: 'repair', autoscheduleEligible: false });
    expect(types[8]).toMatchObject({ seedSlug: 'other', autoscheduleEligible: false });
  });

  it('creates, rejects duplicate names, patches, and archives custom types', async () => {
    const created = await createActivityType({ name: 'Tearout', color: '#123abc' });
    expect(created.response.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Tearout',
      seedSlug: null,
      countsSquareFootage: false,
      autoscheduleEligible: false,
      usesTemplateKind: false,
      defaultDurationMinutes: 60,
    });

    const duplicate = await createActivityType({ name: 'tearout', color: '#123abc' });
    expect(duplicate.response.status).toBe(409);

    const patchResponse = await fetch(`${activityTypesUrl()}/${created.body.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ countsSquareFootage: true, autoscheduleEligible: true, sortOrder: 20 }),
    });
    expect(patchResponse.status).toBe(200);
    expect(await patchResponse.json()).toMatchObject({ countsSquareFootage: true, autoscheduleEligible: true, sortOrder: 20 });

    const archiveResponse = await fetch(`${activityTypesUrl()}/${created.body.id}/archive`, { method: 'POST' });
    expect(archiveResponse.status).toBe(200);
    expect((await listActivityTypes()).some((type) => type.id === created.body.id)).toBe(false);
    expect((await listActivityTypes(true)).some((type) => type.id === created.body.id)).toBe(true);
  });

  it('reorders existing activity types when sort order changes', async () => {
    const types = await listActivityTypes();
    const template = types[0] as Record<string, unknown>;

    const patchResponse = await fetch(`${activityTypesUrl()}/${template.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sortOrder: 2 }),
    });

    expect(patchResponse.status).toBe(200);
    const reordered = await listActivityTypes();
    expect(reordered.slice(0, 3).map((type) => type.seedSlug)).toEqual(['deposit', 'template', 'material']);
    expect(reordered.slice(0, 3).map((type) => type.sortOrder)).toEqual([1, 2, 3]);
  });

  it('inserts custom activity types into the requested sort order', async () => {
    const created = await createActivityType({ name: 'Site Visit', color: '#123abc', sortOrder: 2 });
    expect(created.response.status).toBe(201);

    const reordered = await listActivityTypes();
    expect(reordered.slice(0, 4).map((type) => type.name)).toEqual(['Template', 'Site Visit', 'Deposit', 'Material']);
    expect(reordered.slice(0, 4).map((type) => type.sortOrder)).toEqual([1, 2, 3, 4]);
  });

  it('requires admin for mutations', async () => {
    setTestAuthToken(await seedTestSession(app.get(DATABASE_POOL), 'salesperson'));
    const post = await createActivityType({ name: 'Service Call', color: '#abcdef' });
    expect(post.response.status).toBe(403);

    const template = (await listActivityTypes())[0] as Record<string, unknown>;
    const patch = await fetch(`${activityTypesUrl()}/${template.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ color: '#111111' }),
    });
    expect(patch.status).toBe(403);
    const archive = await fetch(`${activityTypesUrl()}/${template.id}/archive`, { method: 'POST' });
    expect(archive.status).toBe(403);
  });

  it('accepts activityTypeId or legacy appointmentType on event writes and rejects mismatches/archived types', async () => {
    const types = await listActivityTypes();
    const install = types.find((type) => type.seedSlug === 'install') as Record<string, unknown>;
    const template = types.find((type) => type.seedSlug === 'template') as Record<string, unknown>;

    const byId = await createEvent({ activityTypeId: install.id });
    expect(byId.response.status).toBe(201);
    expect(byId.body).toMatchObject({ activityTypeId: install.id, appointmentType: 'install' });

    const legacy = await createEvent({ appointmentType: 'install', scheduledAt: '2026-07-07T14:00:00.000Z' });
    expect(legacy.response.status).toBe(201);
    expect(legacy.body).toMatchObject({ activityTypeId: install.id, appointmentType: 'install' });

    const mismatch = await createEvent({ activityTypeId: install.id, appointmentType: 'template' });
    expect(mismatch.response.status).toBe(400);

    const archiveResponse = await fetch(`${activityTypesUrl()}/${template.id}/archive`, { method: 'POST' });
    expect(archiveResponse.status).toBe(200);
    const archived = await createEvent({ activityTypeId: template.id });
    expect(archived.response.status).toBe(400);
  });

  it('allows templateKind only for types with usesTemplateKind', async () => {
    const install = (await listActivityTypes()).find((type) => type.seedSlug === 'install') as Record<string, unknown>;
    const response = await createEvent({ activityTypeId: install.id, templateKind: 'physical_template' });
    expect(response.response.status).toBe(400);
    expect(response.body.details.templateKind).toBeDefined();
  });

  it('filters global calendar events by activityTypeIds and legacy appointmentTypes', async () => {
    const types = await listActivityTypes();
    const install = types.find((type) => type.seedSlug === 'install') as Record<string, unknown>;
    const template = types.find((type) => type.seedSlug === 'template') as Record<string, unknown>;
    await createEvent({ activityTypeId: install.id, scheduledAt: '2026-07-06T14:00:00.000Z' });
    await createEvent({ activityTypeId: template.id, scheduledAt: '2026-07-06T15:00:00.000Z' });

    const byId = await fetch(`${baseUrl}/api/v1/events?from=2026-07-06&to=2026-07-07&activityTypeIds=${install.id}`);
    const byIdBody = await byId.json() as { data: Array<Record<string, unknown>> };
    expect(byId.status).toBe(200);
    expect(byIdBody.data).toHaveLength(1);
    expect(byIdBody.data[0]).toMatchObject({ activityTypeId: install.id, activityTypeName: 'Install', activityTypeColor: '#bfdbfe' });

    const legacy = await fetch(`${baseUrl}/api/v1/events?from=2026-07-06&to=2026-07-07&appointmentTypes=install`);
    const legacyBody = await legacy.json() as { data: Array<Record<string, unknown>> };
    expect(legacy.status).toBe(200);
    expect(legacyBody.data).toHaveLength(1);
    expect(legacyBody.data[0]).toMatchObject({ activityTypeId: install.id });
  });
});
