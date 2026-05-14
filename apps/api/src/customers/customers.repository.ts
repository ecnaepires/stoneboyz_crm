import { Inject, Injectable } from "@nestjs/common";
import type {
  ArchiveCustomerInput,
  CreateCustomerInput,
  Customer,
  CustomerSortBy,
  ListCustomersInput,
  RestoreCustomerInput,
  SortDirection,
  UpdateCustomerInput,
} from "@stoneboyz/domain";
import type { Pool } from "pg";
import { DATABASE_POOL } from "../database.provider.js";
import { mapCustomerRow, type CustomerRow } from "./customer.mapper.js";

type NormalizedListCustomersInput = Omit<
  ListCustomersInput,
  "limit" | "sortBy" | "sortDirection"
> & {
  limit: number;
  sortBy: CustomerSortBy;
  sortDirection: SortDirection;
};

interface CustomerCursor {
  id: string;
  sortBy: CustomerSortBy;
  sortValue: string;
}

const SORT_COLUMNS: Record<CustomerSortBy, string> = {
  name: "name",
  createdAt: "created_at",
  updatedAt: "updated_at",
  status: "status",
};

const UPDATE_COLUMNS = {
  customerKind: "customer_kind",
  name: "name",
  companyName: "company_name",
  firstName: "first_name",
  lastName: "last_name",
  displayName: "display_name",
  status: "status",
  type: "type",
  ownerUserId: "owner_user_id",
  taxId: "tax_id",
  website: "website",
  industry: "industry",
  companySize: "company_size",
  source: "source",
  tags: "tags",
  notesSummary: "notes_summary",
  phone: "phone",
  whatsappPhone: "whatsapp_phone",
  billingEmail: "billing_email",
} satisfies Record<Exclude<keyof UpdateCustomerInput, "actorUserId">, string>;

export class InvalidCustomerCursorError extends Error {
  constructor() {
    super("Invalid customer cursor");
  }
}

const encodeCursor = (cursor: CustomerCursor): string => {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
};

const decodeCursor = (cursor: string): CustomerCursor => {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<CustomerCursor>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.sortValue !== "string" ||
      (parsed.sortBy !== "name" &&
        parsed.sortBy !== "createdAt" &&
        parsed.sortBy !== "updatedAt" &&
        parsed.sortBy !== "status")
    ) {
      throw new InvalidCustomerCursorError();
    }

    return {
      id: parsed.id,
      sortBy: parsed.sortBy,
      sortValue: parsed.sortValue,
    };
  } catch (error) {
    if (error instanceof InvalidCustomerCursorError) {
      throw error;
    }

    throw new InvalidCustomerCursorError();
  }
};

const getCursorSortValue = (
  row: CustomerRow,
  sortBy: CustomerSortBy,
): string => {
  switch (sortBy) {
    case "createdAt":
      return row.created_at.toISOString();
    case "updatedAt":
      return row.updated_at.toISOString();
    case "name":
      return row.name;
    case "status":
      return row.status;
  }
};

