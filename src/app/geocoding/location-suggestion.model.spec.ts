import { suggestionFromFeature } from './location-suggestion.model';

describe('suggestionFromFeature', () => {
  it('returns null when coordinates are missing', () => {
    expect(
      suggestionFromFeature({
        geometry: { type: 'Point', coordinates: null as unknown as [number, number] },
        properties: { name: 'X' },
      }),
    ).toBeNull();
  });

  it('returns null when no displayable title exists', () => {
    expect(
      suggestionFromFeature({
        geometry: { type: 'Point', coordinates: [10, 20] },
        properties: {},
      }),
    ).toBeNull();
  });

  it('builds suggestion from name and country', () => {
    const s = suggestionFromFeature({
      geometry: { type: 'Point', coordinates: [13.4, 52.5] },
      properties: { name: 'Berlin', country: 'Germany' },
    });
    expect(s).toEqual(
      expect.objectContaining({
        title: 'Berlin',
        lat: 52.5,
        lon: 13.4,
      }),
    );
  });

  it('prefers street as title when name is absent', () => {
    const s = suggestionFromFeature({
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { street: 'Main St', city: 'Town', country: 'US' },
    });
    expect(s?.title).toBe('Main St');
    expect(s?.display).toContain('Main St');
  });
});
