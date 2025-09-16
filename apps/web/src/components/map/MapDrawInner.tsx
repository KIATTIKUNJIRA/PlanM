// --- New simplified implementation (user-provided) with backward compatibility ---
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { centerLatLng } from '@/lib/geo';

type ProvidedProps = {
  center?: [number, number];      // lat, lng
  zoom?: number;
  initialGeoJSON?: GeoJSON.FeatureCollection;
  onChange?: (fc: GeoJSON.FeatureCollection | null, center?: { lat: number; lng: number } | null) => void;
  // Back-compat props (from previous MapDraw usage):
  value?: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
  height?: number;
  className?: string;
};

function GeomanController({ onChange, initialGeoJSON }: { onChange?: ProvidedProps['onChange']; initialGeoJSON?: GeoJSON.FeatureCollection }) {
  const map = useMap();

  useEffect(() => {
    // @ts-ignore Geoman typings
    map.pm.addControls({
      position: 'topleft',
      drawMarker: true, drawPolygon: true, drawPolyline: true,
      drawRectangle: true, drawCircle: false, drawCircleMarker: false,
      editMode: true, dragMode: true, cutPolygon: true, removalMode: true,
    });

    if (initialGeoJSON) {
      L.geoJSON(initialGeoJSON).addTo(map);
    }

    const collect = () => {
      const features: GeoJSON.Feature[] = [];
      map.eachLayer((layer: any) => {
        if (layer?.toGeoJSON && layer?.pm) {
          const gj = layer.toGeoJSON();
          if (gj?.type === 'FeatureCollection') features.push(...gj.features);
          else if (gj?.type === 'Feature') features.push(gj);
        }
      });
      const fc: GeoJSON.FeatureCollection | null = features.length ? { type: 'FeatureCollection', features } : null;
      const c = centerLatLng(fc as any);
      onChange?.(fc, c);
    };

    map.on('pm:create', collect);
    map.on('pm:edit', collect);
    map.on('pm:remove', collect);

    return () => {
      map.off('pm:create', collect);
      map.off('pm:edit', collect);
      map.off('pm:remove', collect);
    };
  }, [map, onChange, initialGeoJSON]);

  return null;
}

export default function MapDrawInner({
  center = [13.736717, 100.523186],
  zoom = 15,
  initialGeoJSON,
  onChange,
  value, // backward compatibility (ignored if initialGeoJSON provided)
  height = 420,
  className,
}: ProvidedProps) {
  const effectiveInitial = useMemo(() => {
    if (initialGeoJSON) return initialGeoJSON;
    if (value) {
      if ((value as any).type === 'FeatureCollection') return value as GeoJSON.FeatureCollection;
      if ((value as any).type === 'Feature') return { type: 'FeatureCollection', features: [value as GeoJSON.Feature] } as GeoJSON.FeatureCollection;
    }
    return undefined;
  }, [initialGeoJSON, value]);

  return (
    <div className={className}>
      <MapContainer
        center={center as any}
        zoom={zoom}
        className="w-full rounded-xl overflow-hidden border"
        style={{ height }}
      >
        <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' attribution='&copy; OpenStreetMap' />
        <GeomanController onChange={onChange} initialGeoJSON={effectiveInitial} />
      </MapContainer>
    </div>
  );
}
