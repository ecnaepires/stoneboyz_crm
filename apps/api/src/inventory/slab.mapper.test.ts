import { describe, expect, it } from 'vitest';
import { mapProjectSlabRow, mapSlabRow } from './slab.mapper.js';

describe('slab mapper', () => {
  it('maps slab rows to domain slabs', () => {
    const now = new Date('2026-05-14T12:00:00.000Z');

    expect(
      mapSlabRow({
        id: '11111111-1111-4111-8111-111111111111',
        parent_slab_id: null,
        stone_type: 'Granite Black Galaxy',
        finish: 'polished',
        quality_grade: 'A',
        length_in: 120,
        width_in: 70,
        thickness_cm: 3,
        lot_number: 'LOT-1',
        bundle_number: null,
        warehouse_location: 'A1',
        cost_cents: 120000,
        image_urls: ['https://example.com/slab.jpg'],
        notes: null,
        status: 'available',
        deleted_at: null,
        deleted_by_user_id: null,
        created_at: now,
        updated_at: now
      })
    ).toMatchObject({
      stoneType: 'Granite Black Galaxy',
      finish: 'polished',
      qualityGrade: 'A',
      lengthIn: 120,
      widthIn: 70,
      thicknessCm: 3,
      sqFt: 58.333,
      imageUrls: ['https://example.com/slab.jpg'],
      archivedAt: null,
      createdAt: '2026-05-14T12:00:00.000Z'
    });
  });

  it('maps project slab rows', () => {
    const now = new Date('2026-05-14T12:00:00.000Z');

    expect(
      mapProjectSlabRow({
        id: '11111111-1111-4111-8111-111111111111',
        project_id: '22222222-2222-4222-8222-222222222222',
        slab_id: '33333333-3333-4333-8333-333333333333',
        consumed_by_user_id: null,
        consumed_at: null,
        notes: 'Reserved for island',
        created_at: now
      })
    ).toMatchObject({
      projectId: '22222222-2222-4222-8222-222222222222',
      slabId: '33333333-3333-4333-8333-333333333333',
      consumedAt: null,
      notes: 'Reserved for island'
    });
  });
});
