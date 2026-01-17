-- ============================================================
-- MIGRATION: Add Email Import Fields to Messages Table
-- ============================================================
-- Date: 2026-01-16
-- Purpose: Fix schema mismatch between n8n workflow and messages table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Problem: The Historical_Email_Import workflow sends these fields:
--   customer_id, from_email, from_name, to_email, subject, body_preview,
--   body_full, received_at, rfc_message_id, direction, channel, is_spam, processed
--
-- But messages table only has:
--   from_address, to_address, content, sent_at, external_id
-- ============================================================

-- Add from_name for sender display name
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_name TEXT;

-- Add from_email (workflow uses this instead of from_address)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS from_email TEXT;

-- Add to_email (workflow uses this instead of to_address)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS to_email TEXT;

-- Add body_preview for first 500 chars of email
ALTER TABLE messages ADD COLUMN IF NOT EXISTS body_preview TEXT;

-- Add body_full for complete email content
ALTER TABLE messages ADD COLUMN IF NOT EXISTS body_full TEXT;

-- Add received_at for email timestamp
ALTER TABLE messages ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- Add rfc_message_id for RFC822 Message-ID (for deduplication)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS rfc_message_id TEXT;

-- Add is_spam flag
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_spam BOOLEAN DEFAULT FALSE;

-- Add processed flag for workflow state
ALTER TABLE messages ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- ============================================================
-- Migrate existing data to new columns (backwards compatibility)
-- ============================================================

UPDATE messages SET from_email = from_address WHERE from_email IS NULL AND from_address IS NOT NULL;
UPDATE messages SET to_email = to_address WHERE to_email IS NULL AND to_address IS NOT NULL;
UPDATE messages SET body_full = content WHERE body_full IS NULL AND content IS NOT NULL;
UPDATE messages SET received_at = sent_at WHERE received_at IS NULL AND sent_at IS NOT NULL;
UPDATE messages SET rfc_message_id = external_id WHERE rfc_message_id IS NULL AND external_id IS NOT NULL;

-- ============================================================
-- Add unique index for deduplication
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_rfc_message_id 
ON messages(rfc_message_id) 
WHERE rfc_message_id IS NOT NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_received_at 
ON messages(received_at DESC);

-- ============================================================
-- Add column comments
-- ============================================================

COMMENT ON COLUMN messages.from_email IS 'Sender email address';
COMMENT ON COLUMN messages.to_email IS 'Recipient email address';
COMMENT ON COLUMN messages.from_name IS 'Sender display name';
COMMENT ON COLUMN messages.body_preview IS 'First 500 chars of email body';
COMMENT ON COLUMN messages.body_full IS 'Complete email body';
COMMENT ON COLUMN messages.received_at IS 'When email was received';
COMMENT ON COLUMN messages.rfc_message_id IS 'RFC822 Message-ID for deduplication';
COMMENT ON COLUMN messages.is_spam IS 'Whether message is marked as spam';
COMMENT ON COLUMN messages.processed IS 'Whether message has been processed by workflow';

-- ============================================================
-- Verify the migration
-- ============================================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;
