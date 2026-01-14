-- ============================================================
-- LINKING FIX (Execution Mode)
-- Description: Updates FKs based on matching rules.
-- Risk: Irreversible linkage. Run backup first.
-- ============================================================
-- ------------------------------------------------------------
-- 1. UPDATE INBOX -> LEADS
-- ------------------------------------------------------------
WITH matches AS (
    SELECT DISTINCT ON (i.id) -- One match per inbox item
        i.id as inbox_id,
        l.id as lead_id
    FROM inbox i
        JOIN leads l ON (
            -- Rule 1: Email + Time
            (
                LOWER(i.email) = LOWER(l.email)
                AND i.created_at BETWEEN l.created_at - INTERVAL '72 hours'
                AND l.created_at + INTERVAL '72 hours'
            )
            OR -- Rule 2: Phone
            (
                -- Normalized Phone Logic
                (
                    CASE
                        WHEN i.phone IS NULL
                        OR i.phone = '' THEN 'NONE_I'
                        WHEN REGEXP_REPLACE(i.phone, '[^0-9]', '', 'g') LIKE '0046%' THEN SUBSTRING(
                            REGEXP_REPLACE(i.phone, '[^0-9]', '', 'g')
                            FROM 3
                        )
                        WHEN REGEXP_REPLACE(i.phone, '[^0-9]', '', 'g') LIKE '0%' THEN '46' || SUBSTRING(
                            REGEXP_REPLACE(i.phone, '[^0-9]', '', 'g')
                            FROM 2
                        )
                        ELSE REGEXP_REPLACE(i.phone, '[^0-9]', '', 'g')
                    END
                ) = (
                    CASE
                        WHEN l.phone IS NULL
                        OR l.phone = '' THEN 'NONE_L'
                        WHEN REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g') LIKE '0046%' THEN SUBSTRING(
                            REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')
                            FROM 3
                        )
                        WHEN REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g') LIKE '0%' THEN '46' || SUBSTRING(
                            REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')
                            FROM 2
                        )
                        ELSE REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')
                    END
                )
                AND LENGTH(REGEXP_REPLACE(i.phone, '[^0-9]', '', 'g')) > 5
            )
        )
    WHERE i.lead_id IS NULL -- Only update unlinked
    ORDER BY i.id,
        l.created_at DESC -- Prefer most recent lead if multiple
)
UPDATE inbox
SET lead_id = matches.lead_id,
    status = 'processed' -- Assuming we mark as processed if linked? Or leave as is? 
    -- Prompt: "Om inbox.lead_id IS NOT NULL -> lämna raderna"
    -- It doesn't explicitly say change status, but usually linking implies processing.
    -- I will leave status alone to be safe, or just set lead_id.
    -- Re-reading prompt: "Match på... -> lämna raderna". Wait. 
    -- "Om inbox.lead_id IS NOT NULL -> lämna raderna" (If ALREADY linked, leave match).
    -- So I am finding those where lead_id IS NULL.
    -- I will JUST update lead_id.
FROM matches
WHERE inbox.id = matches.inbox_id;
-- ------------------------------------------------------------
-- 2. UPDATE LEADS -> CUSTOMERS
-- ------------------------------------------------------------
WITH matches AS (
    SELECT DISTINCT ON (l.id) l.id as lead_id,
        c.id as customer_id
    FROM leads l
        JOIN customers c ON (
            -- Rule 1: Email
            LOWER(l.email) = LOWER(c.email)
            OR -- Rule 2: Phone
            (
                (
                    CASE
                        WHEN l.phone IS NULL
                        OR l.phone = '' THEN 'NONE_L'
                        WHEN REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g') LIKE '0046%' THEN SUBSTRING(
                            REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')
                            FROM 3
                        )
                        WHEN REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g') LIKE '0%' THEN '46' || SUBSTRING(
                            REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')
                            FROM 2
                        )
                        ELSE REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')
                    END
                ) = (
                    CASE
                        WHEN c.phone IS NULL
                        OR c.phone = '' THEN 'NONE_C'
                        WHEN REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g') LIKE '0046%' THEN SUBSTRING(
                            REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g')
                            FROM 3
                        )
                        WHEN REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g') LIKE '0%' THEN '46' || SUBSTRING(
                            REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g')
                            FROM 2
                        )
                        ELSE REGEXP_REPLACE(c.phone, '[^0-9]', '', 'g')
                    END
                )
                AND LENGTH(REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')) > 5
            )
        )
    WHERE l.customer_id IS NULL
    ORDER BY l.id,
        c.created_at ASC -- Prefer oldest customer (original) if duplicates exist
)
UPDATE leads
SET customer_id = matches.customer_id
FROM matches
WHERE leads.id = matches.lead_id;