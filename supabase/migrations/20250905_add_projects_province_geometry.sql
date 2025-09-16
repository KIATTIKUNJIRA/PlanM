-- Adds missing province column and geometry_geojson storage for projects
-- Safe operations: only add if not exists
DO $$
BEGIN
  -- province text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='province'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN province text NULL;
  END IF;

  -- geometry_geojson jsonb column (raw GeoJSON as stored from frontend)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='geometry_geojson'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN geometry_geojson jsonb NULL;
  END IF;

  -- Optional: if you previously had geometry column you can backfill or copy (commented)
  -- UPDATE public.projects SET geometry_geojson = ST_AsGeoJSON(geom)::jsonb WHERE geom IS NOT NULL AND geometry_geojson IS NULL;

  -- Unique constraint (org_id, code) if not exists and both columns present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='projects_org_code_key'
  ) THEN
    BEGIN
      ALTER TABLE public.projects ADD CONSTRAINT projects_org_code_key UNIQUE (org_id, code);
    EXCEPTION WHEN undefined_column THEN
      -- skip if columns missing
    END;
  END IF;
END $$;

-- (Optional future) Upgrade to PostGIS geometry:
-- ALTER TABLE public.projects ADD COLUMN geom geometry(MultiPolygon,4326);
-- UPDATE public.projects SET geom = ST_SetSRID(ST_GeomFromGeoJSON(geometry_geojson::text),4326) WHERE geometry_geojson IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS projects_geom_gix ON public.projects USING GIST (geom);
