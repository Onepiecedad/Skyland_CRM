-- ============================================
-- Migration: Jobbbilder (job_images)
-- Skapad: 2026-01-27
-- Syfte: Möjliggör fotografering och bilduppladdning för jobb
-- ============================================
-- 1. Skapa tabell för jobbbilder
CREATE TABLE IF NOT EXISTS job_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT DEFAULT 'documentation' CHECK (
        category IN (
            'before',
            'during',
            'after',
            'part',
            'documentation'
        )
    ),
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sort_order INT DEFAULT 0
);
-- 2. Index för snabba queries
CREATE INDEX IF NOT EXISTS idx_job_images_job_id ON job_images(job_id);
CREATE INDEX IF NOT EXISTS idx_job_images_created_at ON job_images(created_at DESC);
-- 3. Kommentar för dokumentation
COMMENT ON TABLE job_images IS 'Bilder kopplade till jobb för dokumentation (före/under/efter/reservdelar)';
COMMENT ON COLUMN job_images.category IS 'Bildkategori: before, during, after, part, documentation';
COMMENT ON COLUMN job_images.sort_order IS 'Sorteringsordning för manuell ordning';
-- 4. Row Level Security
ALTER TABLE job_images ENABLE ROW LEVEL SECURITY;
-- 5. RLS Policies
CREATE POLICY "Authenticated select on job_images" ON job_images FOR
SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated insert on job_images" ON job_images FOR
INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update on job_images" ON job_images FOR
UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete on job_images" ON job_images FOR DELETE USING (auth.role() = 'authenticated');
-- ============================================
-- STORAGE BUCKET (körs separat i Supabase Dashboard)
-- ============================================
-- 1. Gå till Storage > New bucket
-- 2. Name: job-images
-- 3. Public: true
-- 4. Lägg till policies:
--    - INSERT: auth.role() = 'authenticated' 
--    - SELECT: true (public)
--    - DELETE: auth.role() = 'authenticated'
-- ============================================