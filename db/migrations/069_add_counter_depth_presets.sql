-- Custom counter depths saved company-wide from the drawing workspace depth
-- control (drawing-canvas v2 slice 2). Standard presets 25.5 / 22.5 are app
-- constants and are NOT stored here.
ALTER TABLE shops
  ADD COLUMN counter_depth_presets double precision[] NOT NULL DEFAULT '{}';
