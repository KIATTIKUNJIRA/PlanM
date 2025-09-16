import type { Feature, FeatureCollection, Polygon, MultiPolygon, Geometry } from 'geojson';
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
  // turf.center may return undefined or a feature without geometry/coordinates
  if (!center || !center.geometry || !Array.isArray((center.geometry as any).coordinates) || (center.geometry as any).coordinates.length < 2) {
    return null;
  }
  const [lng, lat] = (center.geometry as any).coordinates;
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

// Add a center Point (role=center) into a FeatureCollection if absent; returns new object (does not mutate input)
export function injectCenterFeature(fc: FeatureCollection | null, center: { lat:number; lng:number } | null): FeatureCollection | null {
  if (!fc || !center) return fc;
  const hasCenter = fc.features.some(f => f.geometry?.type === 'Point' && (f.properties as any)?.role === 'center');
  if (hasCenter) return fc;
  return {
    ...fc,
    features: [
      ...fc.features,
      { type: 'Feature', properties: { role: 'center' }, geometry: { type: 'Point', coordinates: [center.lng, center.lat] } }
    ]
  } as FeatureCollection;
}

// Ensure output geometry is MultiPolygon. Accepts Polygon | MultiPolygon | Feature* | FeatureCollection
export function ensureMultiPolygon(geo: GeoLike | Geometry | null): MultiPolygon | null {
  if (!geo) return null;
  let g: any = geo as any;
  if ((g as FeatureCollection).type === 'FeatureCollection') {
    const fc = g as FeatureCollection;
    // Collect all polygonal geometries and merge into a single MultiPolygon by
    // concatenating outer rings. This ensures multiple drawn polygons are
    // preserved and stored together as one MultiPolygon (connected conceptually
    // for storage/use), while preserving original component polygons.
    const polys: any[] = [];
    fc.features.forEach(f => {
      if (!f.geometry) return;
      if (f.geometry.type === 'Polygon') polys.push((f.geometry as Polygon).coordinates);
      if (f.geometry.type === 'MultiPolygon') polys.push(...(f.geometry as MultiPolygon).coordinates);
    });
    if (polys.length === 0) return null;
    return { type: 'MultiPolygon', coordinates: polys } as MultiPolygon;
  }
  if ((g as Feature).type === 'Feature') {
    const f = g as Feature;
    if (!f.geometry) return null;
    g = f.geometry;
  }
  if (!g) return null;
  if (g.type === 'MultiPolygon') return g as MultiPolygon;
  if (g.type === 'Polygon') {
    return { type: 'MultiPolygon', coordinates: [ (g as Polygon).coordinates ] } as MultiPolygon;
  }
  return null; // not polygonal
}

// Count outer-shell polygons across all Polygon / MultiPolygon features in any input.
// - Polygon counts as 1
// - MultiPolygon counts number of component polygons (outer shells)
// - Ignores holes (inner rings) and ignores non-polygonal geometries.
export function countPolygons(geo: GeoLike | Geometry | null): number {
  if (!geo) return 0;
  let features: Feature[] = [];
  const gather = (g: any) => {
    if (!g) return;
    if (g.type === 'FeatureCollection') {
      (g as FeatureCollection).features.forEach(f => gather(f));
      return;
    }
    if (g.type === 'Feature') {
      gather((g as Feature).geometry);
      return;
    }
    if (g.type === 'Polygon') features.push({ type: 'Feature', properties: {}, geometry: g } as any);
    else if (g.type === 'MultiPolygon') features.push({ type: 'Feature', properties: {}, geometry: g } as any);
  };
  gather(geo as any);
  let count = 0;
  features.forEach(f => {
    if (f.geometry?.type === 'Polygon') count += 1;
    else if (f.geometry?.type === 'MultiPolygon') count += (f.geometry as MultiPolygon).coordinates.length;
  });
  return count;
}
