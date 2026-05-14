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
  await pool.query('DROP TABLE IF EXISTS projects CASCADE;');
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
let pool: Pool;
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

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createContact = async (
  customerId: string,
  firstName: string
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/contacts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      firstName
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createAddress = async (
  customerId: string,
  line1: string
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/addresses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      type: 'shipping',
      line1,
      city: 'Austin',
      country: 'US'
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createNote = async (
  customerId: string,
  body: string
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${customerId}/notes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      body
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const createProject = async (
  customerId: string,
  title: string
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerId,
      title,
      ownerUserId: ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

const archiveCustomer = async (customerId: string): Promise<Response> => {
  return await fetch(`${baseUrl}/api/v1/customers/${customerId}/archive`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      archiveReason: 'Cascade integration test'
    })
  });
};

describe('customer archive cascade', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    pool = app.get<Pool>(DATABASE_POOL);
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
    await pool.end();
    await app.close();
  });

  it('archives active contacts and fires cascade events after customer archive event', async () => {
    const customer = await createCustomer('Cascade Events Co');
    const contactOne = await createContact(String(customer.id), 'One');
    const contactTwo = await createContact(String(customer.id), 'Two');
    captured.length = 0;

    const response = await archiveCustomer(String(customer.id));

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.archived',
      'customer.contact_archived',
      'customer.contact_archived'
    ]);
    expect(captured[0]?.payload.data).toMatchObject({
      customerId: customer.id,
      actorUserId: ACTOR_USER_ID,
      archiveReason: 'Cascade integration test'
    });
    const archivedContactIds = captured
      .filter((event) => event.name === 'customer.contact_archived')
      .map((event) => event.payload.data.contactId);
    expect(archivedContactIds).toEqual(expect.arrayContaining([contactOne.id, contactTwo.id]));
    expect(archivedContactIds).toHaveLength(2);
    for (const event of captured.filter((item) => item.name === 'customer.contact_archived')) {
      expect(event.payload.data).toMatchObject({
        customerId: customer.id,
        actorUserId: ACTOR_USER_ID
      });
    }
  });

  it('archives contacts and addresses and fires cascade events after customer archive event', async () => {
    const customer = await createCustomer('Cascade Contacts Addresses Co');
    const contactOne = await createContact(String(customer.id), 'One');
    const contactTwo = await createContact(String(customer.id), 'Two');
    const addressOne = await createAddress(String(customer.id), 'One Address');
    const addressTwo = await createAddress(String(customer.id), 'Two Address');
    const noteOne = await createNote(String(customer.id), 'One Note');
    const noteTwo = await createNote(String(customer.id), 'Two Note');
    captured.length = 0;

    const response = await archiveCustomer(String(customer.id));

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.archived',
      'customer.contact_archived',
      'customer.contact_archived',
      'customer.address_archived',
      'customer.address_archived',
      'customer.note_archived',
      'customer.note_archived'
    ]);
    const archivedContactIds = captured
      .filter((event) => event.name === 'customer.contact_archived')
      .map((event) => event.payload.data.contactId);
    const archivedAddressIds = captured
      .filter((event) => event.name === 'customer.address_archived')
      .map((event) => event.payload.data.addressId);
    const archivedNoteIds = captured
      .filter((event) => event.name === 'customer.note_archived')
      .map((event) => event.payload.data.noteId);

    expect(archivedContactIds).toEqual(expect.arrayContaining([contactOne.id, contactTwo.id]));
    expect(archivedContactIds).toHaveLength(2);
    expect(archivedAddressIds).toEqual(expect.arrayContaining([addressOne.id, addressTwo.id]));
    expect(archivedAddressIds).toHaveLength(2);
    expect(archivedNoteIds).toEqual(expect.arrayContaining([noteOne.id, noteTwo.id]));
    expect(archivedNoteIds).toHaveLength(2);
  });

  it('archives addresses and emits address cascade events when there are no contacts', async () => {
    const customer = await createCustomer('Cascade Addresses Only Co');
    const addressOne = await createAddress(String(customer.id), 'Address Only One');
    const addressTwo = await createAddress(String(customer.id), 'Address Only Two');
    captured.length = 0;

    const response = await archiveCustomer(String(customer.id));

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.archived',
      'customer.address_archived',
      'customer.address_archived'
    ]);
    const archivedAddressIds = captured
      .filter((event) => event.name === 'customer.address_archived')
      .map((event) => event.payload.data.addressId);
    expect(archivedAddressIds).toEqual(expect.arrayContaining([addressOne.id, addressTwo.id]));
    expect(archivedAddressIds).toHaveLength(2);
  });

  it('sets deleted_at on the customer and cascaded contacts', async () => {
    const customer = await createCustomer('Cascade State Co');
    const contactOne = await createContact(String(customer.id), 'State One');
    const contactTwo = await createContact(String(customer.id), 'State Two');
    captured.length = 0;

    const response = await archiveCustomer(String(customer.id));

    expect(response.status).toBe(200);
    const customerResult = await pool.query<{ deleted_at: Date | null }>(
      'SELECT deleted_at FROM customers WHERE id = $1',
      [customer.id]
    );
    const contactResult = await pool.query<{ id: string; deleted_at: Date | null }>(
      'SELECT id, deleted_at FROM customer_contacts WHERE id = ANY($1::uuid[]) ORDER BY id',
      [[contactOne.id, contactTwo.id]]
    );

    expect(customerResult.rows[0]?.deleted_at).toBeInstanceOf(Date);
    expect(contactResult.rows).toHaveLength(2);
    for (const row of contactResult.rows) {
      expect(row.deleted_at).toBeInstanceOf(Date);
    }
  });

  it('archives projects and emits project archived events after customer archive event', async () => {
    const customer = await createCustomer('Cascade Projects Co');
    const projectOne = await createProject(String(customer.id), 'Cascade Project One');
    const projectTwo = await createProject(String(customer.id), 'Cascade Project Two');
    captured.length = 0;

    const response = await archiveCustomer(String(customer.id));

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.archived',
      'project.archived',
      'project.archived'
    ]);
    const archivedProjectIds = captured
      .filter((event) => event.name === 'project.archived')
      .map((event) => event.payload.data.projectId);
    expect(archivedProjectIds).toEqual(expect.arrayContaining([projectOne.id, projectTwo.id]));
    expect(archivedProjectIds).toHaveLength(2);

    const projectResult = await pool.query<{ id: string; archived_at: Date | null }>(
      'SELECT id, archived_at FROM projects WHERE id = ANY($1::uuid[]) ORDER BY id',
      [[projectOne.id, projectTwo.id]]
    );

    expect(projectResult.rows).toHaveLength(2);
    for (const row of projectResult.rows) {
      expect(row.archived_at).toBeInstanceOf(Date);
    }
  });

  it('does not re-archive or emit an event for a pre-archived contact', async () => {
    const customer = await createCustomer('Cascade Pre Archived Co');
    const activeContact = await createContact(String(customer.id), 'Active');
    const preArchivedContact = await createContact(String(customer.id), 'Old');
    await pool.query(
      "UPDATE customer_contacts SET deleted_at = '2026-05-01T10:00:00.000Z', updated_at = now() WHERE id = $1",
      [preArchivedContact.id]
    );
    const before = await pool.query<{ deleted_at: Date }>(
      'SELECT deleted_at FROM customer_contacts WHERE id = $1',
      [preArchivedContact.id]
    );
    captured.length = 0;

    const response = await archiveCustomer(String(customer.id));

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual([
      'customer.archived',
      'customer.contact_archived'
    ]);
    expect(captured[1]?.payload.data).toMatchObject({
      customerId: customer.id,
      contactId: activeContact.id,
      actorUserId: ACTOR_USER_ID
    });
    const after = await pool.query<{ deleted_at: Date }>(
      'SELECT deleted_at FROM customer_contacts WHERE id = $1',
      [preArchivedContact.id]
    );
    expect(after.rows[0]?.deleted_at.toISOString()).toBe(before.rows[0]?.deleted_at.toISOString());
  });

  it('fires only customer.archived when there are no contacts', async () => {
    const customer = await createCustomer('Cascade Empty Co');
    captured.length = 0;

    const response = await archiveCustomer(String(customer.id));

    expect(response.status).toBe(200);
    expect(captured.map((event) => event.name)).toEqual(['customer.archived']);
  });

  it('returns 404 and emits no events when archiving an already archived customer', async () => {
    const customer = await createCustomer('Cascade Already Archived Co');
    const firstResponse = await archiveCustomer(String(customer.id));
    expect(firstResponse.status).toBe(200);
    captured.length = 0;

    const secondResponse = await archiveCustomer(String(customer.id));

    expect(secondResponse.status).toBe(404);
    expect(captured).toHaveLength(0);
  });
});
