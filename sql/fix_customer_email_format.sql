-- ============================================================
-- FIX: Clean up customer email and name data
-- ============================================================
-- This script fixes customers where email contains the full 
-- "Name <email@domain.com>" format instead of just the email address
-- ============================================================
-- First, let's see what we're dealing with
SELECT id,
    name,
    email
FROM customers
WHERE email LIKE '%<%>%'
ORDER BY created_at DESC;
-- ============================================================
-- STEP 1: Extract proper email addresses
-- Pattern: "name <email@domain.com>" → "email@domain.com"
-- ============================================================
UPDATE customers
SET email = lower(
        trim(
            substring(
                email
                FROM '<([^>]+)>'
            )
        )
    )
WHERE email LIKE '%<%>%'
    AND email ~ '<[^>]+@[^>]+>';
-- ============================================================
-- STEP 2: Fix names that contain email in angle brackets
-- Pattern: "Daniel Naessvik <email@domain.com>" → "Daniel Naessvik"
-- Also capitalize first letter of each word
-- ============================================================
UPDATE customers
SET name = initcap(trim(regexp_replace(name, '<[^>]+>', '', 'g')))
WHERE name LIKE '%<%>%';
-- ============================================================
-- STEP 3: Fix names that are just email addresses
-- Pattern: "john.doe@gmail.com" → "John Doe"
-- ============================================================
UPDATE customers
SET name = initcap(
        replace(
            replace(
                split_part(email, '@', 1),
                '.',
                ' '
            ),
            '_',
            ' '
        )
    )
WHERE name IS NULL
    OR name = ''
    OR name = email
    OR name LIKE '%@%';
-- ============================================================
-- STEP 4: Update leads table as well
-- ============================================================
UPDATE leads
SET email = lower(
        trim(
            substring(
                email
                FROM '<([^>]+)>'
            )
        )
    )
WHERE email LIKE '%<%>%'
    AND email ~ '<[^>]+@[^>]+>';
UPDATE leads
SET name = initcap(trim(regexp_replace(name, '<[^>]+>', '', 'g')))
WHERE name LIKE '%<%>%';
-- ============================================================
-- STEP 5: Verify the fixes
-- ============================================================
SELECT id,
    name,
    email,
    phone
FROM customers
ORDER BY created_at DESC
LIMIT 15;