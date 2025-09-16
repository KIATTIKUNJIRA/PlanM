"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  value?: [number, number] | null; // พิกัด lat/lng เริ่มต้น
  onChange?: (lat: number, lng: number) => void; // callback เมื่อเปลี่ยนค่า
  height?: number;
  className?: string;
};

// component สำหรับเลือกตำแหน่งบนแผนที่แบบ marker เดี่ยว
export default function MapPicker({ value, onChange, height = 320, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

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

      const [lat, lng] = value ?? [13.756331, 100.501762];

      // สร้าง map
      const map = L.map(containerRef.current!).setView([lat, lng], 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // marker draggable
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange?.(pos.lat, pos.lng);
      });

      // อนุญาตคลิกบนแผนที่เพื่อเปลี่ยนตำแหน่ง
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        onChange?.(e.latlng.lat, e.latlng.lng);
      });
    })();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ height }} className={className || "rounded border"} />;
}
