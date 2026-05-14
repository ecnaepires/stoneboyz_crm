import 'reflect-metadata';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../apps/api/src/app.module.js';
import { DATABASE_POOL } from '../../apps/api/src/database.provider.js';

const ACTOR_USER_ID = '22222222-2222-4222-8222-222222222222';
const SEEDED_CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';

interface CapturedEvent {
  name: string;
  payload: {
    eventId: string;
    occurredAt: string;
    version: number;
    data: Record<string, unknown>;
  };
}

const resetDatabase = async (app: INestApplication): Promise<void> => {
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

  const seedSql = await readFile(join(process.cwd(), 'db/seeds/test-customers.sql'), 'utf8');
  await pool.query(seedSql);
};

let app: INestApplication;
let baseUrl: string;
let captured: CapturedEvent[];

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
      type: 'prospect',
      ownerUserId: ACTOR_USER_ID
    })
  });

  return await response.json() as Record<string, unknown>;
};

const createContact = async (
  customerId: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/contacts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      ...body
    })
  });

  return await response.json() as Record<string, unknown>;
};

const expectEnvelope = (event: CapturedEvent): void => {
  expect(event.payload).toMatchObject({
    eventId: expect.any(String),
    occurredAt: expect.any(String),
    version: 1,
    data: expect.any(Object)
  });
};

describe('customer events', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    await resetDatabase(app);

    const emitter = app.get(EventEmitter2);
    captured = [];
    emitter.onAny((name, payload) => captured.push({ name: String(name), payload }));
  });

  beforeEach(async () => {
    captured.length = 0;
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('fires customer.created with an envelope and correct data', async () => {
    const response = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerKind: 'company',
        name: 'Events Created Co',
        companyName: 'Events Created Co',
        status: 'lead',
        type: 'prospect',
        ownerUserId: ACTOR_USER_ID
      })
    });
    const customer = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.name).toBe('customer.created');
    expectEnvelope(captured[0] as CapturedEvent);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: customer.id,
      actorUserId: ACTOR_USER_ID,
      name: 'Events Created Co',
      customerKind: 'company'
    });
  });

  it('fires customer.updated and customer.status_changed when status changes', async () => {
    const customer = await createCustomer('Events Status Co');
    captured.length = 0;

    const response = await fetch(`${baseUrl}/api/v1/customers/${customer.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        status: 'qualified',
        notesSummary: 'Qualified during event test'
      })
    });

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.updated',
      'customer.status_changed'
    ]);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: customer.id,
      actorUserId: ACTOR_USER_ID,
      changedFields: ['status', 'notesSummary']
    });
    expect(captured[1]?.payload.data).toMatchObject({
      customerId: customer.id,
      actorUserId: ACTOR_USER_ID,
      fromStatus: 'lead',
      toStatus: 'qualified'
    });
  });

  it('fires customer.archived with archiveReason', async () => {
    const customer = await createCustomer('Events Archive Co');
    captured.length = 0;

    const response = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        archiveReason: 'Merged duplicate'
      })
    });

    expect(response.status).toBe(200);
    expect(captured[0]?.name).toBe('customer.archived');
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: customer.id,
      actorUserId: ACTOR_USER_ID,
      archiveReason: 'Merged duplicate'
    });
  });

  it('fires customer.restored', async () => {
    const customer = await createCustomer('Events Restore Co');
    await fetch(`${baseUrl}/api/v1/customers/${customer.id}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    captured.length = 0;

    const response = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/restore`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(response.status).toBe(200);
    expect(captured[0]?.name).toBe('customer.restored');
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: customer.id,
      actorUserId: ACTOR_USER_ID
    });
  });

  it('fires contact creation and primary/billing change events', async () => {
    const customer = await createCustomer('Events Contact Create Co');
    captured.length = 0;

    const contact = await createContact(String(customer.id), {
      firstName: 'Events',
      isPrimary: true,
      isBilling: true
    });

    expect(captured.map((event) => event.name)).toEqual([
      'customer.contact_created',
      'customer.primary_contact_changed',
      'customer.billing_contact_changed'
    ]);
    for (const event of captured) {
      expect(event.payload.data).toMatchObject({
        customerId: customer.id,
        contactId: contact.id,
        actorUserId: ACTOR_USER_ID
      });
    }
  });

  it('fires contact update and primary/billing change events on false-to-true flips', async () => {
    const customer = await createCustomer('Events Contact Update Co');
    const contact = await createContact(String(customer.id), { firstName: 'Before' });
    captured.length = 0;

    const response = await fetch(`${baseUrl}/api/v1/customers/${customer.id}/contacts/${contact.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        firstName: 'After',
        isPrimary: true,
        isBilling: true
      })
    });

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.contact_updated',
      'customer.primary_contact_changed',
      'customer.billing_contact_changed'
    ]);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: customer.id,
      contactId: contact.id,
      actorUserId: ACTOR_USER_ID,
      changedFields: ['firstName', 'isPrimary', 'isBilling']
    });
  });

  it('fires customer.contact_archived', async () => {
    const contact = await createContact(SEEDED_CUSTOMER_ID, { firstName: 'Delete Event' });
    captured.length = 0;

    const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/contacts/${contact.id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    expect(response.status).toBe(200);
    expect(captured[0]?.name).toBe('customer.contact_archived');
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      contactId: contact.id,
      actorUserId: ACTOR_USER_ID
    });
  });
});
