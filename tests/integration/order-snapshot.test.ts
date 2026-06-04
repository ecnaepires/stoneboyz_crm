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

const getAuthHeaders = (): HeadersInit => ({
  'content-type': 'application/json'
});

let app: INestApplication;
let baseUrl: string;

const createCustomer = async (): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerKind: 'company',
      name: 'Snapshot Test Co',
      companyName: 'Snapshot Test Co',
      status: 'lead',
      type: 'customer',
      ownerUserId: ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createProject = async (customerId: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerId,
      title: 'Snapshot Job',
      description: 'Snapshot job description',
      status: 'draft',
      ownerUserId: ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createQuote = async (customerId: string, projectId: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/quotes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      title: 'Snapshot Quote',
      projectId
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createQuoteArea = async (customerId: string, quoteId: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/quotes/${quoteId}/areas`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      name: 'Kitchen',
      material: 'granite'
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const acceptQuote = async (customerId: string, quoteId: string): Promise<void> => {
  const sendResponse = await fetch(`${baseUrl}/api/v1/customers/${customerId}/quotes/${quoteId}/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
  });

  expect(sendResponse.status).toBe(200);

  const acceptResponse = await fetch(`${baseUrl}/api/v1/customers/${customerId}/quotes/${quoteId}/accept`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
  });

  expect(acceptResponse.status).toBe(200);
};

