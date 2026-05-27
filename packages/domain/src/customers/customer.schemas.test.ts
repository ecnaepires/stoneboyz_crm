import { describe, expect, it } from "vitest";
import { archiveCustomerSchema, createCustomerContactSchema, createCustomerSchema, listCustomersSchema, restoreCustomerSchema, updateCustomerContactSchema, updateCustomerSchema } from "./customer.schemas.js";

const ACTOR_USER_ID = "22222222-2222-4222-8222-222222222222";

describe("createCustomerSchema", () => {
  it("accepts a valid company customer", () => {
    const result = createCustomerSchema.safeParse({
      actorUserId: ACTOR_USER_ID,
      customerKind: "company",
      name: "Acme Stone Works",
      companyName: "Acme Stone Works",
      status: "lead",
      type: "customer",
      ownerUserId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid owner user id", () => {
    const result = createCustomerSchema.safeParse({
      actorUserId: ACTOR_USER_ID,
      actorUserId: ACTOR_USER_ID,
      customerKind: "company",
      name: "Acme Stone Works",
      companyName: "Acme Stone Works",
      status: "lead",
      type: "customer",
      ownerUserId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });

  it("requires companyName for company customers", () => {
    const result = createCustomerSchema.safeParse({
      actorUserId: ACTOR_USER_ID,
      customerKind: "company",
      name: "Acme Stone Works",
      status: "lead",
      type: "customer",
      ownerUserId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["companyName"]);
  });

  it("requires firstName for person customers", () => {
    const result = createCustomerSchema.safeParse({
      actorUserId: ACTOR_USER_ID,
      customerKind: "person",
      name: "Jane Smith",
      status: "lead",
      type: "customer",
      ownerUserId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["firstName"]);
  });
});

describe("listCustomersSchema", () => {
  it("applies default pagination and sorting", () => {
    const result = listCustomersSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      includeArchived: false,
      limit: 25,
      sortBy: "updatedAt",
      sortDirection: "desc",
    });
  });

  it("rejects invalid limits", () => {
    const result = listCustomersSchema.safeParse({
      limit: 101,
    });

    expect(result.success).toBe(false);
  });

  it('accepts tag as single string and coerces to array', () => {
    const result = listCustomersSchema.safeParse({ tag: 'vip' });
    expect(result.success).toBe(true);
    expect(result.data?.tag).toEqual(['vip']);
  });

  it('accepts tag as array', () => {
    const result = listCustomersSchema.safeParse({ tag: ['vip', 'trial'] });
    expect(result.success).toBe(true);
    expect(result.data?.tag).toEqual(['vip', 'trial']);
  });

  it('accepts industry filter', () => {
    const result = listCustomersSchema.safeParse({ industry: 'construction' });
    expect(result.success).toBe(true);
    expect(result.data?.industry).toBe('construction');
  });

  it('accepts createdAtFrom as ISO string and coerces to Date', () => {
    const result = listCustomersSchema.safeParse({ createdAtFrom: '2025-01-01T00:00:00.000Z' });
    expect(result.success).toBe(true);
    expect(result.data?.createdAtFrom).toBeInstanceOf(Date);
  });

  it('rejects empty string for industry', () => {
    const result = listCustomersSchema.safeParse({ industry: '' });
    expect(result.success).toBe(false);
  });
});

describe("updateCustomerSchema", () => {
  it("accepts a partial customer update", () => {
    const parsed = updateCustomerSchema.parse({
      actorUserId: ACTOR_USER_ID,
      notesSummary: "Prefers morning appointments",
      billingEmail: null
    });

    expect(parsed).toEqual({
      actorUserId: ACTOR_USER_ID,
      notesSummary: "Prefers morning appointments",
      billingEmail: null
    });
  });

  it("requires at least one update field", () => {
    const result = updateCustomerSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe("archiveCustomerSchema", () => {
  it("accepts actor and archive reason", () => {
    const parsed = archiveCustomerSchema.parse({
      actorUserId: "22222222-2222-4222-8222-222222222222",
      archiveReason: "Duplicate account"
    });

    expect(parsed).toEqual({
      actorUserId: "22222222-2222-4222-8222-222222222222",
      archiveReason: "Duplicate account"
    });
  });
});

describe("restoreCustomerSchema", () => {
  it("accepts restore actor", () => {
    const parsed = restoreCustomerSchema.parse({
      actorUserId: "22222222-2222-4222-8222-222222222222"
    });

    expect(parsed).toEqual({
      actorUserId: "22222222-2222-4222-8222-222222222222"
    });
  });
});

describe("createCustomerContactSchema", () => {
  it("applies contact defaults", () => {
    const parsed = createCustomerContactSchema.parse({
      actorUserId: ACTOR_USER_ID,
      firstName: "Alex"
    });

    expect(parsed).toEqual({
      actorUserId: ACTOR_USER_ID,
      firstName: "Alex",
      isPrimary: false,
      isBilling: false,
      preferredChannel: "none"
    });
  });

  it("validates contact email", () => {
    const result = createCustomerContactSchema.safeParse({
      actorUserId: ACTOR_USER_ID,
      firstName: "Alex",
      email: "not-an-email"
    });

    expect(result.success).toBe(false);
  });
});

describe("updateCustomerContactSchema", () => {
  it("accepts a partial contact update", () => {
    const parsed = updateCustomerContactSchema.parse({
      actorUserId: ACTOR_USER_ID,
      email: null,
      preferredChannel: "phone"
    });

    expect(parsed).toEqual({
      actorUserId: ACTOR_USER_ID,
      email: null,
      preferredChannel: "phone"
    });
  });

  it("requires at least one contact update field", () => {
    const result = updateCustomerContactSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
