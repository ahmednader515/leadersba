-- Preserve the visibility of existing streams.
ALTER TABLE "LiveStream"
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;
