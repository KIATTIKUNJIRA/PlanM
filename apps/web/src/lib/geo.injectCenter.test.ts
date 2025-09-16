import { describe, it, expect } from 'vitest';
import { injectCenterFeature, centerLatLng, normalizeToFeatureCollection } from './geo';
import type { FeatureCollection } from 'geojson';

const square: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ [ [0,0],[0,1],[1,1],[1,0],[0,0] ] ] } }
  ]
};

describe('injectCenterFeature', () => {
  it('adds center point when missing', () => {
    const center = centerLatLng(square)!;
    const withPoint = injectCenterFeature(square, center)!;
    expect(withPoint.features.length).toBe(2);
    const point = withPoint.features.find(f => f.geometry.type === 'Point');
    expect(point).toBeTruthy();
    expect(point!.geometry.type).toBe('Point');
    expect((point!.properties as any).role).toBe('center');
  });

  it('does not duplicate center point', () => {
    const center = { lat:0.5, lng:0.5 };
    const first = injectCenterFeature(square, center)!;
    const second = injectCenterFeature(first, center)!;
    expect(second.features.filter(f => f.geometry.type === 'Point').length).toBe(1);
  });

  it('returns original when no center', () => {
    const res = injectCenterFeature(square, null);
    expect(res).toBe(square);
  });
});
