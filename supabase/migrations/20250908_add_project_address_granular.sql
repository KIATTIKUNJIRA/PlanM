-- Add finer address columns to projects if not existing
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS district varchar(128),
  ADD COLUMN IF NOT EXISTS subdistrict varchar(128),
  ADD COLUMN IF NOT EXISTS postal_code varchar(10);

CREATE INDEX IF NOT EXISTS projects_province_district_idx ON projects (province, district);
