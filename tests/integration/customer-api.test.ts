import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module.js';
import { DATABASE_POOL } from '../../apps/api/src/database.provider.js';
import { seedTestSession } from './helpers/auth.js';
import { setTestAuthToken } from './helpers/test-auth.js';

const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';

const resetDatabase = async (): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);

  await pool.query('DROP TABLE IF EXISTS customer_notes CASCADE;');
  await pool.query('DROP TABLE IF EXISTS customer_addresses CASCADE;');
  await pool.query('DROP TABLE IF EXISTS customer_contacts CASCADE;');
  await pool.query('DROP TABLE IF EXISTS customers CASCADE;');

  const migrationsDir = join(process.cwd(), 'db/migrations');
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migrationSql = await readFile(join(migrationsDir, migrationFile), 'utf8');

    await pool.query(migrationSql);
  }

  const seedSql = await readFile(
    join(process.cwd(), 'db/seeds/test-customers.sql'),
    'utf8'
  );

  await pool.query(seedSql);
};

let app: INestApplication;
let baseUrl: string;

describe('customer API', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    await resetDatabase();
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('lists seeded customers', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: SEEDED_CUSTOMER_ID,
      name: 'Acme Stone Works',
      customerKind: 'company',
      status: 'lead',
      type: 'customer'
    });
    expect(body.hasMore).toBe(false);
    expect(body.nextCursor).toBeNull();
  });

  it('gets a customer by id', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: SEEDED_CUSTOMER_ID,
      name: 'Acme Stone Works',
      companyName: 'Acme Stone Works'
    });
  });

  it('lists customer contacts', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: '33333333-3333-4333-8333-333333333333',
      customerId: SEEDED_CUSTOMER_ID,
      firstName: 'Alex',
      lastName: 'Stone',
      jobTitle: 'Operations Manager',
      email: 'alex@example.com',
      isPrimary: true,
      preferredChannel: 'email'
    });
  });

  it('creates a customer contact', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        firstName: 'Taylor',
        lastName: 'Admin',
        email: 'taylor@example.com',
        preferredChannel: 'email'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      firstName: 'Taylor',
      lastName: 'Admin',
      email: 'taylor@example.com',
      isPrimary: false,
      isBilling: false,
      preferredChannel: 'email'
    });
  });

  it('rejects a second primary contact for the same customer', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        firstName: 'Primary',
        isPrimary: true
      })
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('CONFLICT');
    expect(body.message).toBe('Contact conflicts with an existing active contact rule');
  });

  it('updates a customer contact', async () => {
    const createResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        firstName: 'Update',
        lastName: 'Me'
      })
    });
    const created = await createResponse.json();

    const updateResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/${created.id}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          actorUserId: '22222222-2222-4222-8222-222222222222',
          firstName: 'Updated',
          email: 'updated@example.com',
          preferredChannel: 'email'
        })
      }
    );
    const updated = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(updated).toMatchObject({
      id: created.id,
      firstName: 'Updated',
      email: 'updated@example.com',
      preferredChannel: 'email'
    });
  });

  it('rejects updating a second primary contact for the same customer', async () => {
    const createResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        firstName: 'Not Primary'
      })
    });
    const created = await createResponse.json();

    const updateResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/${created.id}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          actorUserId: '22222222-2222-4222-8222-222222222222',
          isPrimary: true
        })
      }
    );
    const body = await updateResponse.json();

    expect(updateResponse.status).toBe(409);
    expect(body.message).toBe('Contact conflicts with an existing active contact rule');
  });

  it('archives a customer contact and hides it from the contact list', async () => {
    const createResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        firstName: 'Archive Contact'
      })
    });
    const created = await createResponse.json();

    const archiveResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/${created.id}`,
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
      }
    );
    const archived = await archiveResponse.json();

    expect(archiveResponse.status).toBe(200);
    expect(archived.archivedAt).toEqual(expect.any(String));

    const listResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`);
    const listBody = await listResponse.json();

    expect(listBody.data.some((contact: { id: string }) => contact.id === created.id)).toBe(false);
  });

  it('returns validation error for empty contact update body', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/33333333-3333-4333-8333-333333333333`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
  });

  it('returns validation error for invalid contact body', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        email: 'not-an-email'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
  });

  it('updates customer fields', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        notesSummary: 'Prefers morning appointments',
        billingEmail: 'billing@acme.example'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: SEEDED_CUSTOMER_ID,
      notesSummary: 'Prefers morning appointments',
      billingEmail: 'billing@acme.example'
    });
  });

  it('returns not found when updating a missing customer', async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/customers/99999999-9999-4999-8999-999999999999`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          actorUserId: '22222222-2222-4222-8222-222222222222',
          notesSummary: 'No customer exists'
        })
      }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toBe('Customer not found');
  });

  it('allows valid status transition from lead to qualified', async () => {
    const createResponse = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        customerKind: 'company',
        name: 'Valid Status Transition Co',
        companyName: 'Valid Status Transition Co',
        status: 'lead',
        type: 'customer',
        ownerUserId: '22222222-2222-4222-8222-222222222222'
      })
    });
    const created = await createResponse.json();

    const updateResponse = await fetch(`${baseUrl}/api/v1/customers/${created.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        status: 'qualified'
      })
    });
    const body = await updateResponse.json();

    expect(updateResponse.status).toBe(200);
    expect(body.status).toBe('qualified');

    await fetch(`${baseUrl}/api/v1/customers/${created.id}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
    });
  });

  it('rejects invalid status transition from lead to active', async () => {
    const createResponse = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        customerKind: 'company',
        name: 'Invalid Status Transition Co',
        companyName: 'Invalid Status Transition Co',
        status: 'lead',
        type: 'customer',
        ownerUserId: '22222222-2222-4222-8222-222222222222'
      })
    });
    const created = await createResponse.json();

    const updateResponse = await fetch(`${baseUrl}/api/v1/customers/${created.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        status: 'active'
      })
    });
    const body = await updateResponse.json();

    expect(updateResponse.status).toBe(400);
    expect(body.code).toBe('INVALID_STATUS_TRANSITION');
    expect(body.details).toMatchObject({ from: 'lead', to: 'active' });

    await fetch(`${baseUrl}/api/v1/customers/${created.id}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: '22222222-2222-4222-8222-222222222222' })
    });
  });

  it('creates a person customer', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        customerKind: 'person',
        name: 'Jane Buyer',
        firstName: 'Jane',
        lastName: 'Buyer',
        status: 'qualified',
        type: 'customer',
        ownerUserId: '22222222-2222-4222-8222-222222222222',
        billingEmail: 'jane@example.com',
        tags: ['api-test']
      })
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      customerKind: 'person',
      name: 'Jane Buyer',
      firstName: 'Jane',
      lastName: 'Buyer',
      status: 'qualified',
      type: 'customer',
      billingEmail: 'jane@example.com',
      tags: ['api-test']
    });
    expect(body.id).toEqual(expect.any(String));
    expect(body.createdAt).toEqual(expect.any(String));
  });

  it('uses cursor pagination for customer lists', async () => {
    const firstPageResponse = await fetch(
      `${baseUrl}/api/v1/customers?limit=1&sortBy=name&sortDirection=asc`
    );
    const firstPageBody = await firstPageResponse.json();

    expect(firstPageResponse.status).toBe(200);
    expect(firstPageBody.data).toHaveLength(1);
    expect(firstPageBody.data[0].name).toBe('Acme Stone Works');
    expect(firstPageBody.hasMore).toBe(true);
    expect(firstPageBody.nextCursor).toEqual(expect.any(String));

    const secondPageResponse = await fetch(
      `${baseUrl}/api/v1/customers?limit=1&sortBy=name&sortDirection=asc&cursor=${encodeURIComponent(firstPageBody.nextCursor)}`
    );
    const secondPageBody = await secondPageResponse.json();

    expect(secondPageResponse.status).toBe(200);
    expect(secondPageBody.data).toHaveLength(1);
    expect(secondPageBody.data[0].name).toBe('Jane Buyer');
    expect(secondPageBody.hasMore).toBe(false);
    expect(secondPageBody.nextCursor).toBeNull();
  });

  it('returns validation error for invalid customer cursor', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers?cursor=not-a-valid-cursor`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
    expect(body.details.cursor).toContain('Invalid cursor');
  });

  it('returns validation error for invalid create body', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        customerKind: 'person',
        name: 'Missing First Name LLC',
        status: 'lead',
        type: 'customer',
        ownerUserId: '22222222-2222-4222-8222-222222222222'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
    expect(body.details.firstName).toContain(
      'firstName is required when customerKind is person'
    );
  });

  it('returns validation error for empty update body', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
  });

  it('archives a customer and hides it from normal reads', async () => {
    const createResponse = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        customerKind: 'company',
        name: 'Archive Test Co',
        companyName: 'Archive Test Co',
        status: 'lead',
        type: 'customer',
        ownerUserId: '22222222-2222-4222-8222-222222222222'
      })
    });
    const created = await createResponse.json();

    const archiveResponse = await fetch(`${baseUrl}/api/v1/customers/${created.id}/archive`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        archiveReason: 'Duplicate account'
      })
    });
    const archived = await archiveResponse.json();

    expect(archiveResponse.status).toBe(200);
    expect(archived).toMatchObject({
      id: created.id,
      archiveReason: 'Duplicate account',
      archivedByUserId: '22222222-2222-4222-8222-222222222222'
    });
    expect(archived.archivedAt).toEqual(expect.any(String));

    const getResponse = await fetch(`${baseUrl}/api/v1/customers/${created.id}`);

    expect(getResponse.status).toBe(404);
  });

  it('restores an archived customer', async () => {
    const createResponse = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        customerKind: 'company',
        name: 'Restore Test Co',
        companyName: 'Restore Test Co',
        status: 'lead',
        type: 'customer',
        ownerUserId: '22222222-2222-4222-8222-222222222222'
      })
    });
    const created = await createResponse.json();

    await fetch(`${baseUrl}/api/v1/customers/${created.id}/archive`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222',
        archiveReason: 'Testing restore'
      })
    });

    const restoreResponse = await fetch(`${baseUrl}/api/v1/customers/${created.id}/restore`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        actorUserId: '22222222-2222-4222-8222-222222222222'
      })
    });
    const restored = await restoreResponse.json();

    expect(restoreResponse.status).toBe(200);
    expect(restored).toMatchObject({
      id: created.id,
      archiveReason: null,
      archivedAt: null,
      archivedByUserId: null
    });

    const getResponse = await fetch(`${baseUrl}/api/v1/customers/${created.id}`);

    expect(getResponse.status).toBe(200);
  });

});
