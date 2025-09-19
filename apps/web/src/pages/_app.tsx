import "leaflet/dist/leaflet.css";
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import 'mapbox-gl/dist/mapbox-gl.css';
import React from 'react'
import { Toaster } from 'react-hot-toast';
import { CommandPaletteProvider } from '@/components/CommandPalette';
import { HealthProvider, useHealth } from '@/hooks/useHealthMonitor';
import { HealthDrawer } from '@/components/HealthDrawer';
import { ConfirmProvider } from '@/components/ConfirmProvider';

function FloatingHealthBadge() {
  const { latest, setOpen } = useHealth();
  const color = !latest ? 'bg-gray-300' : latest.ok ? (latest.dbOk === false ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-red-500';
  const title = !latest ? 'Health: pending' : latest.ok ? (latest.dbOk === false ? 'App OK, DB degraded' : 'Healthy') : 'Unhealthy';
  return (
    <button onClick={()=>setOpen(true)} style={{ position: 'fixed', top: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.55)', color: 'white', padding: '4px 8px', borderRadius: 16, zIndex: 50 }} title={title}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />
      <span>{title}</span>
      {latest?.apiLatency != null && <span style={{ opacity: 0.7 }}>api {Math.round(latest.apiLatency)}ms</span>}
      {latest?.dbLatency != null && <span style={{ opacity: 0.7 }}>db {Math.round(latest.dbLatency)}ms</span>}
    </button>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <HealthProvider>
      <CommandPaletteProvider>
        <ConfirmProvider>
          <Toaster position="top-right" />
          <Component {...pageProps} />
          <FloatingHealthBadge />
          <HealthDrawer />
        </ConfirmProvider>
      </CommandPaletteProvider>
    </HealthProvider>
  );
}