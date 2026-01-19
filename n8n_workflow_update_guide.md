# n8n Email Workflow Update Guide

## ✅ FIX 1: Quoted-Printable Encoding (FÄRDIGT!)

**Status:** ✅ Detta är redan fixat i `Email_IMAP_Ingest.json`

Workflowet har uppdaterats med `decodeQuotedPrintable()` funktion som körs FÖRE `fixMojibake()` i "Process Email Data" noden.

### Vad som ändrats:
- Lagt till `decodeQuotedPrintable()` funktion som dekoderar =XX hex codes (t.ex. =C3=B6 → ö)
- Uppdaterad ordning: `fixMojibake(decodeQuotedPrintable(text))`
- Applicerat på: subject, body, from_name

### Importera uppdaterat workflow:
1. Gå till n8n dashboard
2. Öppna "Email_IMAP_Ingest" workflow
3. Klicka på "..." menu → "Import from file"
4. Välj `Email_IMAP_Ingest.json` från detta repo
5. Klicka "Save" och "Activate"

---

## 🔧 FIX 2: Auto-Create Customers & Leads (MANUELL)

**Status:** ⏳ Måste göras manuellt i n8n UI

### Problem:
Emails från nya personer sparas med `customer_id: null` eftersom ingen kund skapas automatiskt.

### Lösning:
Lägg till följande noder efter "Match Customer":

---

### Steg 1: Lägg till "Customer Exists?" IF-nod

1. **Lägg till ny nod** efter "Match Customer"
   - Type: **IF**
   - Name: **Customer Exists?**

2. **Konfigurera condition:**
   ```
   Condition Type: Boolean
   Value 1: {{ $json.id }}
   Operation: is not empty
   ```

3. **Koppla:**
   - Input: Match Customer
   - TRUE output → Prepare Insert (befintlig koppling)
   - FALSE output → (ny nod nedan)

---

### Steg 2: Lägg till "Create Customer" Supabase-nod

1. **Lägg till ny nod** från FALSE-branch av "Customer Exists?"
   - Type: **Supabase**
   - Name: **Create Customer**

2. **Konfigurera:**
   ```
   Operation: Insert
   Table: customers
   ```

3. **Data to send:** Manual mapping
   ```json
   {
     "email": "{{ $('Process Email Data').item.json.from_email_normalized }}",
     "name": "{{ $('Process Email Data').item.json.from_name || $('Process Email Data').item.json.from_email }}",
     "source": "email",
     "status": "active"
   }
   ```

---

### Steg 3: Lägg till "Create Lead" Supabase-nod

1. **Lägg till ny nod** efter "Create Customer"
   - Type: **Supabase**
   - Name: **Create Lead**

2. **Konfigurera:**
   ```
   Operation: Insert
   Table: leads
   ```

3. **Data to send:** Manual mapping
   ```json
   {
     "customer_id": "{{ $('Create Customer').item.json.id }}",
     "name": "{{ $('Create Customer').item.json.name }}",
     "email": "{{ $('Create Customer').item.json.email }}",
     "subject": "{{ $('Process Email Data').item.json.subject }}",
     "message": "{{ $('Process Email Data').item.json.body_preview }}",
     "source": "email",
     "status": "new"
   }
   ```

---

### Steg 4: Lägg till "Set Customer ID" Code-nod

1. **Lägg till ny nod** efter "Create Lead"
   - Type: **Code**
   - Name: **Set Customer ID**

2. **JavaScript kod:**
   ```javascript
   // Get newly created customer ID
   const newCustomerId = $('Create Customer').item.json.id;
   const newLeadId = $('Create Lead').item.json.id;
   const emailData = $('Process Email Data').item.json;

   return [{
     json: {
       customer_id: newCustomerId,
       lead_id: newLeadId,
       ...emailData
     }
   }];
   ```

---

### Steg 5: Uppdatera kopplingar

1. **Merge branches till "Prepare Insert":**
   - TRUE branch (customer exists) → Prepare Insert
   - FALSE branch (Set Customer ID) → Prepare Insert

