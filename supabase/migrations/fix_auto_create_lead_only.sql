-- =====================================================
-- FIX: Change auto-create behavior
-- Before: Creates BOTH customer AND lead for every email
-- After: Creates ONLY lead (customer created manually or via AI)
-- =====================================================
-- Step 1: Drop the old trigger
DROP TRIGGER IF EXISTS trigger_auto_create_customer ON messages;
-- Step 2: Create a new, simpler function that only creates leads
CREATE OR REPLACE FUNCTION auto_create_lead_from_message() RETURNS TRIGGER AS $$
DECLARE existing_lead_id UUID;
existing_customer_id UUID;
BEGIN -- Only process if it's an inbound email
IF NEW.direction = 'inbound'
AND NEW.channel = 'email' THEN -- First, check if there's already a customer with this email
SELECT id INTO existing_customer_id
FROM customers
WHERE email = NEW.from_email_normalized
LIMIT 1;
-- If customer exists, link the message to them
IF existing_customer_id IS NOT NULL THEN NEW.customer_id := existing_customer_id;
END IF;
-- Now handle lead creation (if no lead_id yet)
IF NEW.lead_id IS NULL THEN -- Check if a recent lead already exists with this email
SELECT id INTO existing_lead_id
FROM leads
WHERE email = NEW.from_email_normalized
    AND status IN ('new', 'contacted')
ORDER BY created_at DESC
LIMIT 1;
IF existing_lead_id IS NOT NULL THEN -- Link to existing lead
NEW.lead_id := existing_lead_id;
ELSE -- Create new lead (but NOT a customer - that's done manually now)
INSERT INTO leads (name, email, subject, message, source, status)
VALUES (
        COALESCE(NEW.from_name, NEW.from_email),
        NEW.from_email_normalized,
        NEW.subject,
        LEFT(NEW.body_preview, 500),
        'email',
        'new'
    )
RETURNING id INTO NEW.lead_id;
END IF;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Step 3: Create the new trigger
DROP TRIGGER IF EXISTS trigger_auto_create_lead ON messages;
CREATE TRIGGER trigger_auto_create_lead BEFORE
INSERT ON messages FOR EACH ROW EXECUTE FUNCTION auto_create_lead_from_message();
-- Step 4: Cleanup - drop the old function
DROP FUNCTION IF EXISTS auto_create_customer_from_message();
-- =====================================================
-- DONE! New behavior:
-- ✅ Creates lead for new email senders
-- ✅ Links messages to EXISTING customers
-- ❌ Does NOT auto-create new customers
-- =====================================================