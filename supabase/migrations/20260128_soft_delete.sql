-- Soft Delete Migration for Messages and Customers
-- Add deleted_at column and create trash functionality
-- Add deleted_at to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
-- Add deleted_at to customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
-- Update RLS policies to filter out deleted items by default
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "messages_select_not_deleted" ON messages;
DROP POLICY IF EXISTS "customers_select_not_deleted" ON customers;
-- Create new policies (note: you may need to adjust based on your existing RLS setup)
-- These ensure deleted items are still visible for trash management