import "reflect-metadata";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../../apps/api/src/app.module.js";
import { DATABASE_POOL } from "../../apps/api/src/database.provider.js";
import { seedTestSession } from "./helpers/auth.js";
import { setTestAuthToken } from "./helpers/test-auth.js";

let app: INestApplication;
let baseUrl: string;

const calendarViewConfig = {
  version: 1,
  displayType: "week",
  groupBy: "none",
  filters: {
    eventTypes: [],
    appointmentTypes: ["install"],
    statuses: [],
    assigneeIds: [],
    hideCompleted: false,
  },
  displayFields: [
    "projectTitle",
    "customerName",
    "activityTitle",
    "time",
    "status",
  ],
  colorBy: "appointmentType",
  wrapText: true,
  autoRefreshSeconds: null,
};

const resetDatabase = async (): Promise<void> => {
  const pool = app.get<Pool>(DATABASE_POOL);

  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");

  const migrationsDir = join(process.cwd(), "db/migrations");
  const migrationFiles = (await readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migrationSql = await readFile(
      join(migrationsDir, migrationFile),
      "utf8",
    );
    await pool.query(migrationSql);
  }

  const seedSql = await readFile(
    join(process.cwd(), "db/seeds/test-customers.sql"),
    "utf8",
  );
  await pool.query(seedSql);
};

const createView = async (
  body: Record<string, unknown> = {},
): Promise<Record<string, unknown>> => {
  const response = await fetch(`${baseUrl}/api/v1/calendar-views`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "My Install View",
      isShared: false,
      config: calendarViewConfig,
      ...body,
    }),
  });

  expect(response.status).toBe(201);
  return await response.json() as Record<string, unknown>;
};

describe("calendar views", () => {
  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix("api/v1");

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

  it("lists seeded shared calendar views", async () => {
    const response = await fetch(`${baseUrl}/api/v1/calendar-views`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((view: { name: string }) => view.name)).toEqual([
      "All Activities",
      "Fabrication",
      "Install",
      "Template",
    ]);
    expect(body.data[0]).toMatchObject({
      viewKind: "calendar",
      ownerUserId: null,
      isShared: true,
      isDefault: false,
      config: {
        version: 1,
        displayType: "week",
        colorBy: "appointmentType",
      },
    });
  });

  it("rejects invalid viewKind", async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/calendar-views?viewKind=bad`,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
    });
    expect(body.details.viewKind).toBeDefined();
  });

  it("creates a private calendar view", async () => {
    const created = await createView();

    expect(created).toMatchObject({
      name: "My Install View",
      viewKind: "calendar",
      isShared: false,
      isDefault: false,
      config: {
        version: 1,
        displayType: "week",
        colorBy: "appointmentType",
      },
    });
    expect(created.ownerUserId).toEqual(expect.any(String));
  });

  it("updates an owned calendar view", async () => {
    const created = await createView();

    const response = await fetch(`${baseUrl}/api/v1/calendar-views/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Updated Install View",
        isShared: true,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: created.id,
      name: "Updated Install View",
      isShared: true,
    });
  });

  it("sets a calendar view as the current user's default", async () => {
    const created = await createView();

    const response = await fetch(
      `${baseUrl}/api/v1/calendar-views/${created.id}/make-default`,
      { method: "POST" },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: created.id,
      isDefault: true,
    });

    const listResponse = await fetch(`${baseUrl}/api/v1/calendar-views`);
    const listBody = await listResponse.json();
    const listed = listBody.data.find((view: { id: string }) => view.id === created.id);

    expect(listed.isDefault).toBe(true);
  });

  it("archives an owned calendar view", async () => {
    const created = await createView();

    const response = await fetch(`${baseUrl}/api/v1/calendar-views/${created.id}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);

    const getResponse = await fetch(`${baseUrl}/api/v1/calendar-views/${created.id}`);
    expect(getResponse.status).toBe(404);
  });

  it("allows admin to update a shared calendar view", async () => {
    const listResponse = await fetch(`${baseUrl}/api/v1/calendar-views`);
    const listBody = await listResponse.json();
    const sharedView = listBody.data[0];

    const response = await fetch(`${baseUrl}/api/v1/calendar-views/${sharedView.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Admin Updated View" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: sharedView.id,
      name: "Admin Updated View",
    });
  });

  it("prevents non-admin users from updating a shared calendar view", async () => {
    const pool = app.get<Pool>(DATABASE_POOL);
    const token = await seedTestSession(pool, "salesperson");
    setTestAuthToken(token);

    const listResponse = await fetch(`${baseUrl}/api/v1/calendar-views`);
    const listBody = await listResponse.json();
    const sharedView = listBody.data[0];

    const response = await fetch(`${baseUrl}/api/v1/calendar-views/${sharedView.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Should Not Save" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      code: "FORBIDDEN",
      message: "User cannot edit this calendar view",
    });
  });
});
