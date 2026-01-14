-- ============================================================
-- DEDUP FIX (Execution Mode)
-- Description: Merges duplicates and deletes non-survivors.
-- Risk: DESTRUCTIVE. Run 'dedup_plan.sql' first. BACKUP REQUIRED.
-- ============================================================
DO $$
DECLARE r RECORD;
merged_count INTEGER := 0;
BEGIN RAISE NOTICE 'Starting Deduplication Process...';
FOR r IN -- Identify Duplicates and Survivors (Same logic as Plan)
WITH lead_counts AS (
    SELECT customer_id,
        COUNT(*) as lead_count
    FROM leads
    GROUP BY customer_id
),
ranked AS (
    SELECT c.id,
        c.email,
        -- Rank: 1 is Survivor
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(c.email)
            ORDER BY COALESCE(lc.lead_count, 0) DESC,
                c.created_at ASC,
                c.id ASC
        ) as rn,
        -- Get the ID of the Rank 1 (Survivor) for this group
        FIRST_VALUE(c.id) OVER (
            PARTITION BY LOWER(c.email)
            ORDER BY COALESCE(lc.lead_count, 0) DESC,
                c.created_at ASC,
                c.id ASC
        ) as survivor_id
    FROM customers c
        LEFT JOIN lead_counts lc ON c.id = lc.customer_id
    WHERE c.email IS NOT NULL
        AND TRIM(c.email) <> ''
) -- Select only the losers (rn > 1) to merge INTO the survivor
SELECT id as old_id,
    survivor_id,
    email
FROM ranked
WHERE rn > 1 LOOP -- 1. Log the merge action for audit trail
INSERT INTO activity_log (
        action,
        description,
        customer_id,
        actor,
        metadata
    )
VALUES (
        'merge_customer',
        'Merged duplicate customer ' || r.email || ' (ID: ' || r.old_id || ') into Survivor (ID: ' || r.survivor_id || ')',
        r.survivor_id,
        'system_dedup_script',
        jsonb_build_object('merged_from_id', r.old_id, 'email', r.email)
    );
-- 2. Move Foreign Keys to Survivor
-- Leads
UPDATE leads
SET customer_id = r.survivor_id
WHERE customer_id = r.old_id;
-- Boats
UPDATE boats
SET customer_id = r.survivor_id
WHERE customer_id = r.old_id;
-- Jobs
UPDATE jobs
SET customer_id = r.survivor_id
WHERE customer_id = r.old_id;
-- Messages
UPDATE messages
SET customer_id = r.survivor_id
WHERE customer_id = r.old_id;
-- Activity Log (History move)
-- Note: We don't move the 'merge_customer' log we just created because it's already on survivor
UPDATE activity_log
SET customer_id = r.survivor_id
WHERE customer_id = r.old_id
    AND action != 'merge_customer';
-- 3. Delete the non-survivor
DELETE FROM customers
WHERE id = r.old_id;
merged_count := merged_count + 1;
RAISE NOTICE 'Merged customer % (Old ID: %) into Survivor %',
r.email,
r.old_id,
r.survivor_id;
END LOOP;
RAISE NOTICE 'Deduplication Complete. Total merged: %',
merged_count;
END $$;