-- Ensure province & geometry columns (jsonb + optional PostGIS) and constraints for projects
DO $$
BEGIN
  -- province text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='province'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN province text NULL;
  END IF;

  -- geometry_geojson jsonb column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='projects' AND column_name='geometry_geojson'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN geometry_geojson jsonb NULL;
  END IF;

  -- OPTIONAL: add real PostGIS geometry column if extension enabled
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='postgis') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='projects' AND column_name='geom'
    ) THEN
      ALTER TABLE public.projects ADD COLUMN geom geometry(MultiPolygon,4326);
    END IF;
    -- GIST index
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='projects_geom_gix'
    ) THEN
      CREATE INDEX projects_geom_gix ON public.projects USING GIST (geom);
    END IF;
  END IF;

  -- Unique (org_id, code) when code present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='projects_org_code_key'
  ) THEN
    BEGIN
      ALTER TABLE public.projects ADD CONSTRAINT projects_org_code_key UNIQUE (org_id, code);
    EXCEPTION WHEN undefined_column THEN
      -- skip if columns missing
    END;
  END IF;
END $$;

-- Backfill geom from geometry_geojson if newly added
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='postgis') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='geom'
    ) THEN
      UPDATE public.projects
      SET geom = ST_SetSRID(ST_GeomFromGeoJSON(geometry_geojson::text),4326)
      WHERE geom IS NULL AND geometry_geojson IS NOT NULL;
    END IF;
  END IF;
END $$;
