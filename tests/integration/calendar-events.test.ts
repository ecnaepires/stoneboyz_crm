import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
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

let app: INestApplication;
let baseUrl: string;
let pool: Pool;

const resetDatabase = async (): Promise<void> => {
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

const eventsUrl = (customerId = SEEDED_CUSTOMER_ID): string =>
  `${baseUrl}/api/v1/customers/${customerId}/events`;

const createAssignee = async (name: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/assignees`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, assigneeType: 'crew' })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createCustomer = async (name: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerKind: 'company',
      name,
      companyName: name,
      status: 'lead',
      type: 'customer',
      ownerUserId: ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createEvent = async (
  customerId: string,
  body: Record<string, unknown> = {}
): Promise<Record<string, unknown>> => {
  const response = await fetch(eventsUrl(customerId), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      eventType: 'appointment',
      appointmentType: 'template',
      title: 'Template appointment',
      scheduledAt: '2026-06-03T14:00:00.000Z',
      durationMinutes: 90,
      assigneeIds: [],
      ...body
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

describe('calendar events', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    pool = app.get<Pool>(DATABASE_POOL);
    await resetDatabase();
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  beforeEach(async () => {
    await resetDatabase();
    const token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('lists events across accounts in one response', async () => {
    const secondCustomer = await createCustomer('Beta Countertops');
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Acme template',
      scheduledAt: '2026-06-03T14:00:00.000Z'
    });
    await createEvent(String(secondCustomer.id), {
      title: 'Beta install',
      appointmentType: 'install',
      scheduledAt: '2026-06-04T16:00:00.000Z'
    });

    const response = await fetch(`${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.map((event: { title: string }) => event.title)).toEqual([
      'Acme template',
      'Beta install'
    ]);
    expect(body.data[0]).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      customerName: 'Acme Stone Works',
      projectTitle: null,
      jobNumber: null
    });
    expect(body.data[1]).toMatchObject({
      customerId: secondCustomer.id,
      customerName: 'Beta Countertops'
    });
  });

  it('filters by appointment type and customer', async () => {
    const secondCustomer = await createCustomer('Beta Countertops');
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Acme template',
      appointmentType: 'template',
      scheduledAt: '2026-06-03T14:00:00.000Z'
    });
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Acme install',
      appointmentType: 'install',
      scheduledAt: '2026-06-04T14:00:00.000Z'
    });
    await createEvent(String(secondCustomer.id), {
      title: 'Beta install',
      appointmentType: 'install',
      scheduledAt: '2026-06-05T14:00:00.000Z'
    });

    const response = await fetch(
      `${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08&appointmentTypes=install&customerId=${SEEDED_CUSTOMER_ID}`
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((event: { title: string }) => event.title)).toEqual([
      'Acme install'
    ]);
  });

  it('filters by status and hideCompleted', async () => {
    const scheduled = await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Scheduled template',
      scheduledAt: '2026-06-03T14:00:00.000Z'
    });
    const completed = await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Completed template',
      scheduledAt: '2026-06-04T14:00:00.000Z'
    });
    await app.get<Pool>(DATABASE_POOL).query(
      "UPDATE scheduled_events SET status = 'completed' WHERE id = $1",
      [String(completed.id)]
    );

    const statusResponse = await fetch(
      `${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08&statuses=completed`
    );
    const statusBody = await statusResponse.json();
    const hideCompletedResponse = await fetch(
      `${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08&hideCompleted=true`
    );
    const hideCompletedBody = await hideCompletedResponse.json();

    expect(statusResponse.status).toBe(200);
    expect(statusBody.data.map((event: { title: string }) => event.title)).toEqual([
      'Completed template'
    ]);
    expect(hideCompletedResponse.status).toBe(200);
    expect(hideCompletedBody.data.map((event: { id: string }) => event.id)).toEqual([
      String(scheduled.id)
    ]);
  });

  it('filters by assignee id', async () => {
    const installCrew = await createAssignee('Install Crew');
    const templateCrew = await createAssignee('Template Crew');
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Assigned install',
      appointmentType: 'install',
      scheduledAt: '2026-06-03T14:00:00.000Z',
      assigneeIds: [String(installCrew.id)]
    });
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Assigned template',
      appointmentType: 'template',
      scheduledAt: '2026-06-04T14:00:00.000Z',
      assigneeIds: [String(templateCrew.id)]
    });

    const response = await fetch(
      `${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08&assigneeIds=${String(installCrew.id)}`
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((event: { title: string }) => event.title)).toEqual([
      'Assigned install'
    ]);
  });

  it('treats to as an exclusive upper bound', async () => {
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'Inside range',
      scheduledAt: '2026-06-07T23:59:00.000Z'
    });
    await createEvent(SEEDED_CUSTOMER_ID, {
      title: 'At exclusive boundary',
      scheduledAt: '2026-06-08T00:00:00.000Z'
    });

    const response = await fetch(`${baseUrl}/api/v1/events?from=2026-06-01&to=2026-06-08`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((event: { title: string }) => event.title)).toEqual(['Inside range']);
  });

  it('returns 400 when from or to is missing', async () => {
    const response = await fetch(`${baseUrl}/api/v1/events?from=2026-06-01`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
    expect(body.details.to).toBeDefined();
  });

  it('returns 400 when range is longer than 62 days', async () => {
    const response = await fetch(`${baseUrl}/api/v1/events?from=2026-06-01&to=2026-08-03`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
    expect(body.details.to).toContain('Range must be 62 days or fewer');
  });

  // ── sqft enrichment helpers ───────────────────────────────────────

  const createProjectForSqft = async (): Promise<string> => {
    const r = await fetch(`${baseUrl}/api/v1/job-templates`);
    const body = await r.json() as Array<{ id: string; isDefault: boolean }>;
    const jobTemplateId = (body.find((t) => t.isDefault) ?? body[0])?.id ?? '';
    const response = await fetch(`${baseUrl}/api/v1/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customerId: SEEDED_CUSTOMER_ID,
        title: 'Sqft Test Job',
        jobTemplateId,
        ownerUserId: ACTOR_USER_ID,
      }),
    });
    expect(response.status).toBe(201);
    return ((await response.json()) as { id: string }).id;
  };

  const insertQuoteWithMaterialLine = async (
    projectId: string,
    sqft: number,
    status: 'draft' | 'sent' | 'accepted' = 'accepted',
    updatedAtOffset = 0,
  ): Promise<void> => {
    const quoteId = randomUUID();
    const areaId = randomUUID();
    await pool.query(
      `INSERT INTO quotes (id, customer_id, project_id, quote_number, title, status, discount_cents, tax_rate_bps, updated_at)
       VALUES ($1, $2, $3, $4, 'Test Quote', $5, 0, 0, now() + ($6 || ' seconds')::interval)`,
      [quoteId, SEEDED_CUSTOMER_ID, projectId, `Q-${quoteId.slice(0, 8)}`, status, updatedAtOffset],
    );
    await pool.query(
      `INSERT INTO quote_areas (id, quote_id, sort_order, name) VALUES ($1, $2, 0, 'Kitchen')`,
      [areaId, quoteId],
    );
    await pool.query(
      `INSERT INTO generated_price_lines (quote_area_id, category, label, quantity, unit, unit_price_cents, sort_order)
       VALUES ($1, 'material', 'Granite', $2, 'sqft', 100, 0)`,
      [areaId, sqft],
    );
  };

  const insertQuoteWithDrawing = async (
    projectId: string,
    combinedSqFt: number,
    status: 'draft' | 'sent' = 'draft',
    updatedAtOffset = 0,
  ): Promise<void> => {
    // A rectangle 144" × combinedSqFt" = combinedSqFt sq ft (144 * combinedSqFt sq in / 144 = combinedSqFt sq ft)
    const widthIn = combinedSqFt;
    const pieceId = randomUUID();
    const v1 = randomUUID(); const v2 = randomUUID(); const v3 = randomUUID(); const v4 = randomUUID();
    const layout = {
      schemaVersion: 2,
      pieces: [{
        pieceId,
        kind: 'countertop',
        label: 'P1',
        positionIn: { x: 0, y: 0 },
        rotationDeg: 0,
        outline: {
          vertices: [
            { vertexId: v1, xIn: 0, yIn: 0 },
            { vertexId: v2, xIn: 144, yIn: 0 },
            { vertexId: v3, xIn: 144, yIn: widthIn },
            { vertexId: v4, xIn: 0, yIn: widthIn },
          ],
        },
        edges: [],
        cutouts: [],
      }],
      sinks: [],
      annotations: [],
      legend: [],
    };

    const quoteId = randomUUID();
    const areaId = randomUUID();
    await pool.query(
      `INSERT INTO quotes (id, customer_id, project_id, quote_number, title, status, discount_cents, tax_rate_bps, updated_at)
       VALUES ($1, $2, $3, $4, 'Draft Quote', $5, 0, 0, now() + ($6 || ' seconds')::interval)`,
      [quoteId, SEEDED_CUSTOMER_ID, projectId, `Q-${quoteId.slice(0, 8)}`, status, updatedAtOffset],
    );
    await pool.query(
      `INSERT INTO quote_areas (id, quote_id, sort_order, name) VALUES ($1, $2, 0, 'Kitchen')`,
      [areaId, quoteId],
    );
    await pool.query(
      `INSERT INTO drawing_revisions (quote_area_id, revision_number, layout) VALUES ($1, 1, $2)`,
      [areaId, JSON.stringify(layout)],
    );
  };

  const getSqftEligibleActivityTypeId = async (): Promise<string | null> => {
    const r = await pool.query<{ id: string }>(
      `SELECT at.id FROM activity_types at JOIN shops s ON s.id = at.shop_id
       WHERE s.slug = 'stone-boyz' AND at.counts_square_footage = true LIMIT 1`,
    );
    return r.rows[0]?.id ?? null;
  };

  const getNonSqftActivityTypeId = async (): Promise<string | null> => {
    const r = await pool.query<{ id: string }>(
      `SELECT at.id FROM activity_types at JOIN shops s ON s.id = at.shop_id
       WHERE s.slug = 'stone-boyz' AND at.counts_square_footage = false LIMIT 1`,
    );
    return r.rows[0]?.id ?? null;
  };

  const globalEventsUrl = (from = '2026-07-01', to = '2026-07-08') =>
    `${baseUrl}/api/v1/events?from=${from}&to=${to}`;

  // ── sqft enrichment tests ─────────────────────────────────────────

  it('sqft: accepted quote material quantity → sqft non-estimate', async () => {
    const activityTypeId = await getSqftEligibleActivityTypeId();
    if (!activityTypeId) return;
    const projectId = await createProjectForSqft();
    await insertQuoteWithMaterialLine(projectId, 42, 'accepted');
    await createEvent(SEEDED_CUSTOMER_ID, {
      eventType: 'appointment',
      activityTypeId,
      appointmentType: null,
      scheduledAt: '2026-07-03T09:00:00.000Z',
      projectId,
    });

    const body = await fetch(globalEventsUrl()).then((r) => r.json()) as { data: Array<{ sqft: number; sqftIsEstimate: boolean }> };

    expect(body.data[0]?.sqft).toBe(42);
    expect(body.data[0]?.sqftIsEstimate).toBe(false);
  });

  it('sqft: draft quote drawing-derived; sent wins over older draft', async () => {
    const activityTypeId = await getSqftEligibleActivityTypeId();
    if (!activityTypeId) return;
    const projectId = await createProjectForSqft();
    // Older draft with sqft 10
    await insertQuoteWithDrawing(projectId, 10, 'draft', -10);
    // Newer sent with sqft 20 — this one should win
    await insertQuoteWithDrawing(projectId, 20, 'sent', 0);
    await createEvent(SEEDED_CUSTOMER_ID, {
      eventType: 'appointment',
      activityTypeId,
      appointmentType: null,
      scheduledAt: '2026-07-03T09:00:00.000Z',
      projectId,
    });

    const body = await fetch(globalEventsUrl()).then((r) => r.json()) as { data: Array<{ sqft: number; sqftIsEstimate: boolean }> };

    expect(body.data[0]?.sqft).toBe(20);
    expect(body.data[0]?.sqftIsEstimate).toBe(true);
  });

  it('sqft: accepted quote takes priority over draft quote', async () => {
    const activityTypeId = await getSqftEligibleActivityTypeId();
    if (!activityTypeId) return;
    const projectId = await createProjectForSqft();
    await insertQuoteWithMaterialLine(projectId, 55, 'accepted');
    await insertQuoteWithDrawing(projectId, 99, 'draft');
    await createEvent(SEEDED_CUSTOMER_ID, {
      eventType: 'appointment',
      activityTypeId,
      appointmentType: null,
      scheduledAt: '2026-07-03T09:00:00.000Z',
      projectId,
    });

    const body = await fetch(globalEventsUrl()).then((r) => r.json()) as { data: Array<{ sqft: number; sqftIsEstimate: boolean }> };

    expect(body.data[0]?.sqft).toBe(55);
    expect(body.data[0]?.sqftIsEstimate).toBe(false);
  });

  it('sqft: rejected/expired-only quotes → sqft 0, not estimate', async () => {
    const activityTypeId = await getSqftEligibleActivityTypeId();
    if (!activityTypeId) return;
    const projectId = await createProjectForSqft();
    const quoteId = randomUUID();
    const areaId = randomUUID();
    await pool.query(
      `INSERT INTO quotes (id, customer_id, project_id, quote_number, title, status, discount_cents, tax_rate_bps)
       VALUES ($1, $2, $3, $4, 'Rejected Quote', 'rejected', 0, 0)`,
      [quoteId, SEEDED_CUSTOMER_ID, projectId, `Q-${quoteId.slice(0, 8)}`],
    );
    await pool.query(
      `INSERT INTO quote_areas (id, quote_id, sort_order, name) VALUES ($1, $2, 0, 'Kitchen')`,
      [areaId, quoteId],
    );
    await pool.query(
      `INSERT INTO generated_price_lines (quote_area_id, category, label, quantity, unit, unit_price_cents, sort_order)
       VALUES ($1, 'material', 'Granite', 42, 'sqft', 100, 0)`,
      [areaId],
    );
    await createEvent(SEEDED_CUSTOMER_ID, {
      eventType: 'appointment',
      activityTypeId,
      appointmentType: null,
      scheduledAt: '2026-07-03T09:00:00.000Z',
      projectId,
    });

    const body = await fetch(globalEventsUrl()).then((r) => r.json()) as { data: Array<{ sqft: number; sqftIsEstimate: boolean }> };

    expect(body.data[0]?.sqft).toBe(0);
    expect(body.data[0]?.sqftIsEstimate).toBe(false);
  });

  it('sqft: null for non-sqft activity type and for event with no project', async () => {
    const nonSqftTypeId = await getNonSqftActivityTypeId();
    const projectId = await createProjectForSqft();
    await insertQuoteWithMaterialLine(projectId, 42, 'accepted');

    if (nonSqftTypeId) {
      await createEvent(SEEDED_CUSTOMER_ID, {
        eventType: 'appointment',
        activityTypeId: nonSqftTypeId,
        appointmentType: null,
        scheduledAt: '2026-07-03T09:00:00.000Z',
        projectId,
      });
    }
    await createEvent(SEEDED_CUSTOMER_ID, {
      eventType: 'appointment',
      scheduledAt: '2026-07-03T10:00:00.000Z',
    });

    const body = await fetch(globalEventsUrl()).then((r) => r.json()) as { data: Array<{ sqft: unknown; sqftIsEstimate: boolean }> };

    for (const event of body.data) {
      expect(event.sqft).toBeNull();
      expect(event.sqftIsEstimate).toBe(false);
    }
  });

  it('sqft: two qualifying events on same project both carry full sqft', async () => {
    const activityTypeId = await getSqftEligibleActivityTypeId();
    if (!activityTypeId) return;
    const projectId = await createProjectForSqft();
    await insertQuoteWithMaterialLine(projectId, 77, 'accepted');
    await createEvent(SEEDED_CUSTOMER_ID, {
      eventType: 'appointment',
      activityTypeId,
      appointmentType: null,
      scheduledAt: '2026-07-03T09:00:00.000Z',
      projectId,
    });
    await createEvent(SEEDED_CUSTOMER_ID, {
      eventType: 'appointment',
      activityTypeId,
      appointmentType: null,
      scheduledAt: '2026-07-03T10:00:00.000Z',
      projectId,
    });

    const body = await fetch(globalEventsUrl()).then((r) => r.json()) as { data: Array<{ sqft: number }> };

    expect(body.data).toHaveLength(2);
    expect(body.data[0]?.sqft).toBe(77);
    expect(body.data[1]?.sqft).toBe(77);
  });
});
