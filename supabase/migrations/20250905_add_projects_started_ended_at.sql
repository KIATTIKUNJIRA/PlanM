-- Adds started_at and ended_at date columns (nullable) if they do not already exist.
-- This supports the UI which captures project start/end dates.
-- Safe to run multiple times due to IF NOT EXISTS guards.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS started_at date,
  ADD COLUMN IF NOT EXISTS ended_at date;

-- (Optional) You can later add indexes if filtering frequently by these dates:
-- CREATE INDEX IF NOT EXISTS projects_started_at_idx ON projects(started_at);
-- CREATE INDEX IF NOT EXISTS projects_ended_at_idx ON projects(ended_at);
