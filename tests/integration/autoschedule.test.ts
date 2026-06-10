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

// 2026-06-15 is a Monday; 2026-06-19 is a Friday.
const MONDAY_ANCHOR = '2026-06-15T09:00:00.000Z';
const FRIDAY_ANCHOR = '2026-06-19T09:00:00.000Z';

let app: INestApplication;
let baseUrl: string;

interface ActivityResponse {
  id: string;
  title: string;
  sortOrder: number;
  status: string;
  scheduledEventId: string | null;
  autoscheduleState: string | null;
}

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

const createProject = async (title: string): Promise<string> => {
  const jobTemplateId = await getDefaultJobTemplateId(baseUrl);
  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actorUserId: ACTOR_USER_ID,
      customerId: SEEDED_CUSTOMER_ID,
      title,
      jobTemplateId,
      ownerUserId: ACTOR_USER_ID
    })
  });

  expect(response.status).toBe(201);
  const body = (await response.json()) as { id: string };
  return body.id;
};

const listActivities = async (projectId: string): Promise<ActivityResponse[]> => {
  const response = await fetch(
    `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${projectId}/activities`
  );
  expect(response.status).toBe(200);
  return (await response.json()) as ActivityResponse[];
};

const scheduleActivity = async (
  projectId: string,
  activityId: string,
  scheduledAt: string,
  method: 'POST' | 'PATCH' = 'POST'
): Promise<Response> => {
  return fetch(
    `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/projects/${projectId}/activities/${activityId}/schedule`,
    {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scheduledAt, assigneeIds: [] })
    }
  );
};

const getEvent = async (eventId: string): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events/${eventId}`);
  expect(response.status).toBe(200);
  return (await response.json()) as Record<string, unknown>;
};

const transitionEvent = async (eventId: string, action: 'confirm' | 'start' | 'finish'): Promise<void> => {
  const response = await fetch(
    `${baseUrl}/api/v1/customers/${SEEDED_CUSTOMER_ID}/events/${eventId}/${action}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    }
  );
  expect(response.status).toBe(200);
};

