import { describe, expect, it } from 'vitest';
import { googleMapsDirectionsHref } from './map-links.js';

describe('googleMapsDirectionsHref', () => {
  it('dedupes and encodes addresses', () => {
    expect(
      googleMapsDirectionsHref([
        '123 Main St, Austin TX',
        '123 Main St, Austin TX',
        '456 Stone Way',
      ]),
    ).toBe(
      'https://www.google.com/maps/dir/123%20Main%20St%2C%20Austin%20TX/456%20Stone%20Way',
    );
  });

  it('returns null when no usable addresses exist', () => {
    expect(googleMapsDirectionsHref(['', '   '])).toBeNull();
  });
});
