import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import * as turf from '@turf/turf';

export type GeoLike = Feature | FeatureCollection | null;

export function normalizeToFeatureCollection(geo: GeoLike): FeatureCollection | null {
  if (!geo) return null;
  if ((geo as FeatureCollection).type === 'FeatureCollection') return geo as FeatureCollection;
  if ((geo as Feature).type === 'Feature') return turf.featureCollection([geo as Feature]);
  return null;
}

export function centerLatLng(geo: GeoLike): { lat: number; lng: number } | null {
  const fc = normalizeToFeatureCollection(geo);
  if (!fc || fc.features.length === 0) return null;
  const center = turf.center(fc);
  const [lng, lat] = center.geometry.coordinates;
  return { lat, lng };
}

export function areaSqm(geo: GeoLike): number | null {
  const fc = normalizeToFeatureCollection(geo);
  if (!fc || fc.features.length === 0) return null;
  const polys = fc.features.filter((f: Feature) => ['Polygon','MultiPolygon'].includes(f.geometry.type));
  if (polys.length === 0) return 0;
  return polys.reduce((sum: number, f: Feature) => sum + turf.area(f as Feature<Polygon | MultiPolygon>), 0);
}

export function perimeterMeters(geo: GeoLike): number | null {
  const fc = normalizeToFeatureCollection(geo);
  if (!fc || fc.features.length === 0) return null;
  const polys = fc.features.filter((f: Feature) => ['Polygon','MultiPolygon'].includes(f.geometry.type));
  if (polys.length === 0) return 0;
  // ใช้ turf.length บนเส้นขอบ (polygonToLine)
  const len = polys.reduce((sum: number, f: Feature) => {
    const line = turf.polygonToLine(f as Feature<Polygon | MultiPolygon>);
    return sum + turf.length(line, { units: 'kilometers' });
  }, 0);
  return len * 1000; // km -> m
}

export function formatAreaRaiSqm(sqm: number | null): string {
  if (sqm == null) return '-';
  const rai = Math.floor(sqm / 1600);
  const remainder = Math.round(sqm - rai * 1600);
  return `${rai} ไร่ ${remainder.toLocaleString()} ตร.ม.`;
}

export function formatMeters(m: number | null): string {
  if (m == null) return '-';
  return `${Math.round(m).toLocaleString()} ม.`;
}

export function geometryType(geo: GeoLike): string {
  const fc = normalizeToFeatureCollection(geo);
  if (!fc || fc.features.length === 0) return 'None';
  const types = Array.from(new Set(fc.features.map((f: Feature) => f.geometry.type)));
  return types.join(', ');
}
