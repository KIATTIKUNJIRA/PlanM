"use client";
import React from "react";
import MapDrawInner from "./MapDrawInner";

// props หลักสำหรับ component ที่ใช้วาด polygon/geometry
export interface MapDrawProps {
  value?: GeoJSON.MultiPolygon | GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Polygon | null;
  onChange?: (multi: GeoJSON.MultiPolygon | null) => void; // callback เวลา polygon เปลี่ยน
  onFeatureCollectionChange?: (fc: GeoJSON.FeatureCollection | null) => void; // callback เวลา feature ทั้งหมดเปลี่ยน
  height?: number;
  className?: string;
  center?: [number, number]; // center เริ่มต้นของแผนที่
  zoom?: number;             // zoom เริ่มต้น
  readOnly?: boolean;        // โหมด readOnly = ปิดการแก้ไข
}

// helper: แปลงค่า value ที่ส่งเข้ามาให้เป็น FeatureCollection เสมอ
function fcFromValue(value: MapDrawProps["value"]): GeoJSON.FeatureCollection | undefined {
  if (!value) return undefined;
  const v: any = value;
  if (v.type === "FeatureCollection") return v;
  if (v.type === "Feature") return { type: "FeatureCollection", features: [v] };
  if (v.type === "Polygon" || v.type === "MultiPolygon")
    return { type: "FeatureCollection", features: [{ type: "Feature", geometry: v, properties: {} }] } as any;
  return undefined;
}

// helper: แปลง FeatureCollection กลับมาเป็น MultiPolygon
function toMulti(fc: GeoJSON.FeatureCollection | null): GeoJSON.MultiPolygon | null {
  if (!fc) return null;
  const polys: any[] = [];
  fc.features.forEach((f) => {
    if (f.geometry?.type === "Polygon") polys.push(f.geometry.coordinates);
    else if (f.geometry?.type === "MultiPolygon") polys.push(...f.geometry.coordinates);
  });
  return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
}

// component wrapper ที่ห่อ MapDrawInner และแปลงค่าเข้า/ออก
const MapDraw: React.FC<MapDrawProps> = ({ value, onChange, onFeatureCollectionChange, ...rest }) => (
  <MapDrawInner
    initialGeoJSON={fcFromValue(value)}
    onChange={(fc) => {
      onChange?.(toMulti(fc));
      onFeatureCollectionChange?.(fc);
    }}
    {...rest}
  />
);

export default MapDraw;
