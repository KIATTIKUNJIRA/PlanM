"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import { MapContainer, TileLayer, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L, { FeatureGroup as FeatureGroupType } from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

export type MapDrawInnerHandle = { clear: () => void };

type Props = {
  initialGeometry?: any;
  onChange?: (g: any) => void;
  center?: [number, number];
  zoom?: number;
};

const MapDrawInner = forwardRef<MapDrawInnerHandle, Props>(
  (
    {
      initialGeometry,
      onChange,
      center = [14.311213971302406, 101.53048441081357],
      zoom = 14,
    },
    ref
  ) => {
    const drawnGroupRef = React.useRef<FeatureGroupType | null>(null);

    // ✅ ให้ parent เรียก clear ได้
    useImperativeHandle(ref, () => ({
      clear: () => {
        if (drawnGroupRef.current) {
          drawnGroupRef.current.clearLayers();
          onChange?.(null);
        }
      },
    }));

    const handleCreated = (e: any) => {
      const layer = e.layer;
      drawnGroupRef.current?.addLayer(layer);
      const allGeoJSON = drawnGroupRef.current?.toGeoJSON();
      onChange?.(allGeoJSON);
    };

    const handleEdited = () => {
      const allGeoJSON = drawnGroupRef.current?.toGeoJSON();
      onChange?.(allGeoJSON);
    };

    const handleDeleted = () => {
      const layers = drawnGroupRef.current?.getLayers() || [];
      if (layers.length === 0) {
        onChange?.(null);
      } else {
        const allGeoJSON = drawnGroupRef.current?.toGeoJSON();
        onChange?.(allGeoJSON);
      }
    };

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
            <EditControl
              position="topleft"
              onCreated={handleCreated}
              onEdited={handleEdited}
              onDeleted={handleDeleted}
              draw={{
                polygon: true,
                rectangle: true,
                circle: true,
                polyline: false,
                marker: false,
                circlemarker: false,
              }}
            />
          </FeatureGroup>
        </MapContainer>
      </div>
    );
  }
);

MapDrawInner.displayName = "MapDrawInner";
export default MapDrawInner;
