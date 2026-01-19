# Fix för n8n Email Workflow

## Problem
1. Email-innehåll sparas med quoted-printable encoding (=C3=B6 etc)
2. Nya emails skapar inte automatiskt kunder/leads

## Lösning

### 1. Fixa Encoding i "Process Email Data" nod

Lägg till denna kod i Code-noden INNAN data sparas i Supabase:

```javascript
// Funktion för att dekoda quoted-printable
function decodeQuotedPrintable(text) {
    if (!text) return '';

    try {
        // Ersätt =XX hex codes med faktiska tecken
        let decoded = text.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });

        // Ta bort soft line breaks (=\r\n eller =\n)
        decoded = decoded.replace(/=\r?\n/g, '');

        return decoded;
    } catch (e) {
        console.error('Error decoding quoted-printable:', e);
        return text;
    }
}

// Applicera på email-data
const emailData = $input.all();

for (const item of emailData) {
    const data = item.json;

    // Dekoda subject
    if (data.subject) {
        data.subject = decodeQuotedPrintable(data.subject);
    }

    // Dekoda body/content
    if (data.body) {
        data.body = decodeQuotedPrintable(data.body);
    }
    if (data.body_full) {
        data.body_full = decodeQuotedPrintable(data.body_full);
    }
    if (data.body_preview) {
        data.body_preview = decodeQuotedPrintable(data.body_preview);
    }

    // Dekoda from_name
    if (data.from_name) {
        data.from_name = decodeQuotedPrintable(data.from_name);
    }
}

return emailData;
```

### 2. Lägg till "Match Customer" nod

Efter "Process Email Data", innan "Insert Message":

1. Lägg till en **Supabase** nod: "Check if customer exists"
   - Operation: `Select rows`
   - Table: `customers`
   - Filter: `email` = `{{ $json.from_address }}`

2. Lägg till en **IF** nod: "Customer exists?"
   - Condition: `{{ $json.data.length > 0 }}`

3. **Om kunden INTE finns** (false branch):
   - Lägg till **Supabase** nod: "Create Customer"
     - Operation: `Insert rows`
     - Table: `customers`
     - Data:
       ```json
       {
         "email": "{{ $json.from_address }}",
         "name": "{{ $json.from_name || $json.from_address }}",
         "source": "email",
         "status": "active"
       }
       ```

   - Lägg till **Supabase** nod: "Create Lead"
     - Operation: `Insert rows`
     - Table: `leads`
     - Data:
       ```json
       {
         "customer_id": "{{ $json.id }}",
         "name": "{{ $node['Create Customer'].json.name }}",
         "email": "{{ $node['Create Customer'].json.email }}",
         "subject": "{{ $json.subject }}",
         "message": "{{ $json.body }}",
         "source": "email",
         "status": "new"
       }
       ```

4. **Merge** branches och sätt customer_id på message innan insert

### 3. Uppdatera "Insert Message" nod

Se till att customer_id sätts:

```json
{
  "customer_id": "{{ $json.customer_id }}",
  "direction": "inbound",
  "channel": "email",
  "subject": "{{ $json.subject }}",
  "body_full": "{{ $json.body_full }}",
  "body_preview": "{{ $json.body_preview }}",
  "from_address": "{{ $json.from_address }}",
  "from_name": "{{ $json.from_name }}",
  "received_at": "{{ $json.received_at }}",
  "status": "delivered"
}
```

## Testning

1. Skicka ett test-email till systemet med svenska tecken
2. Kontrollera i Supabase att:
   - `messages.subject` är korrekt dekodat (ingen =C3=B6)
   - En ny `customer` har skapats om email-adressen var ny
   - En ny `lead` har skapats
   - `message.customer_id` är satt

## Alternative: Supabase Function

Om du föredrar kan detta också göras med en Supabase Edge Function som triggas när nya messages skapas.
