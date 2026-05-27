import { Inject, Injectable } from '@nestjs/common';
import type {
  ArchiveProjectInput,
  CreateProjectInput,
  ListProjectsInput,
  Project,
  ProjectSortBy,
  SortDirection,
  UpdateProjectInput
} from '@stoneboyz/domain';
import type { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapProjectRow, type ProjectRow } from './project.mapper.js';

type NormalizedListProjectsInput = Omit<
  ListProjectsInput,
  'limit' | 'sortBy' | 'sortDirection'
> & {
  limit: number;
  sortBy: ProjectSortBy;
  sortDirection: SortDirection;
};

interface ProjectCursor {
  id: string;
  sortBy: ProjectSortBy;
  sortValue: string;
}

const SORT_COLUMNS: Record<ProjectSortBy, string> = {
  title: 'title',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  status: 'status'
};

const UPDATE_COLUMNS = {
  customerId: 'customer_id',
  title: 'title',
  description: 'description',
  status: 'status',
  ownerUserId: 'owner_user_id'
} satisfies Record<Exclude<keyof UpdateProjectInput, 'actorUserId' | 'jobAddress'>, string>;

const JOB_ADDRESS_COLUMNS = {
  line1: 'job_address_line1',
  line2: 'job_address_line2',
  city: 'job_city',
  region: 'job_region',
  postalCode: 'job_postal_code',
  country: 'job_country',
  contactName: 'job_contact_name',
  phone: 'job_phone',
  email: 'job_email'
} satisfies Record<keyof NonNullable<CreateProjectInput['jobAddress']>, string>;

export class InvalidProjectCursorError extends Error {
  constructor() {
    super('Invalid project cursor');
  }
}

const encodeCursor = (cursor: ProjectCursor): string => {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
};

const decodeCursor = (cursor: string): ProjectCursor => {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8')
    ) as Partial<ProjectCursor>;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.sortValue !== 'string' ||
      (parsed.sortBy !== 'title' &&
        parsed.sortBy !== 'createdAt' &&
        parsed.sortBy !== 'updatedAt' &&
        parsed.sortBy !== 'status')
    ) {
      throw new InvalidProjectCursorError();
    }

    return {
      id: parsed.id,
      sortBy: parsed.sortBy,
      sortValue: parsed.sortValue
    };
  } catch (error) {
    if (error instanceof InvalidProjectCursorError) {
      throw error;
    }

    throw new InvalidProjectCursorError();
  }
};

const getCursorSortValue = (
  row: ProjectRow,
  sortBy: ProjectSortBy
): string => {
  switch (sortBy) {
    case 'createdAt':
      return row.created_at.toISOString();
    case 'updatedAt':
      return row.updated_at.toISOString();
    case 'title':
      return row.title;
    case 'status':
      return row.status;
  }
};

@Injectable()
export class ProjectsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async list(input: NormalizedListProjectsInput): Promise<{
    data: Project[];
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const values: unknown[] = [];
    const where: string[] = [
      input.includeArchived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'
    ];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (input.search !== undefined) {
      where.push(`title ILIKE ${addValue(`%${input.search}%`)}`);
    }

    if (input.status !== undefined) {
      where.push(`status = ${addValue(input.status)}`);
    }

    if (input.customerId !== undefined) {
      where.push(`customer_id = ${addValue(input.customerId)}`);
    }

    if (input.ownerUserId !== undefined) {
      where.push(`owner_user_id = ${addValue(input.ownerUserId)}`);
    }

    const sortColumn = SORT_COLUMNS[input.sortBy];
    const sortDirection =
      input.sortDirection.toUpperCase() as Uppercase<SortDirection>;

    if (input.cursor !== undefined) {
      const cursor = decodeCursor(input.cursor);

      if (cursor.sortBy !== input.sortBy) {
        throw new InvalidProjectCursorError();
      }

      if (input.sortDirection === 'asc') {
        where.push(
          `(${sortColumn} > ${addValue(cursor.sortValue)} OR (${sortColumn} = ${addValue(cursor.sortValue)} AND id > ${addValue(cursor.id)}))`
        );
      } else {
        where.push(
          `(${sortColumn} < ${addValue(cursor.sortValue)} OR (${sortColumn} = ${addValue(cursor.sortValue)} AND id > ${addValue(cursor.id)}))`
        );
      }
    }

    const limitValue = addValue(input.limit + 1);

    const result = await this.pool.query<ProjectRow>(
      `
        SELECT *
        FROM projects
        WHERE ${where.join(' AND ')}
        ORDER BY ${sortColumn} ${sortDirection}, id ASC
        LIMIT ${limitValue}
      `,
      values
    );

