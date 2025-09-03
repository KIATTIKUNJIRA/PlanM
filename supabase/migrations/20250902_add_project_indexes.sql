-- Add performance indexes for project dashboard queries
-- Safely create if not exists using DO blocks because CREATE INDEX CONCURRENTLY IF NOT EXISTS
-- is supported only in recent PG; fallback logic ensures idempotency.

-- Index for ordering recent projects by updated_at/created_at within org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_projects_org_updated'
  ) THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY idx_projects_org_updated ON public.projects (org_id, COALESCE(updated_at, created_at) DESC)';
  END IF;
END$$;

-- Index for aggregating counts by type within org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_projects_org_type'
  ) THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY idx_projects_org_type ON public.projects (org_id, type)';
  END IF;
END$$;
