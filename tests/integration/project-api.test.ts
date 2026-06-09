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

  const seedSql = await readFile(
    join(process.cwd(), 'db/seeds/test-customers.sql'),
    'utf8'
  );

  await pool.query(seedSql);
};

let app: INestApplication;
let baseUrl: string;

const createProject = async (
  title: string,
  status: 'draft' | 'active' | 'completed' = 'draft',
  customerId = SEEDED_CUSTOMER_ID
): Promise<Record<string, unknown>> => {
  const jobTemplateId = await getDefaultJobTemplateId(baseUrl);
  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerId,
      title,
      jobTemplateId,
      description: `${title} description`,
      status,
      ownerUserId: ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

describe('project API', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
    await resetDatabase();
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  beforeEach(async () => {
    await resetDatabase();
    const _token = await seedTestSession(app.get(DATABASE_POOL));
    setTestAuthToken(_token);
  });

  afterAll(async () => {
    await app.get<Pool>(DATABASE_POOL).end();
    await app.close();
  });

  it('lists projects with pagination metadata', async () => {
    const response = await fetch(`${baseUrl}/api/v1/projects`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.hasMore).toBe(false);
    expect(body.nextCursor).toBeNull();
  });

  it('creates a draft project', async () => {
    const response = await fetch(`${baseUrl}/api/v1/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerId: SEEDED_CUSTOMER_ID,
        title: 'Kitchen Install',
        jobTemplateId: await getDefaultJobTemplateId(baseUrl),
        ownerUserId: ACTOR_USER_ID
      })
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      jobTemplateId: expect.any(String),
      title: 'Kitchen Install',
      description: null,
      status: 'draft',
      ownerUserId: ACTOR_USER_ID,
      archivedAt: null
    });
    expect(body.id).toEqual(expect.any(String));
    expect(body.createdAt).toEqual(expect.any(String));
  });

  it('creates not scheduled job activities from the selected job template', async () => {
    const project = await createProject('Template Activity Job');

    const response = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${String(project.id)}/activities`
    );
    const body = await response.json() as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(body.map((activity) => activity.title)).toEqual([
      'Template',
      'Deposit',
      'Material',
      'Cut',
      'Fabrication',
      'Install',
      'Invoice',
      'Repair'
    ]);
    expect(body.every((activity) => activity.status === 'not_scheduled')).toBe(true);
    expect(body.every((activity) => activity.scheduledEventId === null)).toBe(true);
    expect(body[0]).toMatchObject({
      customerId: SEEDED_CUSTOMER_ID,
      projectId: project.id,
      jobTemplateId: project.jobTemplateId,
      sortOrder: 1,
      durationMinutes: 90
    });
  });

  it('schedules a job activity and links it to a scheduled event', async () => {
    const project = await createProject('Scheduled Activity Job');
    const activitiesResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${String(project.id)}/activities`
    );
    const activities = await activitiesResponse.json() as Array<Record<string, unknown>>;
    const templateActivity = activities[0] as Record<string, unknown>;
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();

    const scheduleResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${String(project.id)}/activities/${String(templateActivity.id)}/schedule`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scheduledAt,
          durationMinutes: 75,
          assigneeUserIds: [ACTOR_USER_ID]
        })
      }
    );
    const scheduledActivity = await scheduleResponse.json() as Record<string, unknown>;

    expect(scheduleResponse.status).toBe(200);
    expect(scheduledActivity).toMatchObject({
      id: templateActivity.id,
      status: 'scheduled',
      durationMinutes: 75
    });
    expect(scheduledActivity.scheduledEventId).toEqual(expect.any(String));

    const eventsResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events?projectId=${String(project.id)}`
    );
    const eventsBody = await eventsResponse.json() as { data: Array<Record<string, unknown>> };

    expect(eventsResponse.status).toBe(200);
    expect(eventsBody.data).toHaveLength(1);
    expect(eventsBody.data[0]).toMatchObject({
      id: scheduledActivity.scheduledEventId,
      projectId: project.id,
      appointmentType: 'template',
      title: 'Template',
      durationMinutes: 75,
      status: 'scheduled',
      assigneeUserIds: [ACTOR_USER_ID]
    });
  });

  it('reschedules a job activity and syncs status from scheduled event transitions', async () => {
    const project = await createProject('Rescheduled Activity Job');
    const activitiesResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${String(project.id)}/activities`
    );
    const activities = await activitiesResponse.json() as Array<Record<string, unknown>>;
    const activity = activities[0] as Record<string, unknown>;
    const scheduledAt = new Date(Date.now() + 3_600_000).toISOString();

    const scheduleResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${String(project.id)}/activities/${String(activity.id)}/schedule`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scheduledAt,
          durationMinutes: 75,
          assigneeUserIds: [ACTOR_USER_ID]
        })
      }
    );
    const scheduledActivity = await scheduleResponse.json() as Record<string, unknown>;
    const rescheduledAt = new Date(Date.now() + 7_200_000).toISOString();

    const rescheduleResponse = await fetch(
      `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${String(project.id)}/activities/${String(activity.id)}/schedule`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: rescheduledAt,
          durationMinutes: 105,
          assigneeUserIds: [ACTOR_USER_ID]
        })
      }
    );
    const rescheduledActivity = await rescheduleResponse.json() as Record<string, unknown>;

    expect(rescheduleResponse.status).toBe(200);
    expect(rescheduledActivity).toMatchObject({
      id: activity.id,
      status: 'scheduled',
      durationMinutes: 105,
      scheduledEventId: scheduledActivity.scheduledEventId
    });

    const eventResponse = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events/${String(scheduledActivity.scheduledEventId)}`);
    const event = await eventResponse.json() as Record<string, unknown>;
    expect(event).toMatchObject({
      scheduledAt: rescheduledAt,
      durationMinutes: 105
    });

    for (const [action, expectedStatus] of [
      ['confirm', 'confirmed'],
      ['start', 'in_progress'],
      ['finish', 'completed']
    ] as const) {
      const transitionResponse = await fetch(
        `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events/${String(scheduledActivity.scheduledEventId)}/${action}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({})
        }
      );
      expect(transitionResponse.status).toBe(200);

      const syncedActivitiesResponse = await fetch(
        `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${String(project.id)}/activities`
      );
      const syncedActivities = await syncedActivitiesResponse.json() as Array<Record<string, unknown>>;
      expect(syncedActivities[0]?.status).toBe(expectedStatus);
    }
  });

  it('gets a project by id', async () => {
    const project = await createProject('Get Project');

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: project.id,
      customerId: SEEDED_CUSTOMER_ID,
      title: 'Get Project'
    });
  });

  it('updates project fields', async () => {
    const project = await createProject('Before Update');

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        title: 'After Update',
        description: 'Updated scope'
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: project.id,
      title: 'After Update',
      description: 'Updated scope'
    });
  });

  it('updates job address separately from the customer address', async () => {
    const project = await createProject('Job Address Split');

    const addressesBefore = await (
      await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses`)
    ).json();

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        jobAddress: {
          line1: '742 Granite Way',
          city: 'Springfield',
          region: 'MO',
          postalCode: '65801',
          country: 'US'
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobAddress).toMatchObject({
      line1: '742 Granite Way',
      city: 'Springfield',
      region: 'MO',
      postalCode: '65801',
      country: 'US'
    });

    const fetched = await (await fetch(`${baseUrl}/api/v1/projects/${project.id}`)).json();
    expect(fetched.jobAddress).toMatchObject({ line1: '742 Granite Way', city: 'Springfield' });

    const addressesAfter = await (
      await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/addresses`)
    ).json();
    expect(addressesAfter).toEqual(addressesBefore);
  });

  it('filters projects by customerId', async () => {
    const otherCustomer = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerKind: 'company',
        name: 'Project Filter Customer',
        companyName: 'Project Filter Customer',
        status: 'lead',
        type: 'customer',
        ownerUserId: ACTOR_USER_ID
      })
    }).then((response) => response.json() as Promise<Record<string, unknown>>);
    await createProject('Seeded Customer Project');
    await createProject('Other Customer Project', 'draft', String(otherCustomer.id));

    const response = await fetch(`${baseUrl}/api/v1/projects?customerId=${SEEDED_CUSTOMER_ID}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ title: 'Seeded Customer Project' });
  });

  it('filters projects by status', async () => {
    await createProject('Draft Project', 'draft');
    await createProject('Active Project', 'active');

    const response = await fetch(`${baseUrl}/api/v1/projects?status=active`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ title: 'Active Project', status: 'active' });
  });

  it('searches projects by title', async () => {
    await createProject('Countertop Template');
    await createProject('Backsplash Fabrication');

    const response = await fetch(`${baseUrl}/api/v1/projects?search=counter`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Countertop Template');
  });

  it('supports project cursor pagination', async () => {
    await createProject('Alpha Project');
    await createProject('Beta Project');

    const firstPageResponse = await fetch(`${baseUrl}/api/v1/projects?limit=1&sortBy=title&sortDirection=asc`);
    const firstPageBody = await firstPageResponse.json();

    expect(firstPageResponse.status).toBe(200);
    expect(firstPageBody.data).toHaveLength(1);
    expect(firstPageBody.data[0].title).toBe('Alpha Project');
    expect(firstPageBody.hasMore).toBe(true);

    const secondPageResponse = await fetch(
      `${baseUrl}/api/v1/projects?limit=1&sortBy=title&sortDirection=asc&cursor=${encodeURIComponent(firstPageBody.nextCursor)}`
    );
    const secondPageBody = await secondPageResponse.json();

    expect(secondPageResponse.status).toBe(200);
    expect(secondPageBody.data).toHaveLength(1);
    expect(secondPageBody.data[0].title).toBe('Beta Project');
    expect(secondPageBody.hasMore).toBe(false);
  });

  it('returns validation error for invalid project cursor', async () => {
    const response = await fetch(`${baseUrl}/api/v1/projects?cursor=not-a-valid-cursor`);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
    expect(body.details.cursor).toContain('Invalid cursor');
  });

  it('archives a project and hides it from normal reads', async () => {
    const project = await createProject('Archive Project');

    const archiveResponse = await fetch(`${baseUrl}/api/v1/projects/${project.id}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const archived = await archiveResponse.json();

    expect(archiveResponse.status).toBe(200);
    expect(archived).toMatchObject({ id: project.id, title: 'Archive Project' });
    expect(archived.archivedAt).toEqual(expect.any(String));

    const getResponse = await fetch(`${baseUrl}/api/v1/projects/${project.id}`);
    expect(getResponse.status).toBe(404);
  });

  it('lists archived projects', async () => {
    const project = await createProject('Archived List Project');
    await fetch(`${baseUrl}/api/v1/projects/${project.id}/archive`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });

    const response = await fetch(`${baseUrl}/api/v1/projects/archived`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ id: project.id, archivedAt: expect.any(String) });
  });

  it('returns validation error for invalid create body', async () => {
    const response = await fetch(`${baseUrl}/api/v1/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerId: SEEDED_CUSTOMER_ID,
        ownerUserId: ACTOR_USER_ID
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
    expect(body.details.title).toEqual(expect.any(Array));
  });

  it('returns not found for missing customer on create', async () => {
    const response = await fetch(`${baseUrl}/api/v1/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actorUserId: ACTOR_USER_ID,
        customerId: '99999999-9999-4999-8999-999999999999',
        title: 'Missing Customer Project',
        jobTemplateId: await getDefaultJobTemplateId(baseUrl),
        ownerUserId: ACTOR_USER_ID
      })
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ code: 'NOT_FOUND', message: 'Customer or Job Template not found' });
  });

  it('returns validation error for empty update body', async () => {
    const project = await createProject('Empty Update Project');

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed'
    });
  });

  it('allows status transition from draft to active', async () => {
    const project = await createProject('Draft To Active');

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, status: 'active' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('active');
  });

  it('allows status transition from draft to completed', async () => {
    const project = await createProject('Draft To Completed');

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, status: 'completed' })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('completed');
  });

  it('blocks status transition from active to draft', async () => {
    const project = await createProject('Active To Draft', 'active');

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, status: 'draft' })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_STATUS_TRANSITION');
    expect(body.details).toMatchObject({ from: 'active', to: 'draft' });
  });

  it('blocks status transition from completed to active', async () => {
    const project = await createProject('Completed To Active', 'completed');

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, status: 'active' })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_STATUS_TRANSITION');
    expect(body.details).toMatchObject({ from: 'completed', to: 'active' });
  });

  it('blocks status transition from completed to draft', async () => {
    const project = await createProject('Completed To Draft', 'completed');

    const response = await fetch(`${baseUrl}/api/v1/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actorUserId: ACTOR_USER_ID, status: 'draft' })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_STATUS_TRANSITION');
    expect(body.details).toMatchObject({ from: 'completed', to: 'draft' });
  });
});
