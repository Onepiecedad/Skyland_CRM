# Historical Email Import — n8n Workflow Specification

## Syfte

Importera 6 månaders mejlhistorik från Thomas inbox (<info@marinmekaniker.nu>) till Supabase CRM. Både inkommande och skickade mejl ska importeras och kopplas till rätt kund.

## Översikt

```
Manual Trigger
    ↓
    ├→ Fetch INBOX (IMAP)
    │       ↓
    └→ Fetch Sent (IMAP)
            ↓
        Merge (append)
            ↓
        Process Emails (Code)
            ↓
        Loop Each (SplitInBatches)
            ↓
        Find Customer (Supabase SELECT)
            ↓
        Customer Exists? (IF)
            ├→ YES → Prepare Message
            └→ NO  → Create Customer → Prepare Message
                            ↓
                    Insert Message (Supabase INSERT)
                            ↓
                    [Tillbaka till Loop Each]
```

---

## Nod 1: Manual Trigger

- **Typ:** Manual Trigger
- **Inställningar
:** Standard (inga parametrar)
- **Koppling:** Koppla output till både "Fetch INBOX" och "Fetch Sent" (parallellt)

---

## Nod 2: Fetch INBOX

- **Typ:** IMAP
- **Credential:** <info@marinmekaniker.nu> (IMAP på imap.one.com:993, SSL)
- **Inställningar:**
  - Mailbox: `INBOX`
  - Action: Get Many
  - Return All: false
  - Limit: `500` (sätt till 5 för test)
  - Options → Search String: `SINCE 15-Jul-2025`
  - Download Attachments: false
- **On Error:** Continue (Regular Output)
- **Koppling:** Output → Merge (Input 1)

---

## Nod 3: Fetch Sent

- **Typ:** IMAP
- **Credential:** Samma som ovan
- **Inställningar:**
  - Mailbox: `INBOX.Sent`
  - Action: Get Many
  - Return All: false
  - Limit: `500` (sätt till 5 för test)
  - Options → Search String: `SINCE 15-Jul-2025`
  - Download Attachments: false
- **On Error:** Continue (Regular Output)
- **Koppling:** Output → Merge (Input 2)

---

## Nod 4: Merge

- **Typ:** Merge
- **Mode:** Append
- **Koppling:** Output → Process Emails

---

## Nod 5: Process Emails

- **Typ:** Code
- **Mode:** Run Once for All Items
- **JavaScript:**

```javascript
const thomasAddresses = [
  'info@marinmekaniker.nu',
  'thomas@marinmekaniker.nu',
  'thomas.guldager@marinmekaniker.nu'
];

function extractEmail(str) {
  if (!str) return '';
  const match = str.match(/<([^>]+)>/) || str.match(/([^\s<]+@[^\s>]+)/);
  return match ? match[1].toLowerCase().trim() : str.toLowerCase().trim();
}

function extractName(str) {
  if (!str) return '';
  const match = str.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : '';
}

const seen = new Set();
const results = [];

for (const item of $input.all()) {
  const msgId = item.json.messageId;
  
  // Dedup
  if (msgId && seen.has(msgId)) continue;
  if (msgId) seen.add(msgId);
  
  const fromEmail = extractEmail(item.json.from);
  const toEmail = extractEmail(item.json.to);
  
  // Skip Thomas-to-Thomas
  const fromIsThomas = thomasAddresses.includes(fromEmail);
  const toIsThomas = thomasAddresses.includes(toEmail);
  if (fromIsThomas && toIsThomas) continue;
  
  // Skip if no valid external party
  if (!fromEmail && !toEmail) continue;
  
  // Determine direction and external party
  let direction, externalEmail, externalName;
  
  if (fromIsThomas) {
    direction = 'outbound';
    externalEmail = toEmail;
    externalName = extractName(item.json.to) || toEmail.split('@')[0];
  } else {
    direction = 'inbound';
    externalEmail = fromEmail;
    externalName = extractName(item.json.from) || fromEmail.split('@')[0];
  }
  
  if (!externalEmail) continue;
  
  const body = item.json.textPlain || item.json.text || '';
  
  results.push({
    json: {
      direction,
      externalEmail,
      externalName: externalName.trim(),
      fromEmail,
      toEmail,
      subject: (item.json.subject || '(Inget ämne)').trim(),
      bodyPreview: body.substring(0, 500).trim(),
      bodyFull: body,
      receivedAt: item.json.date || null,
      messageId: msgId
    }
  });
}

return results;
```

- **Koppling:** Output → Loop Each

---

## Nod 6: Loop Each

- **Typ:** Split In Batches
- **Batch Size:** 1
- **Koppling:**
  - Output 1 (loop) → Find Customer
  - Output 2 (done) → (ingen koppling, flödet avslutas)

