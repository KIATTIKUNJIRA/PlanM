"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** [lat, lng]; allow null for 'unset' */
  value?: [number, number] | null;
  /** ส่งค่ากลับเมื่อผู้ใช้คลิกหรือ drag marker */
  onChange?: (lat: number, lng: number) => void;
  /** ความสูงของแผนที่ (พิกเซล) */
  height?: number;
  /** className เพิ่มเติมของ container */
  className?: string;
};

export default function MapPicker({ value, onChange, height = 320, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // สร้าง/ทำลายแผนที่ (ครั้งเดียว) และ handle กรณี remount ใน StrictMode/dev
  useEffect(() => {
    let L: any;
    let cancelled = false;

    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled) return;
      L = (leaflet as any).default ?? leaflet;

      // แก้ icon path ให้แสดง marker ได้
      const iconBase = "https://unpkg.com/leaflet@1.9.4/dist/images/";
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: iconBase + "marker-icon-2x.png",
        iconUrl: iconBase + "marker-icon.png",
        shadowUrl: iconBase + "marker-shadow.png",
      });

      if (!containerRef.current) return;

      // หากมี map เก่า (จาก remount/hot-reload) ให้ลบทิ้งก่อน
      if (mapRef.current) {
        try { mapRef.current.off(); mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }

      const [initLat, initLng] = value ?? [13.756331, 100.501762];

      const map = L.map(containerRef.current).setView([initLat, initLng], 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onChange?.(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        onChange?.(
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6)),
        );
      });
    })();

    return () => {
      cancelled = true;
      // cleanup ตอน unmount เพื่อกัน init ซ้ำใน dev/StrictMode
      if (mapRef.current) {
        try { mapRef.current.off(); mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
      markerRef.current = null;
    };
    // ไม่มี dependency เพื่อให้ init ครั้งเดียว และใช้ cleanup จัดการรอบที่ dev รี-mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync ตำแหน่งจาก props.value -> marker/map (ถ้าผู้ใช้พิมพ์ lat/lng เอง)
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    if (!value) return;
    const [lat, lng] = value;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng]);
  }, [value?.[0], value?.[1]]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={className || "rounded-lg border"}
      aria-label="map-picker"
    />
  );
}
