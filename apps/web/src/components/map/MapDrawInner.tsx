"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as turf from "@turf/turf";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import * as L from "leaflet";
// geoman: enable drawing tools via leaflet-geoman-free
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "leaflet/dist/leaflet.css";

type MapWithGeomanProps = {
  center?: [number, number];
  zoom?: number;
  height?: number;
  className?: string;
  // Accept initial GeoJSON from the wrapper
  initialGeoJSON?: GeoJSON.FeatureCollection | undefined;
  // Emit full FeatureCollection when map content changes
  onChange?: (fc: GeoJSON.FeatureCollection | null) => void;
  readOnly?: boolean;
  confirmFn?: (message: string) => Promise<boolean> | boolean;
  enableSimpleRemoveButton?: boolean;
};

/** ========== Geoman Controls Component ========== */
// Geoman controls removed: this component intentionally omitted.

/** Helper: safely invalidate map size when layout changes */
function MapResizeHandler({ expanded }: { expanded: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const safeInvalidate = () => {
      try {
        const container = (map as any).getContainer && (map as any).getContainer();
        if (!container) return;
        const panes = (map as any).getPanes && (map as any).getPanes();
        if (!panes) return;
        if ((map as any)._leaflet_pos === undefined) {
          // small retry
          setTimeout(() => {
            try {
              map.invalidateSize();
            } catch (_) {}
          }, 150);
          return;
        }
        map.invalidateSize();
      } catch (err) {
        // ignore
        // eslint-disable-next-line no-console
        console.warn("map.invalidateSize failed:", err);
      }
    };

    safeInvalidate();
    const t = window.setTimeout(safeInvalidate, 250);
    return () => window.clearTimeout(t);
  }, [map, expanded]);

  return null;
}

/** MapSync: register map and mirror drawn layers between map instances */
// MapSync removed: cross-instance drawing sync not required here.

/** Minimal Geoman controls initializer
 * - Adds Geoman toolbar to the map when mounted
 * - Honors readOnly prop by disabling controls
 */
function GeomanControls({ readOnly }: { readOnly?: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const pm = (map as any).pm;
    if (!pm) return;

    try {
      pm.addControls({
        position: 'topleft',
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: true,
        drawCircle: true,
        drawPolygon: true,
        editPolygon: true,
        removalMode: true,
        dragMode: true,
      });

      // If readOnly, immediately disable editing and removal
      if (readOnly) {
        try { pm.disableGlobalEditMode && pm.disableGlobalEditMode(); } catch (_) {}
      }
    } catch (e) {
      // ignore
    }

    return () => {
      try {
        // best-effort cleanup: remove toolbar DOM if present
        const container = (map as any)._container;
        const controls = container && container.querySelector && container.querySelector('.leaflet-pm-toolbar');
        if (controls && controls.parentNode) controls.parentNode.removeChild(controls);
      } catch (_) {}
    };
  }, [map, readOnly]);

  return null;
}

/** Bridge that lives inside a MapContainer and reports computed info up */
function MapInfoBridge({ onInfo, onFeatureCollectionChange }: { onInfo: (info: any) => void; onFeatureCollectionChange?: (fc: GeoJSON.FeatureCollection | null) => void }) {
  const map = useMap();

  // Use refs for callbacks so the main map effect doesn't depend on unstable
  // function identities (parents often pass inline arrow functions) which
  // would cause the effect to re-run infinitely.
  const onInfoRef = React.useRef(onInfo);
  const onFcRef = React.useRef(onFeatureCollectionChange);

  useEffect(() => { onInfoRef.current = onInfo; }, [onInfo]);
  useEffect(() => { onFcRef.current = onFeatureCollectionChange; }, [onFeatureCollectionChange]);

  useEffect(() => {
    if (!map) return;

    const compute = () => {
      const features: GeoJSON.Feature[] = [];
      map.eachLayer((layer: any) => {
        if (!layer || !layer.toGeoJSON) return;
        if (layer instanceof L.TileLayer) return;
        try {
          const gj = layer.toGeoJSON();
          if (gj && gj.type) {
            if ((gj as any).type === "FeatureCollection" && (gj as any).features) {
              features.push(...(gj as any).features);
            } else {
              features.push(gj as GeoJSON.Feature);
            }
          }
        } catch (_) {}
      });

      if (features.length === 0) {
        onInfoRef.current({ center: null, area: null, perimeter: null, shape: null, count: 0 });
        onFcRef.current?.(null);
        return;
      }

      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };

      let centroid: GeoJSON.Point | null = null;
      try {
        const cent = turf.centroid(fc as any) as any;
        centroid = cent && cent.geometry ? (cent.geometry as GeoJSON.Point) : null;
      } catch (_) {
        centroid = null;
      }

      let totalArea = 0;
      features.forEach((f) => {
        if (f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")) {
          try {
            totalArea += turf.area(f as any);
          } catch (_) {}
        }
      });

      let totalPerimeter = 0;
      features.forEach((f) => {
        try {
          if (f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")) {
            const line = turf.polygonToLine(f as any);
            totalPerimeter += turf.length(line as any, { units: "kilometers" }) * 1000;
          } else if (f.geometry && f.geometry.type === "LineString") {
            totalPerimeter += turf.length(f as any, { units: "kilometers" }) * 1000;
          }
        } catch (_) {}
      });

      const types = new Set(features.map((f) => f.geometry && f.geometry.type));
      const primary = types.size === 1 ? Array.from(types)[0] : Array.from(types)[0] || null;

      onInfoRef.current({
        center: centroid ? (centroid.coordinates as [number, number]) : null,
        area: totalArea || null,
        perimeter: totalPerimeter || null,
        shape: primary as string | null,
        count: features.length,
      });

      // emit full FeatureCollection to parent (preserve annotation layers etc.)
      onFcRef.current?.(fc);
    };

    compute();

    // listen for both generic layer changes and Geoman's pm events so computed
    // info stays up-to-date when users draw/edit/remove via the toolbar
    map.on("layeradd", compute);
    map.on("layerremove", compute);
    map.on("pm:create", compute);
    map.on("pm:edit", compute);
    map.on("pm:remove", compute);

    return () => {
      map.off("layeradd", compute);
      map.off("layerremove", compute);
      map.off("pm:create", compute);
      map.off("pm:edit", compute);
      map.off("pm:remove", compute);
    };
  }, [map]);

  return null;
}

