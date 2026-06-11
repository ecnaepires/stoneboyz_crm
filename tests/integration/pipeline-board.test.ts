import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module.js';
import { DATABASE_POOL } from '../../apps/api/src/database.provider.js';
import { seedTestSession, TEST_ACTOR_USER_ID } from './helpers/auth.js';
import { getDefaultJobTemplateId } from './helpers/job-templates.js';
import { setTestAuthToken } from './helpers/test-auth.js';

const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';

interface Card {
  id: string;
  jobNumber: string;
  title: string;
  city: string | null;
  pipelineStage: string;
  daysInStage: number;
  ownerUserId: string;
  customerId: string;
  customerName: string;
  nextAppointment: { appointmentType: string | null; scheduledAt: string } | null;
  quoteValueCents: number;
  squareFeet: number;
  openIssueCount: number;
}

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
let pool: Pool;

const createProject = async (title = 'Pipeline Project'): Promise<Card['id']> => {
  const jobTemplateId = await getDefaultJobTemplateId(baseUrl);
  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ customerId: SEEDED_CUSTOMER_ID, title, jobTemplateId, ownerUserId: TEST_ACTOR_USER_ID })
  });
  expect(response.status).toBe(201);
  const body = (await response.json()) as { id: string };
  return body.id;
};

const setStage = async (projectId: string, stage: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}/stage`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ stage })
  });
  expect(response.status).toBe(200);
};

const archiveProject = async (projectId: string): Promise<void> => {
  const response = await fetch(`${baseUrl}/api/v1/projects/${projectId}/archive`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  expect(response.status).toBe(200);
};

const getBoard = async (queryString = ''): Promise<Card[]> => {
  const response = await fetch(`${baseUrl}/api/v1/pipeline${queryString}`);
  expect(response.status).toBe(200);
  return (await response.json()) as Card[];
};

const insertQuote = async (params: {
  projectId: string;
  status: string;
  discountCents?: number;
  taxRateBps?: number;
  updatedAt?: string;
}): Promise<string> => {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO quotes (id, customer_id, project_id, quote_number, title, status, discount_cents, tax_rate_bps, updated_at)
     VALUES ($1, $2, $3, $4, 'Quote', $5, $6, $7, COALESCE($8::timestamptz, now()))`,
    [
      id,
      SEEDED_CUSTOMER_ID,
      params.projectId,
      `Q-${id.slice(0, 8)}`,
      params.status,
      params.discountCents ?? 0,
      params.taxRateBps ?? 0,
      params.updatedAt ?? null
    ]
  );
  return id;
};

const insertLineItem = async (params: {
  quoteId: string;
  qty: number;
  qtyUnit: string;
  unitPriceCents: number;
  laborPriceCents?: number;
}): Promise<void> => {
  await pool.query(
    `INSERT INTO quote_line_items (quote_id, stone_type, qty, qty_unit, unit_price_cents, labor_price_cents)
     VALUES ($1, 'Granite', $2, $3, $4, $5)`,
    [params.quoteId, params.qty, params.qtyUnit, params.unitPriceCents, params.laborPriceCents ?? 0]
  );
};

const insertEvent = async (params: {
  projectId: string;
  appointmentType: string;
  scheduledAt: string;
  status: string;
}): Promise<void> => {
  const activityTypeResult = await pool.query<{ id: string }>(
    `
      SELECT at.id
      FROM activity_types at
      JOIN shops s ON s.id = at.shop_id
      WHERE s.slug = 'stone-boyz'
        AND at.seed_slug = $1
      LIMIT 1
    `,
    [params.appointmentType]
  );
  const activityTypeId = activityTypeResult.rows[0]?.id;

  await pool.query(
    `INSERT INTO scheduled_events (customer_id, project_id, event_type, activity_type_id, appointment_type, title, scheduled_at, status)
     VALUES ($1, $2, 'appointment', $3, $4, 'Appt', $5, $6)`,
    [SEEDED_CUSTOMER_ID, params.projectId, activityTypeId, params.appointmentType, params.scheduledAt, params.status]
  );
};

const insertIssue = async (projectId: string, status: string): Promise<void> => {
  await pool.query(
    `INSERT INTO issues (customer_id, project_id, type, severity, status, description, reported_by_user_id)
     VALUES ($1, $2, 'other', 'medium', $3, 'Issue', $4)`,
    [SEEDED_CUSTOMER_ID, projectId, status, TEST_ACTOR_USER_ID]
  );
};

