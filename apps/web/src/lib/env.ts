// Small helpers for reading public env numbers with safe fallbacks.
export function getEnvNumber(name: string, fallback: number): number {
  const raw = (process.env as Record<string,string | undefined>)[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function isHealthUIEnabled(): boolean {
  return (process.env.NEXT_PUBLIC_HEALTH_UI || '').toLowerCase() === 'on';
}