/** Presentational panel that receives computed info via props */
function MapInfoPanel({ info, compact }: { info: any; compact?: boolean }) {
  const fmt = (n: number | null, digits = 2) => (n === null ? "-" : n.toFixed(digits));

  const displayCenter = info?.center ? `${info.center[1].toFixed(5)}, ${info.center[0].toFixed(5)}` : "-";

  if (compact) {
    const [visible, setVisible] = useState(true);
    if (!visible) return null;
    if (typeof document === "undefined") return null;

    const modal = (
      <>
        {/* backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-40"
          style={{ zIndex: 99998 }}
          onClick={() => setVisible(false)}
          aria-hidden="true"
        />

        {/* centered modal */}
        <div
          className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded p-6 shadow text-sm"
          style={{ zIndex: 99999, minWidth: 320, maxWidth: '90%' }}
          role="alert"
          aria-modal="true"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-4xl text-orange-400 font-light mb-2">!</div>
            <div className="font-semibold text-lg mb-2">แจ้งเตือน</div>
            <div className="text-gray-700 mb-4">
              <div>ศูนย์กลาง: {displayCenter}</div>
              <div>พื้นที่: {info?.area ? `${fmt(info.area)} m²` : "-"}</div>
              <div>เส้นรอบรูป: {info?.perimeter ? `${fmt(info.perimeter)} m` : "-"}</div>
              <div>รูปทรง: {info?.shape ?? "-"}</div>
            </div>

            <div className="w-full flex justify-center">
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
                aria-label="ตกลง"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      </>
    );

    return createPortal(modal, document.body);
  }

  return (
    <div className="mt-3 rounded border bg-white p-3 text-sm">
      <div className="font-medium mb-2">ข้อมูลรูปทรงจากแผนที่ ({info?.count ?? 0} รายการ)</div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
        <div>
          <div className="text-gray-500">ศูนย์กลาง</div>
          <div>{displayCenter}</div>
        </div>
        <div>
          <div className="text-gray-500">พื้นที่</div>
          <div>{info?.area ? `${fmt(info.area)} m²` : "-"}</div>
        </div>
        <div>
          <div className="text-gray-500">เส้นรอบรูป</div>
          <div>{info?.perimeter ? `${fmt(info.perimeter)} m` : "-"}</div>
        </div>
        <div>
          <div className="text-gray-500">รูปทรง</div>
          <div>{info?.shape ?? "-"}</div>
        </div>
      </div>
    </div>
  );
}

