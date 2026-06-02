import { describe, expect, it } from 'vitest';

import { mapProjectRow, type ProjectRow } from './project.mapper.js';

describe('mapProjectRow', () => {
  it('maps pipeline stage columns to API project fields', () => {
    const row: ProjectRow = {
      id: '11111111-1111-4111-8111-111111111111',
      customer_id: '22222222-2222-4222-8222-222222222222',
      job_number: 'SB-1001',
      title: 'Kitchen counters',
      description: null,
      job_address_line1: null,
      job_address_line2: null,
      job_city: null,
      job_region: null,
      job_postal_code: null,
      job_country: null,
      job_contact_name: null,
      job_phone: null,
      job_email: null,
      status: 'active',
      pipeline_stage: 'template',
      stage_entered_at: new Date('2026-05-07T10:30:00.000Z'),
      owner_user_id: '33333333-3333-4333-8333-333333333333',
      archived_at: null,
      created_at: new Date('2026-05-07T10:00:00.000Z'),
      updated_at: new Date('2026-05-07T11:00:00.000Z')
    };

    expect(mapProjectRow(row)).toMatchObject({
      pipelineStage: 'template',
      stageEnteredAt: '2026-05-07T10:30:00.000Z'
    });
  });
});
