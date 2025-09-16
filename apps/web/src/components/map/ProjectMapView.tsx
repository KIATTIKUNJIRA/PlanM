"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  geometry?: GeoJSON.FeatureCollection | null; // geometry ที่บันทึกมาแล้ว
  center?: { lat: number; lng: number } | null; // center fallback ถ้าไม่มี geometry
  height?: number;
};

// component สำหรับ "แสดงผล" ข้อมูล geometry (polygon/marker) ของโครงการ
export default function ProjectMapView({ geometry, center, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;

      // inject CSS ของ Leaflet
      if (!document.getElementById("__leaflet_css")) {
        const css = document.createElement("link");
        css.id = "__leaflet_css";
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet/dist/leaflet.css";
        document.head.appendChild(css);
      }

      // init map ครั้งแรก
      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current!).setView(
          [center?.lat || 13.736717, center?.lng || 100.523186],
          13
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;

      // clear layer เก่า
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      // ถ้ามี geometry → render
      if (geometry && geometry.features.length) {
        layerRef.current = L.geoJSON(geometry, {
          style: { color: "#2563eb", weight: 2, fillOpacity: 0.15 },
        }).addTo(map);

        try {
          const b = layerRef.current.getBounds();
          if (b.isValid()) map.fitBounds(b.pad(0.2));
        } catch {}
      }
      // fallback → แสดง marker ตาม center
      else if (center) {
        layerRef.current = L.marker([center.lat, center.lng]).addTo(map);
        map.setView([center.lat, center.lng], 14);
      }
    })();
  }, [geometry, center]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}
