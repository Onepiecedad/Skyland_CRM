-- ============================================================
-- LINKING PLAN (Analysis Mode)
-- Description: Identifies links between Inbox->Leads and Leads->Customers
-- Usage: Run these queries to see what WOULD represent a match.
-- ============================================================
-- ------------------------------------------------------------
-- 1. IDENTIFY INBOX -> LEAD MATCHES
-- Rule: Match on Email (+/- 72h) OR Normalized Phone
-- ------------------------------------------------------------
WITH normalized_inbox AS (
    SELECT id,
        created_at,
        email,
        phone,
        -- Phone Normalization
        CASE
            WHEN phone IS NULL
            OR phone = '' THEN NULL
            WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '0046%' THEN SUBSTRING(
                REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
                FROM 3
            )
            WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '0%' THEN '46' || SUBSTRING(
                REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
                FROM 2
            )
            ELSE REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
        END as norm_phone
    FROM inbox
    WHERE lead_id IS NULL -- Only check unlinked
),
normalized_leads AS (
    SELECT id,
        created_at,
        email,
        phone,
        CASE
            WHEN phone IS NULL
            OR phone = '' THEN NULL
            WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '0046%' THEN SUBSTRING(
                REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
                FROM 3
            )
            WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '0%' THEN '46' || SUBSTRING(
                REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
                FROM 2
            )
            ELSE REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
        END as norm_phone
    FROM leads
)
SELECT i.id as inbox_id,
    i.email as inbox_email,
    l.id as suggested_lead_id,
    l.email as lead_email,
    'EMAIL_MATCH' as match_type
FROM normalized_inbox i
    JOIN normalized_leads l ON LOWER(i.email) = LOWER(l.email)
WHERE i.created_at BETWEEN l.created_at - INTERVAL '72 hours'
    AND l.created_at + INTERVAL '72 hours'
UNION ALL
SELECT i.id as inbox_id,
    i.email as inbox_email,
    l.id as suggested_lead_id,
    l.email as lead_email,
    'PHONE_MATCH' as match_type
FROM normalized_inbox i
    JOIN normalized_leads l ON i.norm_phone = l.norm_phone
WHERE i.norm_phone IS NOT NULL
    AND LENGTH(i.norm_phone) > 5;
-- ------------------------------------------------------------
-- 2. IDENTIFY LEAD -> CUSTOMER MATCHES
-- Rule: Match on Email OR Normalized Phone
-- ------------------------------------------------------------
WITH normalized_leads AS (
    SELECT id,
        email,
        phone,
        CASE
            WHEN phone IS NULL
            OR phone = '' THEN NULL
            WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '0046%' THEN SUBSTRING(
                REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
                FROM 3
            )
            WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '0%' THEN '46' || SUBSTRING(
                REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
                FROM 2
            )
            ELSE REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
        END as norm_phone
    FROM leads
    WHERE customer_id IS NULL -- Only check unlinked
),
normalized_customers AS (
    SELECT id,
        email,
        phone,
        CASE
            WHEN phone IS NULL
            OR phone = '' THEN NULL
            WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '0046%' THEN SUBSTRING(
                REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
                FROM 3
            )
            WHEN REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '0%' THEN '46' || SUBSTRING(
                REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
                FROM 2
            )
            ELSE REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
        END as norm_phone
    FROM customers
)
SELECT l.id as lead_id,
    l.email as lead_email,
    c.id as suggested_customer_id,
    c.email as customer_email,
    'EMAIL_MATCH' as match_type
FROM normalized_leads l
    JOIN normalized_customers c ON LOWER(l.email) = LOWER(c.email)
UNION ALL
SELECT l.id as lead_id,
    l.email as lead_email,
    c.id as suggested_customer_id,
    c.email as customer_email,
    'PHONE_MATCH' as match_type
FROM normalized_leads l
    JOIN normalized_customers c ON l.norm_phone = c.norm_phone
WHERE l.norm_phone IS NOT NULL
    AND LENGTH(l.norm_phone) > 5;