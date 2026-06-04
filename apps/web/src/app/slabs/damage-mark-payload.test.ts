import { describe, expect, it } from 'vitest';
import { buildDamageMarkPayload } from './damage-mark-payload';

describe('damage mark payload', () => {
  it('builds an API payload from the marker form', () => {
    const formData = new FormData();
    formData.set('type', 'scratch');
    formData.set('severity', 'minor');
    formData.set('shape', JSON.stringify({ kind: 'circle', x: 0.25, y: 0.5, radius: 0.1 }));
    formData.set('note', 'Near front edge');

    expect(buildDamageMarkPayload(formData)).toEqual({
      type: 'scratch',
      severity: 'minor',
      shape: { kind: 'circle', x: 0.25, y: 0.5, radius: 0.1 },
      note: 'Near front edge',
    });
  });

  it('requires a marked area', () => {
    const formData = new FormData();
    formData.set('type', 'chip');
    formData.set('severity', 'minor');

    expect(() => buildDamageMarkPayload(formData)).toThrow('Mark the damage area on the photo');
  });
});