describe('pipeline board API', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    baseUrl = await app.getUrl();
    pool = app.get<Pool>(DATABASE_POOL);
    await resetDatabase(app);
    setTestAuthToken(await seedTestSession(pool));
  });

  beforeEach(async () => {
    await resetDatabase(app);
    setTestAuthToken(await seedTestSession(pool));
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it('returns a card per non-archived project with the expected fields', async () => {
    const projectId = await createProject('Alpha Job');
    const archivedId = await createProject('Archived Job');
    await archiveProject(archivedId);

    const board = await getBoard();

    expect(board.map((card) => card.id)).toContain(projectId);
    expect(board.map((card) => card.id)).not.toContain(archivedId);

    const card = board.find((entry) => entry.id === projectId) as Card;
    expect(card.title).toBe('Alpha Job');
    expect(card.pipelineStage).toBe('new');
    expect(typeof card.daysInStage).toBe('number');
    expect(card.daysInStage).toBeGreaterThanOrEqual(0);
    expect(card.ownerUserId).toBe(TEST_ACTOR_USER_ID);
    expect(card.customerName.length).toBeGreaterThan(0);
    expect(card.jobNumber.length).toBeGreaterThan(0);
    expect(card.nextAppointment).toBeNull();
    expect(card.quoteValueCents).toBe(0);
    expect(card.squareFeet).toBe(0);
    expect(card.openIssueCount).toBe(0);
  });

  it('returns the soonest future scheduled or confirmed appointment', async () => {
    const projectId = await createProject();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const soon = new Date(Date.now() + 86_400_000).toISOString();
    const later = new Date(Date.now() + 2 * 86_400_000).toISOString();

    await insertEvent({ projectId, appointmentType: 'template', scheduledAt: past, status: 'scheduled' });
    await insertEvent({ projectId, appointmentType: 'install', scheduledAt: later, status: 'scheduled' });
    await insertEvent({ projectId, appointmentType: 'install', scheduledAt: soon, status: 'cancelled' });
    await insertEvent({ projectId, appointmentType: 'template', scheduledAt: soon, status: 'confirmed' });

    const board = await getBoard();
    const card = board.find((entry) => entry.id === projectId) as Card;

    expect(card.nextAppointment).not.toBeNull();
    expect(card.nextAppointment?.appointmentType).toBe('template');
    expect(card.nextAppointment?.scheduledAt).toBe(soon);
  });

  it('uses the accepted quote for value and square footage', async () => {
    const projectId = await createProject();

    const sentQuote = await insertQuote({ projectId, status: 'sent', updatedAt: new Date().toISOString() });
    await insertLineItem({ quoteId: sentQuote, qty: 99, qtyUnit: 'sqft', unitPriceCents: 100 });

    const acceptedQuote = await insertQuote({
      projectId,
      status: 'accepted',
      updatedAt: new Date(Date.now() - 86_400_000).toISOString()
    });
    await insertLineItem({ quoteId: acceptedQuote, qty: 5, qtyUnit: 'sqft', unitPriceCents: 50_000 });

    const board = await getBoard();
    const card = board.find((entry) => entry.id === projectId) as Card;

    expect(card.quoteValueCents).toBe(250_000);
    expect(card.squareFeet).toBe(5);
  });

  it('counts only open and in-progress issues', async () => {
    const projectId = await createProject();
    await insertIssue(projectId, 'open');
    await insertIssue(projectId, 'in_progress');
    await insertIssue(projectId, 'resolved');
    await insertIssue(projectId, 'closed');

    const board = await getBoard();
    const card = board.find((entry) => entry.id === projectId) as Card;

    expect(card.openIssueCount).toBe(2);
  });

  it('applies stage, search, and ownerUserId filters', async () => {
    const alphaId = await createProject('Alpha');
    const betaId = await createProject('Beta');
    await setStage(alphaId, 'deposit');

    const byStage = await getBoard('?stage=deposit');
    expect(byStage.map((card) => card.id)).toEqual([alphaId]);

    const bySearch = await getBoard('?search=Beta');
    expect(bySearch.map((card) => card.id)).toEqual([betaId]);

    const byUnknownOwner = await getBoard('?ownerUserId=someone-else');
    expect(byUnknownOwner).toEqual([]);
  });
});
