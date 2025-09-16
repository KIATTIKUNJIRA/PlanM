import type { FeatureCollection, Geometry } from 'geojson';

// Lightweight normalizer: coerce many common storage shapes into a
// GeoJSON FeatureCollection. Keep this small and dependency-free.
export function normalizeRawToFeatureCollection(raw: any): FeatureCollection | null {
  if (!raw) return null;
  // Already a FeatureCollection
  if (raw.type === 'FeatureCollection') return raw as FeatureCollection;
  // Single Feature
  if (raw.type === 'Feature') return { type: 'FeatureCollection', features: [raw] } as FeatureCollection;
  // Geometry object
  if (raw.type && ['Polygon','MultiPolygon','Point','LineString','MultiLineString','MultiPoint'].includes(raw.type)) {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: raw as Geometry }] } as FeatureCollection;
  }

  // st_asgeojson wrapper
  if (raw.st_asgeojson && typeof raw.st_asgeojson === 'string') {
    try { const p = JSON.parse(raw.st_asgeojson); return normalizeRawToFeatureCollection(p); } catch(e){}
  }

  // If object, try likely fields and nested JSON strings
  if (typeof raw === 'object') {
    const keys = Object.keys(raw);
    const tryKeys = ['geometry_geojson','geometry','geom','the_geom','geojson','shape','st_asgeojson','geo'];
    for (const k of tryKeys) {
      if ((raw as any)[k]) {
        const out = normalizeRawToFeatureCollection((raw as any)[k]);
        if (out) return out;
      }
    }
    for (const k of keys) {
      const v = (raw as any)[k];
      if (typeof v === 'string' && (v.trim().startsWith('{') || v.trim().startsWith('['))) {
        try { const p = JSON.parse(v); const out = normalizeRawToFeatureCollection(p); if (out) return out; } catch(e){}
      }
    }
  }

  // If string, try JSON.parse then simple WKT parse
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s.startsWith('{') || s.startsWith('[')) {
      try { const p = JSON.parse(s); return normalizeRawToFeatureCollection(p); } catch(e){}
    }
    // lightweight WKT handling
    const parseWkt = (wkt: string) => {
      const t = wkt.replace(/^SRID=\d+;\s*/i,'').trim();
      const mPoint = t.match(/^POINT\s*\(\s*([0-9eE+\-.]+)\s+([0-9eE+\-.]+)\s*\)$/i);
      if (mPoint) return { type: 'Point', coordinates: [parseFloat(mPoint[1]), parseFloat(mPoint[2])] } as Geometry;
      const mPolygon = t.match(/^POLYGON\s*\(\s*\((.+)\)\s*\)$/i);
      if (mPolygon) {
        try { const coords = mPolygon[1].split(',').map(p => p.trim().split(/\s+/).map(Number)); return { type:'Polygon', coordinates: [coords as any] } as Geometry; } catch(e){}
      }
      const mMulti = t.match(/^MULTIPOLYGON\s*\(/i);
      if (mMulti) {
        try {
          const inner = t.substring(t.indexOf('((')+2, t.lastIndexOf('))'));
          const polys = inner.split(')),((').map(p => p.replace(/^[\(\)]+|[\(\)]+$/g, ''));
          const coords = polys.map(poly => poly.split('),(').map(r => r.replace(/\(|\)/g,'').trim().split(',').map(pt => pt.trim().split(/\s+/).map(Number))));
          return { type:'MultiPolygon', coordinates: coords as any } as Geometry;
        } catch(e){}
      }
      return null;
    };
    const geom = parseWkt(s);
    if (geom) return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: geom }] } as FeatureCollection;
  }

  return null;
}

export function fcFromValue(value: any): FeatureCollection | null {
  return normalizeRawToFeatureCollection(value);
}
