-- ============================================================
-- Category tree (parent_id) + CourseCategory many-to-many join
-- Run in Neon SQL Editor if not using runtime ensure in lib/db.ts
-- ============================================================

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES "Category"(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "CourseCategory" (
  course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES "Category"(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, category_id)
);

CREATE INDEX IF NOT EXISTS "CourseCategory_category_id_idx" ON "CourseCategory"(category_id);

-- Backfill from legacy Course.category_id (if column still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Course' AND column_name = 'category_id'
  ) THEN
    INSERT INTO "CourseCategory" (course_id, category_id)
    SELECT id, category_id FROM "Course" WHERE category_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