describe('autoschedule engine', () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');

    await app.listen(0);

    baseUrl = await app.getUrl();
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

  it('chains all followers at one business day apart, 08:00 UTC, when the anchor is scheduled', async () => {
    const projectId = await createProject('Autoschedule Chain Job');
    const activities = await listActivities(projectId);
    expect(activities).toHaveLength(8);

    const anchor = activities[0] as ActivityResponse;
    const response = await scheduleActivity(projectId, anchor.id, MONDAY_ANCHOR);
    expect(response.status).toBe(200);

    const scheduled = await listActivities(projectId);
    expect(scheduled.every((activity) => activity.status === 'scheduled')).toBe(true);
    expect(scheduled.every((activity) => activity.scheduledEventId !== null)).toBe(true);

    const anchorAfter = scheduled.find((activity) => activity.id === anchor.id) as ActivityResponse;
    expect(anchorAfter.autoscheduleState).toBeNull();

    const followers = scheduled
      .filter((activity) => activity.id !== anchor.id)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    expect(followers.every((activity) => activity.autoscheduleState === 'autoscheduled')).toBe(true);

    // Mon 15 anchor -> Tue 16 ... Fri 19, then Mon 22 ... Wed 24 at 08:00 UTC.
    const expectedDates = [
      '2026-06-16T08:00:00.000Z',
      '2026-06-17T08:00:00.000Z',
      '2026-06-18T08:00:00.000Z',
      '2026-06-19T08:00:00.000Z',
      '2026-06-22T08:00:00.000Z',
      '2026-06-23T08:00:00.000Z',
      '2026-06-24T08:00:00.000Z'
    ];

    for (const [index, follower] of followers.entries()) {
      const event = await getEvent(follower.scheduledEventId as string);
      expect(event.scheduledAt).toBe(expectedDates[index]);
      expect(event.assigneeIds).toEqual([]);
    }
  });

  it('skips the weekend when the anchor lands on Friday', async () => {
    const projectId = await createProject('Weekend Skip Job');
    const activities = await listActivities(projectId);
    const anchor = activities[0] as ActivityResponse;

    const response = await scheduleActivity(projectId, anchor.id, FRIDAY_ANCHOR);
    expect(response.status).toBe(200);

    const scheduled = await listActivities(projectId);
    const firstFollower = scheduled
      .filter((activity) => activity.id !== anchor.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)[0] as ActivityResponse;

    const event = await getEvent(firstFollower.scheduledEventId as string);
    expect(event.scheduledAt).toBe('2026-06-22T08:00:00.000Z');
  });

  it('flips a rescheduled follower to manual_override and never moves it again', async () => {
    const projectId = await createProject('Manual Override Job');
    const activities = await listActivities(projectId);
    const anchor = activities[0] as ActivityResponse;

    await scheduleActivity(projectId, anchor.id, MONDAY_ANCHOR);

    let scheduled = await listActivities(projectId);
    const followers = scheduled
      .filter((activity) => activity.id !== anchor.id)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const deposit = followers[0] as ActivityResponse;
    const material = followers[1] as ActivityResponse;

    // Manually move Deposit; its state flips to manual_override.
    const manualAt = '2026-06-17T14:00:00.000Z';
    const rescheduleResponse = await scheduleActivity(projectId, deposit.id, manualAt, 'PATCH');
    expect(rescheduleResponse.status).toBe(200);

    scheduled = await listActivities(projectId);
    const depositAfter = scheduled.find((activity) => activity.id === deposit.id) as ActivityResponse;
    expect(depositAfter.autoscheduleState).toBe('manual_override');

    // Reschedule the anchor: Deposit stays put, Material is recomputed through
    // Deposit's slot (anchor Wed 17 -> slot Thu 18 -> Material Fri 19).
    const anchorMove = await scheduleActivity(projectId, anchor.id, '2026-06-17T09:00:00.000Z', 'PATCH');
    expect(anchorMove.status).toBe(200);

    const depositEvent = await getEvent(deposit.scheduledEventId as string);
    expect(depositEvent.scheduledAt).toBe(manualAt);

    const materialEvent = await getEvent(material.scheduledEventId as string);
    expect(materialEvent.scheduledAt).toBe('2026-06-19T08:00:00.000Z');
  });

  it('never moves completed followers when the anchor is rescheduled', async () => {
    const projectId = await createProject('Completed Follower Job');
    const activities = await listActivities(projectId);
    const anchor = activities[0] as ActivityResponse;

    await scheduleActivity(projectId, anchor.id, MONDAY_ANCHOR);

    const scheduled = await listActivities(projectId);
    const followers = scheduled
      .filter((activity) => activity.id !== anchor.id)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const deposit = followers[0] as ActivityResponse;
    const material = followers[1] as ActivityResponse;

    const depositEventId = deposit.scheduledEventId as string;
    await transitionEvent(depositEventId, 'confirm');
    await transitionEvent(depositEventId, 'start');
    await transitionEvent(depositEventId, 'finish');

    const completed = await listActivities(projectId);
    const depositCompleted = completed.find((activity) => activity.id === deposit.id) as ActivityResponse;
    expect(depositCompleted.status).toBe('completed');

    const depositEventBefore = await getEvent(depositEventId);

    const anchorMove = await scheduleActivity(projectId, anchor.id, '2026-06-17T09:00:00.000Z', 'PATCH');
    expect(anchorMove.status).toBe(200);

    const depositEventAfter = await getEvent(depositEventId);
    expect(depositEventAfter.scheduledAt).toBe(depositEventBefore.scheduledAt);

    const materialEvent = await getEvent(material.scheduledEventId as string);
    expect(materialEvent.scheduledAt).toBe('2026-06-19T08:00:00.000Z');
  });
});
