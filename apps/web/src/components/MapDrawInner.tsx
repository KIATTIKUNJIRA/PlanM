import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

export type MapDrawInnerHandle = { clear: () => void };

export default forwardRef(function MapDrawInner(
  { initialGeometry, onChange, center = [13.736717, 100.523186], zoom = 6 }: { initialGeometry?: any; onChange?: (g: any) => void; center?: [number, number]; zoom?: number },
  ref: React.Ref<MapDrawInnerHandle | null>
) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const r = rootRef.current as any;
      if (!r) return;
      const drawn = r.__leaflet_drawn as any;
      if (drawn && drawn.clearLayers) drawn.clearLayers();
      if (onChange) onChange(null);
    }
  }), [onChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = rootRef.current;
    if (!root) return;

    function addCss(id: string, href: string) {
      if (!document.getElementById(id)) {
        const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
      }
    }
    function loadScript(src: string, id: string) {
      return new Promise<void>((resolve, reject) => {
        if ((window as any)[id]) return resolve();
        if (document.getElementById(id)) return resolve();
        const s = document.createElement('script'); s.id = id; s.src = src; s.async = true;
        s.onload = () => { (window as any)[id] = true; resolve(); };
        s.onerror = () => reject(new Error('failed to load ' + src));
        document.body.appendChild(s);
      });
    }

    addCss('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    addCss('geoman-css', 'https://unpkg.com/@geoman-io/leaflet-geoman-free@latest/dist/leaflet-geoman.css');

    (async () => {
      try {
        await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet-js');
        await loadScript('https://unpkg.com/@geoman-io/leaflet-geoman-free@latest/dist/leaflet-geoman.min.js', 'geoman-js');

        const L = (window as any).L;
        const r = root as any;
        const existing = r.__leaflet_map as any;
        const map = existing || L.map(root).setView(center, zoom);

        if (!existing) L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const drawn = r.__leaflet_drawn || L.featureGroup().addTo(map);
        r.__leaflet_drawn = drawn;

        try { map.pm.addControls({ position: 'topleft', drawMarker: true, drawPolygon: true, drawRectangle: true, drawCircle: true, editMode: true, removalMode: true }); } catch (err) {}

        if (!r.__leaflet_events_attached) {
          map.on('pm:create', (e: any) => { try { drawn.addLayer(e.layer); if (onChange) onChange(e.layer.toGeoJSON()); } catch (err) {} });
          map.on('pm:edit', (e: any) => { try { let last: any = null; e.layers.eachLayer((l: any) => last = l); if (last && onChange) onChange(last.toGeoJSON()); } catch (err) {} });
          map.on('pm:remove', (e: any) => { try { if (e && e.layer) drawn.removeLayer(e.layer); const rem = drawn.getLayers(); if (!rem || rem.length === 0) { if (onChange) onChange(null); } else { if (onChange) onChange(rem[rem.length-1].toGeoJSON()); } } catch (err) {} });
          r.__leaflet_events_attached = true;
        }

        r.__leaflet_map = map;

        if (initialGeometry) {
          try {
            const g = L.geoJSON(initialGeometry);
            g.eachLayer((ly: any) => drawn.addLayer(ly));
            if (onChange) onChange(initialGeometry);
            const b = drawn.getBounds && drawn.getBounds();
            if (b && b.isValid && b.isValid()) map.fitBounds(b);
          } catch (err) {}
        }

      } catch (err) { console.error('MapDrawInner init failed', err); }
    })();

    return () => {
      // keep map instance on element for reuse
    };
  }, [initialGeometry, onChange, center.join(','), zoom]);

  return <div ref={rootRef} className="w-full h-[570px] rounded-lg overflow-hidden border" />;
});
