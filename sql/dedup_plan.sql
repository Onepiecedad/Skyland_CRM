-- ============================================================
-- DEDUP PLAN (Analysis Mode)
-- Description: Identifies duplicate customers and determines survivors.
-- ============================================================
WITH lead_counts AS (
    SELECT customer_id,
        COUNT(*) as lead_count
    FROM leads
    WHERE customer_id IS NOT NULL
    GROUP BY customer_id
),
ranked_customers AS (
    SELECT c.id,
        c.email,
        c.name,
        c.created_at,
        c.phone,
        COALESCE(lc.lead_count, 0) as connection_count,
        -- Determine Survivor
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(c.email)
            ORDER BY COALESCE(lc.lead_count, 0) DESC,
                -- Prority 1: Most connections
                c.created_at ASC,
                -- Priority 2: Oldest first
                c.id ASC -- Priority 3: Stability
        ) as rank_in_group,
        COUNT(*) OVER (PARTITION BY LOWER(c.email)) as group_size
    FROM customers c
        LEFT JOIN lead_counts lc ON c.id = lc.customer_id
    WHERE c.email IS NOT NULL
        AND TRIM(c.email) <> ''
)
SELECT email,
    id as customer_id,
    name,
    created_at,
    connection_count,
    rank_in_group,
    CASE
        WHEN rank_in_group = 1 THEN 'SURVIVOR'
        ELSE 'DUPLICATE'
    END as status
FROM ranked_customers
WHERE group_size > 1
ORDER BY email,
    rank_in_group;