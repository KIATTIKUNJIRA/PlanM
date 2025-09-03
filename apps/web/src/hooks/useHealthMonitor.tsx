import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getEnvNumber, isHealthUIEnabled } from '@/lib/env';

export interface HealthSample {
  t: number; // epoch ms
  ok: boolean;
  dbOk: boolean | null;
  apiLatency?: number | null;
  dbLatency?: number | null;
  serverVersion?: string | null;
}

interface HealthContextValue {
  latest: HealthSample | null;
  history: HealthSample[];
  open: boolean;
  setOpen(v: boolean): void;
  manualPing(): void;
  fetching: boolean;
  uiEnabled: boolean;
}

const HealthContext = createContext<HealthContextValue | undefined>(undefined);

// Adaptive intervals (ms) pulled from env (public) with fallbacks
const INTERVAL_HEALTHY = getEnvNumber('NEXT_PUBLIC_HEALTH_INTERVAL_OK', 60_000);
const INTERVAL_DEGRADED = getEnvNumber('NEXT_PUBLIC_HEALTH_INTERVAL_DEGRADED', 15_000);
const INTERVAL_ERROR_BASE = getEnvNumber('NEXT_PUBLIC_HEALTH_INTERVAL_ERROR', 5_000); // backoff base
const ERROR_BACKOFF_MAX = getEnvNumber('NEXT_PUBLIC_HEALTH_BACKOFF_MAX_MS', 60_000);
const BACKOFF_JITTER = getEnvNumber('NEXT_PUBLIC_HEALTH_BACKOFF_JITTER', 0); // 0..1
const UI_ENABLED = isHealthUIEnabled();

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [latest, setLatest] = useState<HealthSample | null>(null);
  const [history, setHistory] = useState<HealthSample[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const failCountRef = useRef(0);
  const timerRef = useRef<any>(null);
  const hiddenRef = useRef<boolean>(false);

  const pushSample = useCallback((s: HealthSample) => {
    setLatest(s);
    setHistory(h => [s, ...h].slice(0, 10));
  }, []);

  const schedule = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => run(), delay);
  }, []);

  const computeNextDelay = useCallback((sample: HealthSample | null): number => {
    if (!sample) return 5_000;
    if (!sample.ok) {
      let exp = Math.min(ERROR_BACKOFF_MAX, INTERVAL_ERROR_BASE * Math.pow(2, failCountRef.current));
      if (BACKOFF_JITTER > 0) {
        const delta = exp * BACKOFF_JITTER;
        const jitter = Math.random() * delta;
        exp = exp - delta / 2 + jitter; // +/- half delta
      }
      return exp;
    }
    if (sample.ok && sample.dbOk === false) return INTERVAL_DEGRADED;
    return INTERVAL_HEALTHY;
  }, []);

  const run = useCallback(async () => {
    if (hiddenRef.current || navigator.onLine === false) {
      // Re-check later modestly when hidden/offline
      schedule(30_000);
      return;
    }
    try {
      setFetching(true);
      const started = performance.now();
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const sample: HealthSample = {
        t: Date.now(),
        ok: true,
        dbOk: json.dbOk ?? null,
        apiLatency: json.latency_ms ?? Math.round(performance.now() - started),
        dbLatency: json.dbLatencyMs ?? null,
        serverVersion: json.serverVersion ?? null,
      };
      failCountRef.current = 0;
      pushSample(sample);
      schedule(computeNextDelay(sample));
    } catch (e: any) {
      failCountRef.current += 1;
      const sample: HealthSample = {
        t: Date.now(),
        ok: false,
        dbOk: false,
        apiLatency: null,
        dbLatency: null,
        serverVersion: null,
      };
      pushSample(sample);
      if (failCountRef.current === 1) toast.error('Health check failed');
      schedule(computeNextDelay(sample));
    }
    finally {
      setFetching(false);
    }
  }, [computeNextDelay, pushSample, schedule]);

  const manualPing = useCallback(() => {
    failCountRef.current = 0; // reset backoff
    run();
  }, [run]);

  // Visibility change / focus / online triggers immediate refresh
  useEffect(() => {
    const onVis = () => {
      hiddenRef.current = document.visibilityState === 'hidden';
      if (!hiddenRef.current) manualPing();
    };
    const onFocus = () => manualPing();
    const onOnline = () => manualPing();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [manualPing]);

  useEffect(() => {
    run();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [run]);

  return (
  <HealthContext.Provider value={{ latest, history, open, setOpen, manualPing, fetching, uiEnabled: UI_ENABLED }}>
      {children}
    </HealthContext.Provider>
  );
};

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used within HealthProvider');
  return ctx;
}
