-- Migration: Ändra auto-create trigger för meddelanden
-- Tidigare: Skapade kunder automatiskt från inkommande mail
-- Nu: Skapar bara leads - kunder skapas manuellt eller via AI-assistenten
-- 1. Ta bort den gamla trigger-funktionen (om den finns)
DROP FUNCTION IF EXISTS auto_create_customer_from_message() CASCADE;
-- 2. Skapa ny funktion som bara skapar leads
CREATE OR REPLACE FUNCTION auto_create_lead_from_message() RETURNS TRIGGER AS $$
DECLARE existing_customer_id UUID;
existing_lead_id UUID;
new_lead_id UUID;
BEGIN -- Endast för inkommande meddelanden
IF NEW.direction != 'inbound' THEN RETURN NEW;
END IF;
-- Skippa om meddelandet redan har en koppling
IF NEW.customer_id IS NOT NULL
OR NEW.lead_id IS NOT NULL THEN RETURN NEW;
END IF;
-- Kolla om avsändaren redan är en kund
SELECT id INTO existing_customer_id
FROM customers
WHERE email = NEW.from_email
LIMIT 1;
IF existing_customer_id IS NOT NULL THEN -- Koppla meddelandet till befintlig kund
NEW.customer_id := existing_customer_id;
RETURN NEW;
END IF;
-- Kolla om avsändaren redan är en lead
SELECT id INTO existing_lead_id
FROM leads
WHERE email = NEW.from_email
LIMIT 1;
IF existing_lead_id IS NOT NULL THEN -- Koppla meddelandet till befintlig lead
NEW.lead_id := existing_lead_id;
RETURN NEW;
END IF;
-- Skapa ny lead (INTE kund)
INSERT INTO leads (
        name,
        email,
        source,
        status,
        subject,
        created_at
    )
VALUES (
        COALESCE(
            NEW.from_name,
            split_part(NEW.from_email, '@', 1)
        ),
        NEW.from_email,
        'email',
        'new',
        NEW.subject,
        NOW()
    )
RETURNING id INTO new_lead_id;
-- Koppla meddelandet till den nya leaden
NEW.lead_id := new_lead_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 3. Ta bort gammal trigger om den finns
DROP TRIGGER IF EXISTS trigger_auto_create_customer ON messages;
DROP TRIGGER IF EXISTS trigger_auto_create_lead ON messages;
-- 4. Skapa ny trigger
CREATE TRIGGER trigger_auto_create_lead BEFORE
INSERT ON messages FOR EACH ROW EXECUTE FUNCTION auto_create_lead_from_message();
-- Bekräfta att migreringen är klar
SELECT 'Migration completed: Inbound emails now create leads only (not customers)' AS status;