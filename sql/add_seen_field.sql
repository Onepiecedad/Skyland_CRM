-- Migration: Add 'seen' field to messages table for unread indicator
-- Run this in Supabase SQL Editor
-- Add seen column (default false for new messages, true for existing)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS seen BOOLEAN DEFAULT false;
-- Update all existing messages to be marked as seen
UPDATE messages
SET seen = true
WHERE seen IS NULL;
-- Create index for faster queries on unread messages
CREATE INDEX IF NOT EXISTS idx_messages_seen ON messages(seen)
WHERE seen = false;
-- Create a function to count unread messages
CREATE OR REPLACE FUNCTION count_unread_messages() RETURNS INTEGER AS $$
SELECT COUNT(*)::INTEGER
FROM messages
WHERE seen = false
    AND direction = 'inbound';
$$ LANGUAGE SQL STABLE;
-- Create a function to mark message as seen
CREATE OR REPLACE FUNCTION mark_message_seen(message_id UUID) RETURNS VOID AS $$
UPDATE messages
SET seen = true
WHERE id = message_id;
$$ LANGUAGE SQL;
-- Create a function to mark all messages as seen for a customer
CREATE OR REPLACE FUNCTION mark_customer_messages_seen(customer_uuid UUID) RETURNS VOID AS $$
UPDATE messages
SET seen = true
WHERE customer_id = customer_uuid
    AND seen = false;
$$ LANGUAGE SQL;
COMMENT ON COLUMN messages.seen IS 'Whether the message has been viewed by the user';