@Injectable()
export class CustomersRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(input: NormalizedListCustomersInput): Promise<{
    data: Customer[];
    hasMore: boolean;
    nextCursor: string | null;
    }> {
    const values: unknown[] = [];
    const where: string[] = [
      input.includeArchived ? "deleted_at IS NOT NULL" : "deleted_at IS NULL",
    ];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.search !== undefined) {
      where.push(`name ILIKE ${addValue(`%${input.search}%`)}`);
    }

    if (input.status !== undefined) {
      where.push(`status = ${addValue(input.status)}`);
    }

    if (input.type !== undefined) {
      where.push(`type = ${addValue(input.type)}`);
    }

    if (input.ownerUserId !== undefined) {
      where.push(`owner_user_id = ${addValue(input.ownerUserId)}`);
    }

    if (input.customerKind !== undefined) {
      where.push(`customer_kind = ${addValue(input.customerKind)}`);
    }

    if (input.tag !== undefined && input.tag.length > 0) {
      where.push(`tags && ${addValue(input.tag)}::text[]`);
    }

    if (input.industry !== undefined) {
      where.push(`industry = ${addValue(input.industry)}`);
    }

    if (input.source !== undefined) {
      where.push(`source = ${addValue(input.source)}`);
    }

    if (input.createdAtFrom !== undefined) {
      where.push(`created_at >= ${addValue(input.createdAtFrom)}`);
    }

    if (input.createdAtTo !== undefined) {
      where.push(`created_at <= ${addValue(input.createdAtTo)}`);
    }

    const sortColumn = SORT_COLUMNS[input.sortBy];
    const sortDirection =
      input.sortDirection.toUpperCase() as Uppercase<SortDirection>;

    if (input.cursor !== undefined) {
      const cursor = decodeCursor(input.cursor);

      if (cursor.sortBy !== input.sortBy) {
        throw new InvalidCustomerCursorError();
      }

      if (input.sortDirection === "asc") {
        where.push(
          `(${sortColumn} > ${addValue(cursor.sortValue)} OR (${sortColumn} = ${addValue(cursor.sortValue)} AND id > ${addValue(cursor.id)}))`,
        );
      } else {
        where.push(
          `(${sortColumn} < ${addValue(cursor.sortValue)} OR (${sortColumn} = ${addValue(cursor.sortValue)} AND id > ${addValue(cursor.id)}))`,
        );
      }
    }

    const limitValue = addValue(input.limit + 1);

    const result = await this.pool.query<CustomerRow>(
      `
        SELECT *
        FROM customers
        WHERE ${where.join(" AND ")}
        ORDER BY ${sortColumn} ${sortDirection}, id ASC
        LIMIT ${limitValue}
      `,
      values,
    );

    const rows = result.rows.slice(0, input.limit);

    return {
      data: rows.map(mapCustomerRow),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
          ? encodeCursor({
              id: rows.at(-1)!.id,
              sortBy: input.sortBy,
              sortValue: getCursorSortValue(rows.at(-1)!, input.sortBy),
            })
          : null,
    };
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const result = await this.pool.query<CustomerRow>(
      `
        INSERT INTO customers (
          customer_kind,
          name,
          company_name,
          first_name,
          last_name,
          display_name,
          status,
          type,
          owner_user_id,
          tax_id,
          website,
          industry,
          company_size,
          source,
          tags,
          notes_summary,
          phone,
          whatsapp_phone,
          billing_email
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `,
      [
        input.customerKind,
        input.name,
        input.companyName ?? null,
        input.firstName ?? null,
        input.lastName ?? null,
        input.displayName ?? null,
        input.status,
        input.type,
        input.ownerUserId,
        input.taxId ?? null,
        input.website ?? null,
        input.industry ?? null,
        input.companySize ?? null,
        input.source ?? null,
        input.tags ?? [],
        input.notesSummary ?? null,
        input.phone ?? null,
        input.whatsappPhone ?? null,
        input.billingEmail ?? null,
      ],
    );

    return mapCustomerRow(result.rows[0] as CustomerRow);
  }

  async findById(customerId: string): Promise<Customer | null> {
    const result = await this.pool.query<CustomerRow>(
      `
        SELECT *
        FROM customers
        WHERE id = $1 AND deleted_at IS NULL
      `,
      [customerId],
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerRow(row);
  }

  async update(
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<Customer | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateCustomerInput;

      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    assignments.push("updated_at = now()");

    const idPlaceholder = addValue(customerId);

    const result = await this.pool.query<CustomerRow>(
      `
        UPDATE customers
        SET ${assignments.join(", ")}
        WHERE id = ${idPlaceholder} AND deleted_at IS NULL
        RETURNING *
      `,
      values,
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerRow(row);
  }

  async archive(
    customerId: string,
    input: ArchiveCustomerInput,
  ): Promise<{
    customer: Customer;
    archivedContactIds: string[];
    archivedAddressIds: string[];
    archivedNoteIds: string[];
    archivedProjectIds: string[];
  } | null> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const customerResult = await client.query<CustomerRow>(
        `
          UPDATE customers
          SET
            deleted_at = now(),
            deleted_by_user_id = $2,
            archive_reason = $3,
            updated_at = now()
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING *
        `,
        [customerId, input.actorUserId, input.archiveReason ?? null],
      );

      const customerRow = customerResult.rows[0];

      if (customerRow === undefined) {
        await client.query("ROLLBACK");
        return null;
      }

      const contactsResult = await client.query<{ id: string }>(
        `
          UPDATE customer_contacts
          SET deleted_at = now(), updated_at = now()
          WHERE customer_id = $1 AND deleted_at IS NULL
          RETURNING id
        `,
        [customerId],
      );

      const addressesResult = await client.query<{ id: string }>(
        `
          UPDATE customer_addresses
          SET deleted_at = now(), updated_at = now()
          WHERE customer_id = $1 AND deleted_at IS NULL
          RETURNING id
        `,
        [customerId],
      );

      const notesResult = await client.query<{ id: string }>(
        `
          UPDATE customer_notes
          SET deleted_at = now(), updated_at = now()
          WHERE customer_id = $1 AND deleted_at IS NULL
          RETURNING id
        `,
        [customerId],
      );

      const projectsResult = await client.query<{ id: string }>(
        `
          UPDATE projects
          SET archived_at = now(), updated_at = now()
          WHERE customer_id = $1 AND archived_at IS NULL
          RETURNING id
        `,
        [customerId],
      );

      await client.query("COMMIT");

      return {
        customer: mapCustomerRow(customerRow),
        archivedContactIds: contactsResult.rows.map((row) => row.id),
        archivedAddressIds: addressesResult.rows.map((row) => row.id),
        archivedNoteIds: notesResult.rows.map((row) => row.id),
        archivedProjectIds: projectsResult.rows.map((row) => row.id),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async restore(
    customerId: string,
    _input: RestoreCustomerInput,
  ): Promise<Customer | null> {
    const result = await this.pool.query<CustomerRow>(
      `
        UPDATE customers
        SET
          deleted_at = NULL,
          deleted_by_user_id = NULL,
          archive_reason = NULL,
          updated_at = now()
        WHERE id = $1 AND deleted_at IS NOT NULL
        RETURNING *
      `,
      [customerId],
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerRow(row);
  }
}
