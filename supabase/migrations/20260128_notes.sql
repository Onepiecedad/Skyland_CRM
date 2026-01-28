-- Notes feature: General notes with media attachments and entity linking
-- Created: 2026-01-28
-- Main notes table
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        -- Content
        content TEXT NOT NULL,
        -- Entity links (all optional, can have multiple)
        customer_id UUID REFERENCES customers(id) ON DELETE
    SET NULL,
        job_id UUID REFERENCES jobs(id) ON DELETE
    SET NULL,
        boat_id UUID REFERENCES boats(id) ON DELETE
    SET NULL,
        lead_id UUID REFERENCES leads(id) ON DELETE
    SET NULL,
        -- Metadata
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        tags TEXT [] DEFAULT '{}',
        reminder_date DATE,
        is_pinned BOOLEAN DEFAULT false,
        is_archived BOOLEAN DEFAULT false,
        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
-- Note images table
CREATE TABLE IF NOT EXISTS note_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_customer ON notes(customer_id)
WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_job ON notes(job_id)
WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_boat ON notes(boat_id)
WHERE boat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_lead ON notes(lead_id)
WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_reminder ON notes(reminder_date)
WHERE reminder_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned)
WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_note_images_note ON note_images(note_id);
-- Full-text search index for Swedish
CREATE INDEX IF NOT EXISTS idx_notes_fulltext ON notes USING gin(to_tsvector('swedish', content));
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_notes_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at BEFORE
UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_notes_updated_at();
-- RLS Policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_images ENABLE ROW LEVEL SECURITY;
-- Notes policies (authenticated users can CRUD their own notes)
CREATE POLICY "Users can view all notes" ON notes FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Users can create notes" ON notes FOR
INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update all notes" ON notes FOR
UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete all notes" ON notes FOR DELETE TO authenticated USING (true);
-- Note images policies
CREATE POLICY "Users can view all note images" ON note_images FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Users can create note images" ON note_images FOR
INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete note images" ON note_images FOR DELETE TO authenticated USING (true);
-- Storage bucket for note images (reuse similar pattern to job-images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true) ON CONFLICT (id) DO NOTHING;
-- Storage policies for note-images bucket
CREATE POLICY "Authenticated users can upload note images" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'note-images');
CREATE POLICY "Anyone can view note images" ON storage.objects FOR
SELECT TO authenticated USING (bucket_id = 'note-images');
CREATE POLICY "Authenticated users can delete note images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'note-images');
COMMENT ON TABLE notes IS 'General purpose notes with optional links to customers, jobs, boats, and leads';
COMMENT ON TABLE note_images IS 'Images attached to notes';