-- ============================================================
-- Migration: Add DELETE policy for messages table
-- Date: 2026-01-19
-- Purpose: Allow authenticated users to delete messages
-- ============================================================
-- Add DELETE policy for messages
CREATE POLICY "Authenticated delete" ON messages FOR DELETE USING (auth.role() = 'authenticated');
-- Verify the policy was created
SELECT policyname,
    cmd
FROM pg_policies
WHERE tablename = 'messages';