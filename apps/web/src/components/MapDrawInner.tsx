"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import L, { FeatureGroup as FeatureGroupType } from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

export type MapDrawInnerHandle = { clear: () => void };

type Props = {
  initialGeometry?: any;
  onChange?: (g: any) => void;
  center?: [number, number];
  zoom?: number;
};

function GeomanControls({
  drawnGroup,
  onChange,
  initialGeometry,
}: {
  drawnGroup: React.MutableRefObject<FeatureGroupType | null>;
  onChange?: (g: any) => void;
  initialGeometry?: any;
}) {
  const map = useMap();

  React.useEffect(() => {
    if (!map || !drawnGroup.current) return;

    // Add Geoman controls
    map.pm.addControls({
      position: "topleft",
      drawMarker: true,
      drawPolygon: true,
      drawRectangle: true,
      drawCircle: true,
      editMode: true,
      removalMode: true,
    });

    // events
    map.on("pm:create", (e: any) => {
      drawnGroup.current?.addLayer(e.layer);
      onChange?.(e.layer.toGeoJSON());
    });

    map.on("pm:edit", (e: any) => {
      let last: any = null;
      e.layers.eachLayer((l: any) => (last = l));
      if (last) onChange?.(last.toGeoJSON());
    });

    map.on("pm:remove", () => {
      const layers = drawnGroup.current?.getLayers() || [];
      if (layers.length === 0) onChange?.(null);
      else onChange?.(layers[layers.length - 1].toGeoJSON());
    });

    // Load initial geometry
    if (initialGeometry) {
      const g = L.geoJSON(initialGeometry);
      g.eachLayer((ly) => drawnGroup.current?.addLayer(ly));
      onChange?.(initialGeometry);
      const b = (drawnGroup.current as any)?.getBounds?.();
      if (b?.isValid()) map.fitBounds(b);
    }
  }, [map, drawnGroup, onChange, initialGeometry]);

  return null;
}

const MapDrawInner = forwardRef<MapDrawInnerHandle, Props>(
  ({ initialGeometry, onChange, center = [13.736717, 100.523186], zoom = 7 }, ref) => {
    const drawnGroupRef = React.useRef<FeatureGroupType | null>(null);

    // ให้ parent สามารถ clear ได้
    useImperativeHandle(ref, () => ({
      clear: () => {
        if (drawnGroupRef.current) {
          drawnGroupRef.current.clearLayers();
          onChange?.(null);
        }
      },
    }));

    return (
      <div className="w-full h-[575px] rounded-lg overflow-hidden border">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <FeatureGroup ref={drawnGroupRef as any}>
            <GeomanControls
              drawnGroup={drawnGroupRef}
              onChange={onChange}
              initialGeometry={initialGeometry}
            />
          </FeatureGroup>
        </MapContainer>
      </div>
    );
  }
);

MapDrawInner.displayName = "MapDrawInner";
export default MapDrawInner;