---

## Nod 7: Find Customer

- **Typ:** Supabase
- **Credential:** Supabase (Skyland CRM)
- **Inställningar:**
  - Operation: Select
  - Table: `customers`
  - Filter Type: String
  - Filter String: `email=eq.{{ $json.externalEmail }}`
  - Return All: false
  - Limit: 1
- **On Error:** Continue (Regular Output)
- **Koppling:** Output → Customer Exists?

---

## Nod 8: Customer Exists?

- **Typ:** IF
- **Condition:**
  - Value 1: `{{ $json.id }}`
  - Operation: exists (is not empty)
- **Koppling:**
  - TRUE → Prepare Message
  - FALSE → Create Customer

---

## Nod 9: Create Customer

- **Typ:** Supabase
- **Credential:** Supabase (Skyland CRM)
- **Inställningar:**
  - Operation: Insert
  - Table: `customers`
  - Fields to Send: Define Below
  - Field List:

    | Field | Value |
    |-------|-------|
    | email | `{{ $('Loop Each').item.json.externalEmail }}` |
    | name | `{{ $('Loop Each').item.json.externalName }}` |
    | source | `email_import` |
    | status | `active` |

- **On Error:** Continue (Regular Output)
- **Koppling:** Output → Prepare Message

---

## Nod 10: Prepare Message

- **Typ:** Code
- **Mode:** Run Once for Each Item
- **JavaScript:**

```javascript
const emailData = $('Loop Each').item.json;
const customerId = $json.id;

if (!customerId) {
  console.log('Ingen customer_id för:', emailData.externalEmail);
  return [];
}

return [{
  json: {
    customer_id: customerId,
    from_email: emailData.fromEmail,
    from_name: emailData.externalName,
    to_email: emailData.toEmail,
    subject: emailData.subject,
    body_preview: emailData.bodyPreview,
    body_full: emailData.bodyFull,
    received_at: emailData.receivedAt || new Date().toISOString(),
    rfc_message_id: emailData.messageId,
    direction: emailData.direction,
    channel: 'email',
    is_spam: false,
    processed: true
  }
}];
```

- **Koppling:** Output → Insert Message

---

## Nod 11: Insert Message

- **Typ:** Supabase
- **Credential:** Supabase (Skyland CRM)
- **Inställningar:**
  - Operation: Insert
  - Table: `messages`
  - Fields to Send: Define Below
  - Field List:

    | Field | Value |
    |-------|-------|
    | customer_id | `{{ $json.customer_id }}` |
    | from_email | `{{ $json.from_email }}` |
    | from_name | `{{ $json.from_name }}` |
    | to_email | `{{ $json.to_email }}` |
    | subject | `{{ $json.subject }}` |
    | body_preview | `{{ $json.body_preview }}` |
    | body_full | `{{ $json.body_full }}` |
    | received_at | `{{ $json.received_at }}` |
    | rfc_message_id | `{{ $json.rfc_message_id }}` |
    | direction | `{{ $json.direction }}` |
    | channel | `{{ $json.channel }}` |
    | is_spam | `{{ $json.is_spam }}` |
    | processed | `{{ $json.processed }}` |

- **On Error:** Continue (Regular Output)
- **Koppling:** Output → Loop Each (tillbaka till loopen)

---

## Credentials som behövs

### IMAP (<info@marinmekaniker.nu>)

- Host: `imap.one.com`
- Port: `993`
- User: `info@marinmekaniker.nu`
- Password: [Thomas lösenord]
- SSL/TLS: On

### Supabase (Skyland CRM)

- Host: `aws-1-eu-north-1.pooler.supabase.com`
- Port: `6543`
- Database: `postgres`
- User: `postgres.aclcpanlrhnyszivvmdy`
- Password: [Supabase-lösenord]
- SSL: On + "Ignore SSL Issues"

---

## Testinstruktioner

1. **Sätt limit till 5** på både Fetch INBOX och Fetch Sent
2. **Kör Manual Trigger**
3. **Verifiera:**
   - Process Emails visar bearbetade mejl
   - Find Customer hittar eller skapar kunder
   - Insert Message sparar meddelanden
4. **Kolla Supabase:**

   ```sql
   SELECT COUNT(*) FROM customers;
   SELECT COUNT(*) FROM messages;
   ```

5. **Om OK:** Sätt limit till 500 och kör full import

---

## Viktigt

- Thomas adresser (info@, thomas@, <thomas.guldager@marinmekaniker.nu>) ska ALDRIG bli kunder
- Mejl mellan Thomas adresser ska ignoreras
- `direction` = 'inbound' om någon skickar TILL Thomas, 'outbound' om Thomas skickar
- `externalEmail` är alltid den externa parten (kunden)
