-- ============================================================
-- CLEANUP TESTDATA (Execution Mode)
-- Description: Removes identified test data from all tables.
-- Risk: DESTRUCTIVE. Removes rows based on email patterns.
-- Patterns: *fyller.com, *meter.se, *bejkon.fi, *olofsson.se, *ljusberg.com
-- EXCLUDED (Safelist): shaffer.nu, love.se, msn.com, ikze.se, hasselblads.se, businesscontrolpartner.com
-- ============================================================
DO $$
DECLARE deleted_inbox INTEGER;
deleted_leads INTEGER;
deleted_customers INTEGER;
BEGIN RAISE NOTICE 'Starting Cleanup Process...';
-- 1. DELETE FROM INBOX
WITH deleted AS (
    DELETE FROM inbox
    WHERE email ~* '^[a-z]+@[a-z]+\.(com|fi|se|nu)$' -- Common Providers whitelist
        AND email NOT LIKE '%@gmail.com'
        AND email NOT LIKE '%@hotmail.com'
        AND email NOT LIKE '%@outlook.com'
        AND email NOT LIKE '%@yahoo.%'
        AND email NOT LIKE '%@icloud.com'
        AND email NOT LIKE '%@telia.%'
        AND email NOT LIKE '%marinmekaniker%' -- Specific User whitelist (Real customers)
        AND email NOT LIKE '%@shaffer.nu'
        AND email NOT LIKE '%@love.se'
        AND email NOT LIKE '%@msn.com' -- guldager@msn.com
        AND email NOT LIKE '%@ikze.se'
        AND email NOT LIKE '%@hasselblads.se'
        AND email NOT LIKE '%@businesscontrolpartner.com'
    RETURNING id
)
SELECT count(*) INTO deleted_inbox
FROM deleted;
RAISE NOTICE 'Deleted % rows from INBOX',
deleted_inbox;
-- 2. DELETE FROM LEADS
WITH deleted AS (
    DELETE FROM leads
    WHERE email ~* '^[a-z]+@[a-z]+\.(com|fi|se|nu)$' -- Common Providers whitelist
        AND email NOT LIKE '%@gmail.com'
        AND email NOT LIKE '%@hotmail.com'
        AND email NOT LIKE '%@outlook.com'
        AND email NOT LIKE '%@yahoo.%'
        AND email NOT LIKE '%@icloud.com'
        AND email NOT LIKE '%@telia.%'
        AND email NOT LIKE '%marinmekaniker%' -- Specific User whitelist
        AND email NOT LIKE '%@shaffer.nu'
        AND email NOT LIKE '%@love.se'
        AND email NOT LIKE '%@msn.com'
        AND email NOT LIKE '%@ikze.se'
        AND email NOT LIKE '%@hasselblads.se'
        AND email NOT LIKE '%@businesscontrolpartner.com'
    RETURNING id
)
SELECT count(*) INTO deleted_leads
FROM deleted;
RAISE NOTICE 'Deleted % rows from LEADS',
deleted_leads;
-- 3. DELETE FROM CUSTOMERS (Cascade will handle jobs/boats/messages linked to these)
WITH deleted AS (
    DELETE FROM customers
    WHERE email ~* '^[a-z]+@[a-z]+\.(com|fi|se|nu)$' -- Common Providers whitelist
        AND email NOT LIKE '%@gmail.com'
        AND email NOT LIKE '%@hotmail.com'
        AND email NOT LIKE '%@outlook.com'
        AND email NOT LIKE '%@yahoo.%'
        AND email NOT LIKE '%@icloud.com'
        AND email NOT LIKE '%@telia.%'
        AND email NOT LIKE '%marinmekaniker%' -- Specific User whitelist
        AND email NOT LIKE '%@shaffer.nu'
        AND email NOT LIKE '%@love.se'
        AND email NOT LIKE '%@msn.com'
        AND email NOT LIKE '%@ikze.se'
        AND email NOT LIKE '%@hasselblads.se'
        AND email NOT LIKE '%@businesscontrolpartner.com'
    RETURNING id
)
SELECT count(*) INTO deleted_customers
FROM deleted;
RAISE NOTICE 'Deleted % rows from CUSTOMERS',
deleted_customers;
END $$;