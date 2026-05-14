import { Inject, Injectable } from '@nestjs/common';
import type { CreateCustomerContactInput, CustomerContact, UpdateCustomerContactInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapCustomerContactRow, type CustomerContactRow } from './customer-contact.mapper.js';

const UPDATE_COLUMNS = {
  firstName: 'first_name',
  lastName: 'last_name',
  jobTitle: 'job_title',
  email: 'email',
  phone: 'phone',
  whatsappPhone: 'whatsapp_phone',
  isPrimary: 'is_primary',
  isBilling: 'is_billing',
  preferredChannel: 'preferred_channel'
} satisfies Record<Exclude<keyof UpdateCustomerContactInput, 'actorUserId'>, string>;

@Injectable()
export class CustomerContactsRepository {
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

  async list(customerId: string): Promise<CustomerContact[]> {
    const result = await this.pool.query<CustomerContactRow>(
      `
        SELECT *
        FROM customer_contacts
        WHERE customer_id = $1 AND deleted_at IS NULL
        ORDER BY is_primary DESC, created_at ASC, id ASC
      `,
      [customerId]
    );

    return result.rows.map(mapCustomerContactRow);
  }

  async findById(customerId: string, contactId: string): Promise<CustomerContact | null> {
    const result = await this.pool.query<CustomerContactRow>(
      `
        SELECT *
        FROM customer_contacts
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
      `,
      [customerId, contactId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerContactRow(row);
  }

  async create(customerId: string, input: Required<CreateCustomerContactInput>): Promise<CustomerContact> {
    const result = await this.pool.query<CustomerContactRow>(
      `
        INSERT INTO customer_contacts (
          customer_id,
          first_name,
          last_name,
          job_title,
          email,
          phone,
          whatsapp_phone,
          is_primary,
          is_billing,
          preferred_channel
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        customerId,
        input.firstName,
        input.lastName ?? null,
        input.jobTitle ?? null,
        input.email ?? null,
        input.phone ?? null,
        input.whatsappPhone ?? null,
        input.isPrimary,
        input.isBilling,
        input.preferredChannel
      ]
    );

    return mapCustomerContactRow(result.rows[0] as CustomerContactRow);
  }

  async update(
    customerId: string,
    contactId: string,
    input: UpdateCustomerContactInput
  ): Promise<CustomerContact | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateCustomerContactInput;

      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    assignments.push('updated_at = now()');

    const customerIdPlaceholder = addValue(customerId);
    const contactIdPlaceholder = addValue(contactId);

    const result = await this.pool.query<CustomerContactRow>(
      `
        UPDATE customer_contacts
        SET ${assignments.join(', ')}
        WHERE customer_id = ${customerIdPlaceholder}
          AND id = ${contactIdPlaceholder}
          AND deleted_at IS NULL
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerContactRow(row);
  }

  async makePrimary(customerId: string, contactId: string): Promise<CustomerContact | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const targetResult = await client.query<CustomerContactRow>(
        `
          SELECT *
          FROM customer_contacts
          WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        `,
        [customerId, contactId]
      );

      if (targetResult.rows[0] === undefined) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(
        `
          UPDATE customer_contacts
          SET is_primary = false, updated_at = now()
          WHERE customer_id = $1 AND deleted_at IS NULL
        `,
        [customerId]
      );

      const result = await client.query<CustomerContactRow>(
        `
          UPDATE customer_contacts
          SET is_primary = true, updated_at = now()
          WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
          RETURNING *
        `,
        [customerId, contactId]
      );

      await client.query('COMMIT');

      return mapCustomerContactRow(result.rows[0] as CustomerContactRow);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async makeBilling(customerId: string, contactId: string): Promise<CustomerContact | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const targetResult = await client.query<CustomerContactRow>(
        `
          SELECT *
          FROM customer_contacts
          WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        `,
        [customerId, contactId]
      );

      if (targetResult.rows[0] === undefined) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(
        `
          UPDATE customer_contacts
          SET is_billing = false, updated_at = now()
          WHERE customer_id = $1 AND deleted_at IS NULL
        `,
        [customerId]
      );

      const result = await client.query<CustomerContactRow>(
        `
          UPDATE customer_contacts
          SET is_billing = true, updated_at = now()
          WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
          RETURNING *
        `,
        [customerId, contactId]
      );

      await client.query('COMMIT');

      return mapCustomerContactRow(result.rows[0] as CustomerContactRow);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async archive(customerId: string, contactId: string): Promise<CustomerContact | null> {
    const result = await this.pool.query<CustomerContactRow>(
      `
        UPDATE customer_contacts
        SET deleted_at = now(), updated_at = now()
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, contactId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerContactRow(row);
  }
}