const convertQuoteToOrder = async (customerId: string, quoteId: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/quotes/${quoteId}/convert`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      saleDate: '2026-05-14'
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

describe('Order snapshot', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
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

  it('converts accepted Quote with 1 area → GET order includes that area', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));
    const quote = await createQuote(String(customer.id), String(project.id));
    const area = await createQuoteArea(String(customer.id), String(quote.id));

    await acceptQuote(String(customer.id), String(quote.id));
    const order = await convertQuoteToOrder(String(customer.id), String(quote.id));

    const response = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/orders/${order.id}`, {
      headers: getAuthHeaders()
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: order.id,
      quoteId: quote.id,
      areas: [
        {
          name: 'Kitchen',
          material: 'granite'
        }
      ]
    });
    expect(area.name).toBe('Kitchen');
  });

  it('converts accepted Quote with 0 areas → GET order returns areas: []', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));
    const quote = await createQuote(String(customer.id), String(project.id));

    // No areas added

    await acceptQuote(String(customer.id), String(quote.id));
    const order = await convertQuoteToOrder(String(customer.id), String(quote.id));

    const response = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/orders/${order.id}`, {
      headers: getAuthHeaders()
    });
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: order.id,
      quoteId: quote.id,
      areas: []
    });
  });

  it('converts accepted Quote with 2 areas → GET order returns both areas', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));
    const quote = await createQuote(String(customer.id), String(project.id));

    await createQuoteArea(String(customer.id), String(quote.id));

    const response2 = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/quotes/${quote.id}/areas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        name: 'Bathroom',
        material: 'marble'
      })
    });
    expect(response2.status).toBe(201);

    await acceptQuote(String(customer.id), String(quote.id));
    const order = await convertQuoteToOrder(String(customer.id), String(quote.id));

    const getResponse = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/orders/${order.id}`, {
      headers: getAuthHeaders()
    });
    const body = await getResponse.json() as Record<string, unknown>;

    expect(getResponse.status).toBe(200);
    expect(Array.isArray(body.areas)).toBe(true);
    expect((body.areas as unknown[]).length).toBe(2);
    expect(body.areas).toMatchObject([
      { name: 'Kitchen', material: 'granite' },
      { name: 'Bathroom', material: 'marble' }
    ]);
  });

  it('editing QuoteArea after conversion → GET order still returns original snapshot values', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));
    const quote = await createQuote(String(customer.id), String(project.id));
    const area = await createQuoteArea(String(customer.id), String(quote.id));

    await acceptQuote(String(customer.id), String(quote.id));
    const order = await convertQuoteToOrder(String(customer.id), String(quote.id));

    // Mutate source quote_area directly (API correctly blocks edits on accepted quotes)
    const pool = app.get<Pool>(DATABASE_POOL);
    await pool.query(
      `UPDATE quote_areas SET name = 'Master Bath', material = 'quartz' WHERE id = $1`,
      [area.id]
    );

    // Order snapshot must be unchanged
    const getResponse = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/orders/${order.id}`, {
      headers: getAuthHeaders()
    });
    const body = await getResponse.json() as Record<string, unknown>;

    expect(getResponse.status).toBe(200);
    expect(body.areas).toMatchObject([
      { name: 'Kitchen', material: 'granite' }
    ]);
  });

  it('starting template Activity with readyToTemplate=false → 422', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));

    const pool = app.get<Pool>(DATABASE_POOL);

    // Insert phase directly (no phases API endpoint required)
    const phaseResult = await pool.query<{ id: string }>(
      `INSERT INTO phases (id, customer_id, project_id, phase_number, name)
       VALUES (gen_random_uuid(), $1, $2, 1, 'Phase 1') RETURNING id`,
      [customer.id, project.id]
    );
    const phaseId = phaseResult.rows[0].id;

    // Insert checklist (ready_to_template defaults false)
    await pool.query(
      `INSERT INTO job_checklists (id, customer_id, project_id, phase_id)
       VALUES (gen_random_uuid(), $1, $2, $3)`,
      [customer.id, project.id, phaseId]
    );

    // Create template Activity linked to phase
    const createResponse = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        projectId: project.id,
        phaseId,
        eventType: 'appointment',
        appointmentType: 'template',
        title: 'Template Appointment',
        scheduledAt: '2026-06-01T09:00:00Z',
        durationMinutes: 60,
        assigneeUserIds: ['22222222-2222-4222-8222-222222222222']
      })
    });
    expect(createResponse.status).toBe(201);
    const event = await createResponse.json() as Record<string, unknown>;

    // Must confirm before start
    const confirmResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/confirm`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(confirmResponse.status).toBe(200);

    // Gating check: readyToTemplate=false → must reject
    const startResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/start`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(startResponse.status).toBe(422);
  });

  it('starting template Activity with readyToTemplate=true → 200', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));

    const pool = app.get<Pool>(DATABASE_POOL);

    const phaseResult = await pool.query<{ id: string }>(
      `INSERT INTO phases (id, customer_id, project_id, phase_number, name)
       VALUES (gen_random_uuid(), $1, $2, 1, 'Phase 1') RETURNING id`,
      [customer.id, project.id]
    );
    const phaseId = phaseResult.rows[0].id;

    // ready_to_template = true → gate passes
    await pool.query(
      `INSERT INTO job_checklists (id, customer_id, project_id, phase_id, ready_to_template)
       VALUES (gen_random_uuid(), $1, $2, $3, true)`,
      [customer.id, project.id, phaseId]
    );

    const createResponse = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        projectId: project.id,
        phaseId,
        eventType: 'appointment',
        appointmentType: 'template',
        title: 'Template Appointment',
        scheduledAt: '2026-06-01T09:00:00Z',
        durationMinutes: 60,
        assigneeUserIds: ['22222222-2222-4222-8222-222222222222']
      })
    });
    expect(createResponse.status).toBe(201);
    const event = await createResponse.json() as Record<string, unknown>;

    const confirmResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/confirm`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(confirmResponse.status).toBe(200);

    const startResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/start`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(startResponse.status).toBe(200);
  });

  it('starting material Activity with depositReceived=false → 422', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));

    const pool = app.get<Pool>(DATABASE_POOL);

    const phaseResult = await pool.query<{ id: string }>(
      `INSERT INTO phases (id, customer_id, project_id, phase_number, name)
       VALUES (gen_random_uuid(), $1, $2, 1, 'Phase 1') RETURNING id`,
      [customer.id, project.id]
    );
    const phaseId = phaseResult.rows[0].id;

    // deposit_received defaults false
    await pool.query(
      `INSERT INTO job_checklists (id, customer_id, project_id, phase_id)
       VALUES (gen_random_uuid(), $1, $2, $3)`,
      [customer.id, project.id, phaseId]
    );

    const createResponse = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        projectId: project.id,
        phaseId,
        eventType: 'appointment',
        appointmentType: 'material',
        title: 'Material Pickup',
        scheduledAt: '2026-06-02T09:00:00Z',
        durationMinutes: 60,
        assigneeUserIds: ['22222222-2222-4222-8222-222222222222']
      })
    });
    expect(createResponse.status).toBe(201);
    const event = await createResponse.json() as Record<string, unknown>;

    const confirmResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/confirm`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(confirmResponse.status).toBe(200);

    const startResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/start`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(startResponse.status).toBe(422);
  });

  it('starting install Activity with approvedForInstall=false → 422', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));

    const pool = app.get<Pool>(DATABASE_POOL);

    const phaseResult = await pool.query<{ id: string }>(
      `INSERT INTO phases (id, customer_id, project_id, phase_number, name)
       VALUES (gen_random_uuid(), $1, $2, 1, 'Phase 1') RETURNING id`,
      [customer.id, project.id]
    );
    const phaseId = phaseResult.rows[0].id;

    // approved_for_install defaults false
    await pool.query(
      `INSERT INTO job_checklists (id, customer_id, project_id, phase_id)
       VALUES (gen_random_uuid(), $1, $2, $3)`,
      [customer.id, project.id, phaseId]
    );

    const createResponse = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        projectId: project.id,
        phaseId,
        eventType: 'appointment',
        appointmentType: 'install',
        title: 'Install Day',
        scheduledAt: '2026-06-03T09:00:00Z',
        durationMinutes: 120,
        assigneeUserIds: ['22222222-2222-4222-8222-222222222222']
      })
    });
    expect(createResponse.status).toBe(201);
    const event = await createResponse.json() as Record<string, unknown>;

    const confirmResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/confirm`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(confirmResponse.status).toBe(200);

    const startResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/start`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(startResponse.status).toBe(422);
  });

  it('starting install with approvedForInstall=true but tearoutRequired=true, tearoutCompleted=false → 422', async () => {
    const customer = await createCustomer();
    const project = await createProject(String(customer.id));

    const pool = app.get<Pool>(DATABASE_POOL);

    const phaseResult = await pool.query<{ id: string }>(
      `INSERT INTO phases (id, customer_id, project_id, phase_number, name)
       VALUES (gen_random_uuid(), $1, $2, 1, 'Phase 1') RETURNING id`,
      [customer.id, project.id]
    );
    const phaseId = phaseResult.rows[0].id;

    // approved but tearout not done
    await pool.query(
      `INSERT INTO job_checklists (id, customer_id, project_id, phase_id, approved_for_install, tearout_required, tearout_completed)
       VALUES (gen_random_uuid(), $1, $2, $3, true, true, false)`,
      [customer.id, project.id, phaseId]
    );

    const createResponse = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        projectId: project.id,
        phaseId,
        eventType: 'appointment',
        appointmentType: 'install',
        title: 'Install Day',
        scheduledAt: '2026-06-04T09:00:00Z',
        durationMinutes: 120,
        assigneeUserIds: ['22222222-2222-4222-8222-222222222222']
      })
    });
    expect(createResponse.status).toBe(201);
    const event = await createResponse.json() as Record<string, unknown>;

    const confirmResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/confirm`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(confirmResponse.status).toBe(200);

    const startResponse = await fetch(
      `${baseUrl}/api/v1/customers/${customer.id}/events/${event.id}/start`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    expect(startResponse.status).toBe(422);
  });
});
