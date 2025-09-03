# PlanM - Asset & Facility Management Platform

This is the main repository for the PlanM platform, structured as a monorepo using pnpm workspaces.

## Workspaces

- `/apps/web`: The main web dashboard for managers.
- `/apps/mobile`: The mobile application for technicians and on-site staff.
- `/packages/ts-types`: Shared TypeScript types across all applications.
- `/packages/ui`: Shared UI components.
- `/supabase/functions`: Serverless edge functions.

## Getting Started

1. Install pnpm: `npm install -g pnpm`
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` inside the repo root (and any app-specific examples) then fill in credentials.
4. Start the web app: `pnpm -C apps/web dev`

### Development (Web)

Run unit tests:

```bash
pnpm -C apps/web test
```

Run E2E (Playwright):

```bash
pnpm -C apps/web e2e
```

### Health UI

Set `NEXT_PUBLIC_HEALTH_UI=on` (default in example) to enable the floating health badge + drawer.

Color meanings:
- Green: Healthy (API + DB OK)
- Amber: Degraded (API OK but DB latency/failures)
- Red: Down (latest health request failed)

Adaptive polling is configurable via env variables (OK / Degraded / Error base interval, max backoff, jitter ratio).