    const rows = result.rows.slice(0, input.limit);

    return {
      data: rows.map(mapProjectRow),
      hasMore: result.rows.length > input.limit,
      nextCursor:
        result.rows.length > input.limit && rows.at(-1) !== undefined
          ? encodeCursor({
              id: rows.at(-1)!.id,
              sortBy: input.sortBy,
              sortValue: getCursorSortValue(rows.at(-1)!, input.sortBy)
            })
          : null
    };
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const project = await this.createWithClient(client, input);
      await client.query('COMMIT');
      return project;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createWithClient(client: PoolClient, input: CreateProjectInput): Promise<Project> {
    const jobNumber = await this.nextJobNumber(client);
    const jobAddress = await this.resolveJobAddress(client, input);

    const result = await client.query<ProjectRow>(
      `
        INSERT INTO projects (
          customer_id,
          job_number,
          title,
          description,
          status,
          owner_user_id,
          job_address_line1,
          job_address_line2,
          job_city,
          job_region,
          job_postal_code,
          job_country,
          job_contact_name,
          job_phone,
          job_email
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `,
      [
        input.customerId,
        jobNumber,
        input.title,
        input.description ?? null,
        input.status ?? 'draft',
        input.ownerUserId,
        jobAddress?.line1 ?? null,
        jobAddress?.line2 ?? null,
        jobAddress?.city ?? null,
        jobAddress?.region ?? null,
        jobAddress?.postalCode ?? null,
        jobAddress?.country ?? null,
        jobAddress?.contactName ?? null,
        jobAddress?.phone ?? null,
        jobAddress?.email ?? null
      ]
    );

    return mapProjectRow(result.rows[0] as ProjectRow);
  }

  async findById(projectId: string): Promise<Project | null> {
    const result = await this.pool.query<ProjectRow>(
      `
        SELECT *
        FROM projects
        WHERE id = $1 AND archived_at IS NULL
      `,
      [projectId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapProjectRow(row);
  }

  async update(projectId: string, input: UpdateProjectInput): Promise<Project | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateProjectInput;

      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    if (Object.hasOwn(input, 'jobAddress')) {
      for (const [fieldName, columnName] of Object.entries(JOB_ADDRESS_COLUMNS)) {
        const typedFieldName = fieldName as keyof NonNullable<UpdateProjectInput['jobAddress']>;
        assignments.push(`${columnName} = ${addValue(input.jobAddress?.[typedFieldName] ?? null)}`);
      }
    }

    assignments.push('updated_at = now()');

    const idPlaceholder = addValue(projectId);

    const result = await this.pool.query<ProjectRow>(
      `
        UPDATE projects
        SET ${assignments.join(', ')}
        WHERE id = ${idPlaceholder} AND archived_at IS NULL
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapProjectRow(row);
  }

  async archive(
    projectId: string,
    _input: ArchiveProjectInput
  ): Promise<Project | null> {
    const result = await this.pool.query<ProjectRow>(
      `
        UPDATE projects
        SET archived_at = now(), updated_at = now()
        WHERE id = $1 AND archived_at IS NULL
        RETURNING *
      `,
      [projectId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapProjectRow(row);
  }

  private async nextJobNumber(client: PoolClient): Promise<string> {
    const prefix = 'SBZ-';

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [prefix]);

    const result = await client.query<{ next_number: number }>(
      `
        SELECT COALESCE(MAX(SUBSTRING(job_number FROM 5)::integer), 0) + 1 AS next_number
        FROM projects
        WHERE job_number ~ '^SBZ-[0-9]+$'
      `
    );

    const nextNumber = result.rows[0]?.next_number ?? 1;

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  private async resolveJobAddress(
    client: PoolClient,
    input: CreateProjectInput
  ): Promise<CreateProjectInput['jobAddress'] | null> {
    if (input.jobAddress !== undefined) {
      return input.jobAddress;
    }

    if (input.copyFromCustomerPrimary === false) {
      return null;
    }

    const result = await client.query<{
      line1: string;
      line2: string | null;
      city: string;
      region: string | null;
      postal_code: string | null;
      country: string;
    }>(
      `
        SELECT line1, line2, city, region, postal_code, country
        FROM customer_addresses
        WHERE customer_id = $1 AND is_primary = true AND deleted_at IS NULL
        ORDER BY created_at ASC, id ASC
        LIMIT 1
      `,
      [input.customerId]
    );

    const row = result.rows[0];

    return row === undefined
      ? null
        : {
          line1: row.line1,
          line2: row.line2,
          city: row.city,
          region: row.region,
          postalCode: row.postal_code,
          country: row.country,
          contactName: null,
          phone: null,
          email: null
        };
  }
}
