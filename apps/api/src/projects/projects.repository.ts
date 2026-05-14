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
import type { Pool } from 'pg';
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
} satisfies Record<Exclude<keyof UpdateProjectInput, 'actorUserId'>, string>;

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
    const result = await this.pool.query<ProjectRow>(
      `
        INSERT INTO projects (
          customer_id,
          title,
          description,
          status,
          owner_user_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        input.customerId,
        input.title,
        input.description ?? null,
        input.status ?? 'draft',
        input.ownerUserId
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
}
