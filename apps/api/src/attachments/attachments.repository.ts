import { Inject, Injectable } from '@nestjs/common';
import type { Attachment, CreateAttachmentInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapAttachmentRow, type AttachmentRow } from './attachment.mapper.js';

@Injectable()
export class AttachmentsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async customerExists(customerId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM customers
          WHERE id = $1 AND deleted_at IS NULL
        ) AS "exists"
      `,
      [customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async projectExists(customerId: string, projectId: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM projects
          WHERE id = $1
            AND customer_id = $2
            AND archived_at IS NULL
        ) AS "exists"
      `,
      [projectId, customerId]
    );

    return result.rows[0]?.exists ?? false;
  }

  async listByAttachable(customerId: string, attachableType: string, attachableId: string): Promise<Attachment[]> {
    const result = await this.pool.query<AttachmentRow>(
      `
        SELECT *
        FROM attachments
        WHERE customer_id = $1
          AND attachable_type = $2
          AND attachable_id = $3
          AND deleted_at IS NULL
        ORDER BY created_at DESC, id ASC
      `,
      [customerId, attachableType, attachableId]
    );

    return result.rows.map(mapAttachmentRow);
  }

  async create(customerId: string, input: CreateAttachmentInput): Promise<Attachment> {
    const result = await this.pool.query<AttachmentRow>(
      `
        INSERT INTO attachments (
          customer_id,
          attachable_type,
          attachable_id,
          category,
          label,
          file_path,
          mime_type,
          size_bytes,
          uploaded_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        customerId,
        input.attachableType,
        input.attachableId,
        input.category ?? 'other',
        input.label ?? null,
        input.filePath,
        input.mimeType ?? null,
        input.sizeBytes ?? null,
        input.uploadedByUserId
      ]
    );

    return mapAttachmentRow(result.rows[0] as AttachmentRow);
  }

  async softDelete(customerId: string, attachmentId: string, actorUserId: string): Promise<Attachment | null> {
    const result = await this.pool.query<AttachmentRow>(
      `
        UPDATE attachments
        SET deleted_at = now(), deleted_by_user_id = $3
        WHERE customer_id = $1
          AND id = $2
          AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, attachmentId, actorUserId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapAttachmentRow(row);
  }
}