2. **Uppdatera "Prepare Insert" nod** för att hantera båda scenarion:
   ```javascript
   const emailData = $('Process Email Data').item.json;

   // Try to get customer_id from different sources
   let customerId = null;
   let leadId = null;

   // Check if coming from "Match Customer" (existing customer)
   const matchResult = $('Match Customer').item.json;
   if (matchResult?.id) {
     customerId = matchResult.id;
   }

   // Check if coming from "Set Customer ID" (new customer)
   const currentItem = $input.item.json;
   if (currentItem?.customer_id) {
     customerId = currentItem.customer_id;
     leadId = currentItem.lead_id;
   }

   return [{
     json: {
       imap_uid: emailData.imap_uid,
       imap_mailbox: emailData.imap_mailbox,
       rfc_message_id: emailData.rfc_message_id,
       content_hash: emailData.content_hash,
       customer_id: customerId,
       lead_id: leadId,
       direction: emailData.direction,
       channel: emailData.channel,
       from_email: emailData.from_email,
       from_email_normalized: emailData.from_email_normalized,
       from_name: emailData.from_name,
       to_email: emailData.to_email,
       subject: emailData.subject,
       body_preview: emailData.body_preview,
       body_full: emailData.body_full,
       has_attachments: emailData.has_attachments,
       attachment_count: emailData.attachment_count,
       raw_headers: emailData.raw_headers,
       is_spam: emailData.is_spam,
       spam_reason: emailData.spam_reason,
       received_at: emailData.received_at,
       date_header_missing: emailData.date_header_missing,
       processed: true,
       imap_seen_marked: false
     }
   }];
   ```

---

## 🧪 Testning

### Test 1: Ny kund från email
1. Skicka ett test-email från en ny email-adress till systemet
2. Kontrollera att svensk text (å, ä, ö) visas korrekt
3. Kontrollera i Supabase `customers` tabell att en ny kund skapades
4. Kontrollera i Supabase `leads` tabell att en ny lead skapades
5. Kontrollera att `messages.customer_id` är satt

### Test 2: Befintlig kund
1. Skicka ett email från en befintlig kund-adress
2. Kontrollera att ingen ny kund skapas (antal kunder oförändrat)
3. Kontrollera att meddelandet kopplas till rätt customer_id

### Test 3: Encoding
1. Skicka email med svenska tecken i subject och body
2. Kontrollera i både n8n execution log OCH i Supabase att:
   - Subject är korrekt (ingen =C3=B6 eller ö▓▓▓)
   - Body är korrekt
   - from_name är korrekt

---

## 📊 Workflow-översikt (efter uppdatering)

```
Every 5 Minutes
      ↓
Read Unseen Emails
      ↓
Process Email Data (✅ med quoted-printable decoding)
      ↓
Check Duplicate
      ↓
Is New? ─┬─ TRUE → Match Customer
         │                ↓
         │         Customer Exists?
         │         ├─ TRUE → (merge till Prepare Insert)
         │         └─ FALSE → Create Customer
         │                        ↓
         │                   Create Lead
         │                        ↓
         │                   Set Customer ID
         │                        ↓
         │                   (merge till Prepare Insert)
         └─ FALSE → Skip Duplicate
```

---

## 🚀 Deploy

1. Importera uppdaterat `Email_IMAP_Ingest.json`
2. Lägg till de 4 nya noderna manuellt enligt ovan
3. Testa med test-email
4. Aktivera workflow

---

## 💡 Alternativ: Supabase Database Trigger

Om du föredrar kan du också skapa en Supabase Database Trigger istället:

```sql
CREATE OR REPLACE FUNCTION auto_create_customer_from_message()
RETURNS TRIGGER AS $$
DECLARE
  new_customer_id UUID;
  new_lead_id UUID;
BEGIN
  -- Only process if customer_id is null and it's an inbound email
  IF NEW.customer_id IS NULL AND NEW.direction = 'inbound' AND NEW.channel = 'email' THEN

    -- Create customer
    INSERT INTO customers (email, name, source, status)
    VALUES (
      NEW.from_email_normalized,
      COALESCE(NEW.from_name, NEW.from_email),
      'email',
      'active'
    )
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO new_customer_id;

    -- Update message with customer_id
    NEW.customer_id := new_customer_id;

    -- Create lead
    INSERT INTO leads (customer_id, name, email, subject, message, source, status)
    VALUES (
      new_customer_id,
      COALESCE(NEW.from_name, NEW.from_email),
      NEW.from_email,
      NEW.subject,
      NEW.body_preview,
      'email',
      'new'
    )
    RETURNING id INTO new_lead_id;

    -- Update message with lead_id
    NEW.lead_id := new_lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_customer
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION auto_create_customer_from_message();
```

Detta är enklare att underhålla men kräver att `customers.email` har en UNIQUE constraint.
