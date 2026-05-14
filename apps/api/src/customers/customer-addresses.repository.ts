import { Inject, Injectable } from '@nestjs/common';
import type { CreateCustomerAddressInput, CustomerAddress, UpdateCustomerAddressInput } from '@stoneboyz/domain';
import type { Pool } from 'pg';
import { DATABASE_POOL } from '../database.provider.js';
import { mapCustomerAddressRow, type CustomerAddressRow } from './customer-address.mapper.js';

const UPDATE_COLUMNS = {
  type: 'type',
  line1: 'line1',
  line2: 'line2',
  city: 'city',
  region: 'region',
  postalCode: 'postal_code',
  country: 'country',
  isPrimary: 'is_primary',
  isBilling: 'is_billing'
} satisfies Record<Exclude<keyof UpdateCustomerAddressInput, 'actorUserId'>, string>;

@Injectable()
export class CustomerAddressesRepository {
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

  async list(customerId: string): Promise<CustomerAddress[]> {
    const result = await this.pool.query<CustomerAddressRow>(
      `
        SELECT *
        FROM customer_addresses
        WHERE customer_id = $1 AND deleted_at IS NULL
        ORDER BY is_primary DESC, created_at ASC, id ASC
      `,
      [customerId]
    );

    return result.rows.map(mapCustomerAddressRow);
  }

  async findById(customerId: string, addressId: string): Promise<CustomerAddress | null> {
    const result = await this.pool.query<CustomerAddressRow>(
      `
        SELECT *
        FROM customer_addresses
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
      `,
      [customerId, addressId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerAddressRow(row);
  }

  async create(customerId: string, input: Required<CreateCustomerAddressInput>): Promise<CustomerAddress> {
    const result = await this.pool.query<CustomerAddressRow>(
      `
        INSERT INTO customer_addresses (
          customer_id,
          type,
          line1,
          line2,
          city,
          region,
          postal_code,
          country,
          is_primary,
          is_billing
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [
        customerId,
        input.type,
        input.line1,
        input.line2 ?? null,
        input.city,
        input.region ?? null,
        input.postalCode ?? null,
        input.country,
        input.isPrimary,
        input.isBilling
      ]
    );

    return mapCustomerAddressRow(result.rows[0] as CustomerAddressRow);
  }

  async update(
    customerId: string,
    addressId: string,
    input: UpdateCustomerAddressInput
  ): Promise<CustomerAddress | null> {
    const values: unknown[] = [];
    const assignments: string[] = [];

    const addValue = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    for (const [fieldName, columnName] of Object.entries(UPDATE_COLUMNS)) {
      const typedFieldName = fieldName as keyof UpdateCustomerAddressInput;

      if (Object.hasOwn(input, typedFieldName)) {
        assignments.push(`${columnName} = ${addValue(input[typedFieldName])}`);
      }
    }

    assignments.push('updated_at = now()');

    const customerIdPlaceholder = addValue(customerId);
    const addressIdPlaceholder = addValue(addressId);

    const result = await this.pool.query<CustomerAddressRow>(
      `
        UPDATE customer_addresses
        SET ${assignments.join(', ')}
        WHERE customer_id = ${customerIdPlaceholder}
          AND id = ${addressIdPlaceholder}
          AND deleted_at IS NULL
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerAddressRow(row);
  }

  async archive(customerId: string, addressId: string): Promise<CustomerAddress | null> {
    const result = await this.pool.query<CustomerAddressRow>(
      `
        UPDATE customer_addresses
        SET deleted_at = now(), updated_at = now()
        WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        RETURNING *
      `,
      [customerId, addressId]
    );

    const row = result.rows[0];

    return row === undefined ? null : mapCustomerAddressRow(row);
  }

  async makeBilling(customerId: string, addressId: string): Promise<CustomerAddress | null> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const targetResult = await client.query<CustomerAddressRow>(
        `
          SELECT *
          FROM customer_addresses
          WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
        `,
        [customerId, addressId]
      );

      if (targetResult.rows[0] === undefined) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query(
        `
          UPDATE customer_addresses
          SET is_billing = false, updated_at = now()
          WHERE customer_id = $1 AND deleted_at IS NULL
        `,
        [customerId]
      );

      const result = await client.query<CustomerAddressRow>(
        `
          UPDATE customer_addresses
          SET is_billing = true, updated_at = now()
          WHERE customer_id = $1 AND id = $2 AND deleted_at IS NULL
          RETURNING *
        `,
        [customerId, addressId]
      );

      await client.query('COMMIT');

      return mapCustomerAddressRow(result.rows[0] as CustomerAddressRow);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