/** ========== Main Component ========== */
export default function MapWithGeoman({
  center = [13.736717, 100.523186],
  zoom = 13,
  height = 500,
  className,
  readOnly = false,
  onChange,
  enableSimpleRemoveButton = false,
}: MapWithGeomanProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // suppressEventsRef prevents echo when applying programmatic changes
  const suppressEventsRef = React.useRef(false);
  // shared info computed from whichever map updates last
  const [mapInfo, setMapInfo] = React.useState<any>(null);

  // === Map synchronization helpers (mirror drawn layers between instances)
  // We keep a simple registry of mounted maps and broadcast GeoJSON changes
  // from any map to all others. This does not change the Geoman controls.
  // Implementation notes:
  // - We listen for pm:create / pm:edit / pm:remove on each map.
  // - We serialize non-tile layers to a FeatureCollection and apply to peers.
  // - During programmatic sync we suppress reacting to events to avoid loops.
  

  if (isExpanded) {
    return (
      // make the expanded map truly fullscreen and place the close button on top of the map
      <div className={`${className ?? ""} fixed inset-0 z-50`}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%" }}
          className={`w-full h-full rounded-none overflow-hidden`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {/* Geoman controls (toolbar + UI) */}
          {!readOnly && <GeomanControls />}
          {!readOnly && <GeomanControlsUI enableSimpleRemoveButton={enableSimpleRemoveButton} />}
          <MapInfoBridge onInfo={(i) => setMapInfo(i)} />
          <MapResizeHandler expanded={isExpanded} />
        </MapContainer>
        {/* Info panel under the expanded map */}
        <div className="p-3 bg-transparent">
          <MapInfoPanel compact={false} info={mapInfo} />
        </div>

        {/* Close button rendered outside the Leaflet container so it sits above all map panes
            (we don't touch any map tool code; only adjust the overlay). */}
        <div className="absolute top-4 right-4" style={{ zIndex: 99999 }}>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="bg-white border rounded-md px-3 py-1 text-sm shadow"
            aria-label="ปิดการขยาย"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className ?? ""} relative`}>
      {/* Expand button (non-expanded mode) */}
  <div className="absolute top-4 right-20 z-60"> {/* positioned to sit near the map header's Clear All button */}
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="bg-white border rounded-md px-3 py-1 text-sm shadow"
          aria-label="ขยายแผนที่"
        >
          ขยาย
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height }}
        className={`w-full rounded-xl overflow-hidden border`}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
  {/* Geoman controls (toolbar + UI) */}
  {!readOnly && <GeomanControls />}
  {!readOnly && <GeomanControlsUI enableSimpleRemoveButton={enableSimpleRemoveButton} />}
  <MapInfoBridge onInfo={(i) => setMapInfo(i)} />
        <MapResizeHandler expanded={isExpanded} />
        {/* Expand button placed inside the map so it sits visually next to the card header (Clear All) */}
        <div className="absolute" style={{ top: 8, right: 12, zIndex: 650 }}>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="bg-white border rounded-md px-2 py-1 text-sm shadow"
            aria-label="ขยายแผนที่"
          >
            ขยาย
          </button>
        </div>
      </MapContainer>
  {/* Info panel under the normal map */}
  <div className="mt-3">
    <MapInfoPanel compact={true} info={mapInfo} />
  </div>
    </div>
  );
}

/** Small visible UI overlay for drawing/editing/removal to ensure controls are reachable
 * This is rendered inside the MapContainer so it isn't clipped by external layout
 */
function GeomanControlsUI({ enableSimpleRemoveButton }: { enableSimpleRemoveButton?: boolean }) {
  const map = useMap();
  const [mode, setMode] = useState<'none' | 'draw' | 'edit' | 'remove'>('none');

  useEffect(() => {
    if (!map) return;
    // ensure pm exists
    const pm = (map as any).pm;
    if (!pm) return;

    // cleanup when unmount or mode change
    return () => {
      try {
        pm.disableDraw && pm.disableDraw();
        pm.disableGlobalEditMode && pm.disableGlobalEditMode();
        pm.disableGlobalRemovalMode && pm.disableGlobalRemovalMode();
      } catch (_) {}
    };
  }, [map]);

  const startDraw = () => {
    try {
      (map as any).pm.enableDraw('Polygon', { snappable: true });
      setMode('draw');
    } catch (e) {}
  };
  const startEdit = () => {
    try { (map as any).pm.toggleGlobalEditMode(); setMode('edit'); } catch (e) {}
  };
  const startRemove = () => {
    try { (map as any).pm.toggleGlobalRemovalMode(); setMode('remove'); } catch (e) {}
  };
  const stopModes = () => {
    try {
      (map as any).pm.disableDraw && (map as any).pm.disableDraw();
      (map as any).pm.disableGlobalEditMode && (map as any).pm.disableGlobalEditMode();
      (map as any).pm.disableGlobalRemovalMode && (map as any).pm.disableGlobalRemovalMode();
      setMode('none');
    } catch (e) {}
  };
  const clearAll = () => {
    try {
      const toRemove: any[] = [];
      map.eachLayer((layer: any) => {
        if (!layer || !layer.toGeoJSON) return;
        if (layer instanceof L.TileLayer) return;
        toRemove.push(layer);
      });
      toRemove.forEach(l => { try { map.removeLayer(l); } catch (_) {} });
    } catch (e) {}
  };

  return (
    <div style={{ position: 'absolute', top:10, right: 10, zIndex: 99999 }}>
      <div className="bg-white rounded shadow p-1 flex gap-1" style={{ border: '1px solid #e5e7eb' }}>
        {/* <button className="px-2 py-1 text-xs" onClick={startDraw} aria-label="วาด">วาด</button>
        <button className="px-2 py-1 text-xs" onClick={startEdit} aria-label="แก้ไข">แก้ไข</button>
        <button className="px-2 py-1 text-xs" onClick={startRemove} aria-label="ลบ">ลบ</button>
        <button className="px-2 py-1 text-xs" onClick={stopModes} aria-label="หยุด">หยุด</button> */}
        {/* <button className="px-2 py-1 text-xs" onClick={clearAll} aria-label="ลบทั้งหมด">Clear</button> */}
      </div>
    </div>
  );
}
