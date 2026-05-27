import { describe, expect, it } from 'vitest';
import { mapCustomerRow, type CustomerRow } from './customer.mapper.js';

describe('mapCustomerRow', () => {
  it('maps database customer columns to API customer fields', () => {
    const row: CustomerRow = {
      id: '11111111-1111-4111-8111-111111111111',
      customer_kind: 'company',
      name: 'Acme Stone Works',
      company_name: 'Acme Stone Works',
      first_name: null,
      last_name: null,
      display_name: null,
      status: 'lead',
      type: 'customer',
      owner_user_id: '22222222-2222-4222-8222-222222222222',
      primary_contact_id: null,
      billing_contact_id: null,
      billing_address_id: null,
      tax_id: null,
      website: null,
      industry: null,
      company_size: null,
      source: null,
      tags: ['test', 'seed'],
      notes_summary: null,
      phone: null,
      whatsapp_phone: null,
      billing_email: null,
      archive_reason: 'duplicate',
      deleted_at: new Date('2026-05-07T12:00:00.000Z'),
      deleted_by_user_id: '33333333-3333-4333-8333-333333333333',
      created_at: new Date('2026-05-07T10:00:00.000Z'),
      updated_at: new Date('2026-05-07T11:00:00.000Z')
    };

    expect(mapCustomerRow(row)).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      customerKind: 'company',
      companyName: 'Acme Stone Works',
      ownerUserId: '22222222-2222-4222-8222-222222222222',
      tags: ['test', 'seed'],
      archiveReason: 'duplicate',
      archivedAt: '2026-05-07T12:00:00.000Z',
      archivedByUserId: '33333333-3333-4333-8333-333333333333',
      createdAt: '2026-05-07T10:00:00.000Z',
      updatedAt: '2026-05-07T11:00:00.000Z'
    });
  });
});
