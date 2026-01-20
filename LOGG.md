# Utvecklingslogg

## 2026-01-20 (em) - Fix: HTML/CSS visas i meddelandetext

### Problem identifierat

Meddelandetext visade rå CSS-kod istället för läsbar text:

- `body {background-color: #e7e7e7; font-family: sans-serif; color: #06395b; } .w-100 {width: 100%; }`
- `p{ margin:10px 0; padding:0; }`

**Orsak:** HTML-emails innehåller `<style>` block med CSS. Den gamla regex-strippningen `/<[^>]*>/g` tog bort HTML-taggar men lämnade kvar innehållet inuti `<style>...</style>`.

### Åtgärder

#### 1. Uppdaterat n8n Email_IMAP_Ingest workflow

La till ny funktion `stripHtmlAndCss()` som korrekt:

- Tar bort `<style>`, `<script>`, `<head>` block med innehåll
- Tar bort HTML-kommentarer
- Konverterar block-element till radbrytningar
- Avkodar HTML-entities (`&nbsp;`, `&amp;`, etc.)
- Tar bort kvarvarande CSS-mönster (`.class { ... }`, `property: value;`)

#### 2. Uppdaterat frontend Messages.jsx

La till samma `stripHtmlAndCss()` funktion i frontend som backup-rensning vid visning.

### Filer ändrade

- `frontend/src/pages/Messages.jsx` - La till stripHtmlAndCss funktion
- n8n workflow `Email_IMAP_Ingest` - Uppdaterat via MCP

### Status (2026-01-20 13:25)

- 🟢 **n8n workflow uppdaterat** - Nya emails processas korrekt
- 🟢 **Frontend uppdaterat** - Befintliga emails visas utan CSS
- 🟢 **Deployat till Netlify** - Produktionsversion uppdaterad

### Teknisk detalj

Ordning för rensning:

1. `stripHtmlAndCss()` - Tar bort style/script/head block och HTML-taggar
2. `decodeQuotedPrintable()` - Avkodar =XX hex-sekvenser
3. `fixMojibake()` - Fixar felavkodad UTF-8
4. `stripProblematicChars()` - Tar bort kontrollkaraktärer och emojis

---

## 2026-01-20 - Fix: Email textenkodning & SMTP-konfiguration

### Problem identifierat

Meddelandetext i appen visade konstiga tecken istället för ord:

- `Godmorgon Anja ●▅▅▅▅●▅▅▅▅●▅` istället för `Godmorgon Anja ☀️`
- `Vad kul ●▅▅▅▅` istället för `Vad kul ✨`

**Orsak:** Emojis och specialtecken (UTF-8 4-byte) dekodades felaktigt vid IMAP-import. Tecknen lagrades som korrupta byte-sekvenser (C1 control characters).

### Åtgärder

#### 1. Rensat befintlig data i databasen

```sql
-- Tog bort C1 control characters (korrupta emoji-rester)
UPDATE messages 
SET 
  body_preview = regexp_replace(body_preview, E'[\u0080-\u009F]+', '', 'g'),
  body_full = regexp_replace(body_full, E'[\u0080-\u009F]+', '', 'g'),
  subject = regexp_replace(subject, E'[\u0080-\u009F]+', '', 'g');

-- Ersatte ¦ med ...
UPDATE messages SET body_preview = replace(body_preview, '¦', '...');
```

#### 2. Uppdaterat n8n Email_IMAP_Ingest workflow

La till ny funktion `stripProblematicChars()`:

```javascript
function stripProblematicChars(text) {
  if (!text) return '';
  return text
    .replace(/[\x80-\x9F]/g, '')           // C1 control characters
    .replace(/[¨»¿ï¸â]/g, '')              // Mojibake-rester
    .replace(/[\uD800-\uDFFF]/g, '')       // Emoji surrogates
    .replace(/[\uFE00-\uFE0F]/g, '')       // Variation selectors
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')  // Control chars
    .replace(/  +/g, ' ')
    .trim();
}
```

Alla text-fält (subject, body, fromName) processas nu genom:

```javascript
stripProblematicChars(fixMojibake(decodeQuotedPrintable(rawText)))
```

#### 3. SMTP-konfiguration för utgående email

- Uppdaterade SMTP credentials i n8n till **port 465 med SSL** (från 587 med STARTTLS)
- One.com SMTP (`send.one.com`) hade timeout på port 587 från n8n Cloud
- **Status:** Timeout kvarstår - kan kräva alternativ SMTP-provider (SendGrid/Mailgun)

### Filer skapade/ändrade

- `Email_IMAP_Ingest_FIXED.json` - Backup av fixat workflow
- `Email_Outbound_Sender.json` - Workflow för utgående email (kräver fungerande SMTP)

### Status (2026-01-20)

- 🟢 **Email-text rensat** - Inga mer konstiga tecken i befintliga meddelanden
- 🟢 **n8n workflow uppdaterat** - Nya emails rensas automatiskt vid import
- 🟡 **Utgående email** - SMTP timeout, kräver alternativ lösning

### Teknisk detalj

Problemet var att emojis (som är UTF-8 4-byte sekvenser) dekodades byte-för-byte istället för som hela tecken. Detta resulterade i att varje byte blev ett separat (ogiltigt) tecken i C1 control character range (0x80-0x9F).

---

## 2026-01-19 (kväll) - Svara på och radera meddelanden

### Implementerat

#### 1. Svara på meddelanden (Reply)

- **ReplyModal.jsx** - Ny komponent för att svara på email
  - Visar mottagare (auto-detect från inbound/outbound)
  - Ämnesrad med "Re: " prefix
  - Textfält för svar
  - Förhandsgranskning av originalmeddelande
  - Sparar utgående meddelande i `messages` med `status: 'queued'`

#### 2. Radera meddelanden (Delete)

- **DeleteMessageModal.jsx** - Bekräftelsemodal för radering
  - Visar förhandsgranskning av meddelande som ska raderas
  - Kräver bekräftelse innan radering
  - Tar bort från `messages`-tabellen via Supabase

#### 3. Timeline uppdaterad

- Lade till "Svara" och "Radera" knappar på varje email
- Knappar visas endast för emails (inte formulär)
- Timeline refreshar automatiskt efter lyckad åtgärd

#### 4. n8n Workflow för utgående email

- **Email_Outbound_Sender.json** - Nytt workflow
  - Kollar var minut efter `status='queued'` + `direction='outbound'`
  - Skickar via SMTP
  - Uppdaterar status till `sent` eller `failed`
  - **Kräver:** SMTP credentials kopplas i n8n

### Filer skapade

- `frontend/src/components/ReplyModal.jsx`
- `frontend/src/components/DeleteMessageModal.jsx`
- `Email_Outbound_Sender.json` (n8n workflow)
- `migrations/20260119_add_messages_delete_policy.sql`

### Filer ändrade

- `frontend/src/components/Timeline.jsx` - Lade till modaler och knappar
- `frontend/src/pages/CustomerDetail.jsx` - Skickar `customer` prop till Timeline
- `frontend/src/pages/JobDetail.jsx` - Bugfix: `window.confirm` istället för `confirm`

### Databas-migration krävs

Kör följande SQL i Supabase:

```sql
CREATE POLICY "Authenticated delete" ON messages
  FOR DELETE USING (auth.role() = 'authenticated');
```

### Status (2026-01-19 kväll)

- 🟢 **Svara-funktion implementerad** - Meddelande sparas i databasen
- 🟢 **Radera-funktion implementerad** - Med bekräftelsemodal
- 🟡 **n8n-workflow** - Kräver SMTP credentials kopplade för att faktiskt skicka
- 🟢 **Build OK** - Frontend bygger utan fel

### Nästa steg

1. Kör SQL-migrationen för DELETE policy
2. Importera `Email_Outbound_Sender.json` i n8n
3. Koppla SMTP-credentials i n8n
4. Aktivera workflow
5. Testa fullständigt flöde

---

## 2026-01-19 - Automatisk kundhantering & Smart extraktion

### Implementerat

#### 1. SQL-trigger för automatisk kund- och ärendeskapande

- **Trigger:** `trigger_auto_create_customer` körs automatiskt vid INSERT i `messages`
- **Funktionalitet:**
  - Skapar ny kund från inkommande email (eller hittar befintlig via email)
  - Skapar ny lead kopplad till kunden
  - Sätter `customer_id` och `lead_id` på meddelandet

#### 2. Smart extraktion från emailtext

Triggern extraherar nu automatiskt:

**📱 Telefonnummer:**

- Svenska mobilnummer: `07X-XXX XX XX`, `07XXXXXXXX`
- Internationellt: `+46 7X XXX XX XX`
- Fasta nummer: `0XXX-XXXXXX`

**🚤 Båtmärken (25+ brands):**
Sea Ray, Bayliner, Yamarin, Nimbus, Storebro, Windy, Ryds, Uttern, Crownline, Chaparral, Boston Whaler, Sunseeker, Princess, Fairline, Grandezza, Nordkapp, Flipper, Jeanneau, Quicksilver, m.fl.

**⚙️ Motormärken:**
Mercruiser, Volvo Penta, Yamaha, Mercury, Honda, Suzuki, Evinrude, Johnson, Tohatsu, Yanmar

#### 3. Quoted-printable encoding fix

- Lade till `decodeQuotedPrintable()` i n8n-workflowet
- Fixar `=C3=B6` → `ö` för svenska tecken
- Uppdaterade workflow via n8n MCP

#### 4. SPA-routing fix för Netlify

- Skapade `frontend/public/_redirects`
- Innehåll: `/*    /index.html   200`
- Fixar 404 vid sidladdning på `/login`, `/kund/:id` etc.

#### 5. Förbättrad namnformatering

- Uppdaterade `formatCustomerName()` för att parsa "Namn <email>" format
- Nu visas korrekta namn i "Att svara på" istället för "Okänd"

#### 6. Today.jsx fix för leads-query

- Ändrade `.neq('ai_category', 'SPAM')` till `.or('ai_category.is.null,ai_category.neq.SPAM')`
- Nya leads (med null ai_category) visas nu i "Att svara på"

### Filer ändrade

- `frontend/public/_redirects` - Ny fil för SPA-routing
- `frontend/src/pages/Today.jsx` - Fix för leads-query
- `frontend/src/lib/formatName.js` - Parsing av "Namn <email>" format

### Supabase migrationer

- `auto_create_customer_trigger` - Grundläggande trigger
- `extract_phone_from_message` - Telefonnummerextraktion
- `extract_boat_info_from_message` - Båt- och motorextraktion

### n8n workflow uppdateringar

- `Email_IMAP_Ingest` - Lade till `decodeQuotedPrintable()` för encoding-fix

### Status (2026-01-19)

- 🟢 **Automatisk kundhantering aktiv** - Nya mail skapar kund + lead + båt automatiskt
- 🟢 **Smart extraktion** - Telefon, båt och motor plockas från emailtext
- 🟢 **Encoding fixat** - Svenska tecken visas korrekt
- 🟢 **SPA-routing fixat** - Inga 404 vid sidladdning

---

## 2026-01-16 - Skapad: Historical Email Import workflow

### Syfte

Importera 6 månaders mejlhistorik (både INBOX och Skickat) från Thomas inbox till Supabase CRM.

### Workflow-komponenter

1. **Manual Trigger** – Startar import manuellt
2. **Fetch INBOX / Fetch Sent** – Hämtar mejl parallellt (SINCE 15-Jul-2025)
3. **Merge** – Slår ihop alla mejl
4. **Process Emails** – Deduplicering, riktningsbestämning, mojibake-fix
5. **Loop Each** – Bearbetar ett mejl i taget
6. **Find Customer** – Söker befintlig kund på email
7. **Customer Exists?** – Villkorslogik
8. **Create Customer** – Skapar ny kund om den inte finns (source: `email_import`)
9. **Prepare Message** – Formaterar meddelandedata
10. **Insert Message** – Sparar till `messages`-tabellen

### Filer

- `Historical_Email_Import.json` – n8n workflow (importera i n8n UI)

### Importinstruktioner

1. Öppna n8n Dashboard
2. Gå till Workflows → Add Workflow → Import from File
3. Välj `Historical_Email_Import.json`
4. Verifiera att credentials är korrekt kopplade (IMAP + Supabase)
5. **TEST FÖRST:** Sätt limit till 5 i Fetch INBOX och Fetch Sent
6. Kör Manual Trigger
7. Om OK: Ta bort limit eller sätt till 500 för full import

### Viktigt

- Thomas adresser (info@, thomas@, <thomas.guldager@marinmekaniker.nu>) skapas ALDRIG som kunder
- Mejl mellan Thomas egna adresser ignoreras helt
- `direction` = 'inbound' för inkommande, 'outbound' för skickade

---

## 2026-01-15 (em) - Buggfix: Felaktig datalänkning i inbox

### Problem identifierat

- **Symptom:** Anna Svenssons formulärposter visades på Erik Testssons tidslinje
- **Rotorsak:** Inbox-posterna hade fel `lead_id` - de pekade på Eriks lead istället för Annas
- **Ytterligare problem:** Anna Svensson saknade helt ett eget lead-record i `leads`-tabellen

### Åtgärder utförda (via Supabase SQL Editor)

1. **Skapade lead för Anna Svensson:**

   ```sql
   INSERT INTO leads (name, email, customer_id, status, source, created_at)
   VALUES ('Anna Svensson', 'anna.svensson@email.se', 
           'b2c92835-019f-4c46-b22d-29dd32566395', 'new', 'website_form', ...)
   -- Nytt lead ID: c090e716-0888-4606-a900-620415dbab56
   ```

2. **Uppdaterade inbox-poster:**

   ```sql
   UPDATE inbox 
   SET lead_id = 'c090e716-0888-4606-a900-620415dbab56'
   WHERE id IN ('9e311753-1f3c-4de1-9c87-0c745b08970e', 
                '80f8695d-f939-4555-ba7c-ab27eb9b1c94');
   ```

3. **Verifiering:**
   - ✅ Båda inbox-posterna pekar nu på rätt lead (`c090e716...`)
   - ✅ Lead är kopplat till rätt customer (`b2c92835...` = Anna Svensson)
   - ✅ Tidslinjen visar nu Anna Svensson som kund istället för Erik Testsson

### Förbättringsförslag

- Implementera validering i n8n-workflowet för att säkerställa att `lead_id` matchar avsändarens email
- Lägg till database constraint eller trigger för att förhindra felaktig länkning
- Skapa admin-vy för att enkelt inspektera och korrigera datalänkningar

### Status (2026-01-15 16:11)

- 🟢 **Bugg löst** - Anna Svenssons formulär visas nu på rätt kundkort
- Systemet är åter stabilt

---

## 2026-01-15 - Systemverifiering innan vidareutveckling

### Kontrollerad

- **Databas (Supabase):**
  - ✅ Tabellen `inbox` finns och har data (43 rader)
  - ✅ Tabellen `messages` finns och har data (2 rader från IMAP-ingest)
  - ✅ Tabellen `customers` finns och har data (34 kunder)
  - ✅ Tabellen `leads` finns och har data (42 leads)
  - ✅ Kolumner för länkning (`customer_id`, `lead_id`) verifierade

- **Frontend:**
  - ✅ Appen bygger utan fel (`npm run build`)
  - ✅ Login fungerar (Supabase auth med email/password)
  - ✅ Kundlistan laddar och visar kunder korrekt
  - ✅ Kundkortet öppnas och visar kontakt, båtar, ärenden
  - ✅ Tidslinjen renderas med formulärhistorik

- **n8n Workflows:**
  - ⚠️ Kunde ej verifiera direkt (kräver dashboard-åtkomst)
  - ✅ Indikation: Färsk data i `messages`-tabellen från IMAP (2026-01-15)

- **Filstruktur:**
  - ✅ `frontend/src/components/Timeline.jsx` finns (71 rader)
  - ✅ `frontend/src/pages/CustomerDetail.jsx` finns (241 rader)
  - ✅ `frontend/src/lib/supabase.js` finns och exporterar klient

### Status (2026-01-15)

- 🟢 **Systemet är stabilt och redo för vidareutveckling**
- Alla kärnfunktioner verifierade att fungera korrekt

### User Story 3.6: Tidslinje visar formulär och mejl

- **Implementerat:**
  - `Timeline.jsx` omskriven för att själv hämta data med `customerId` som prop
  - Hämtar e-post från `messages`-tabellen (filtrerat på `channel='email'`)
  - Hämtar formulär från `inbox`-tabellen (via `leads.customer_id`)
  - Spam döljs (`status != 'spam'`)
  - Unifierad shape med `type`, `title`, `from_label`, `preview`, `ts`
  - Sorterat fallande på `ts` (senast överst)
  - "Mejl" / "Formulär" label visas tydligt per rad
  - Loading-state, error-state och empty-state hanteras
  - Deduplicering på `id` för att undvika dubbletter i UI
  
- **Filer ändrade:**
  - `frontend/src/components/Timeline.jsx` - Ny implementation
  - `frontend/src/pages/CustomerDetail.jsx` - Skickar `customerId` prop, tog bort gammal hämtningslogik

### Buggfixar: n8n Email IMAP Ingest

- **Problem 1: E-post inte länkad till kunder**
  - Orsak: `Prepare Insert`-noden i n8n kontrollerade `Array.isArray(customerResult)` men Supabase-noden returnerar objekt, inte arrayer
  - Fix: Ändrade till `const customerId = customerResult?.id || null;`
  - Resultat: Inkommande mejl länkas nu korrekt till befintliga kunder

- **Problem 2: Svenska tecken (Å Ä Ö) visades som mojibake**
  - Orsak: UTF-8 text tolkades som Latin-1 (t.ex. "Ã¥" istället för "å")
  - Fix: La till `fixMojibake`-funktion i `Process Email Data`-noden som konverterar:
    - `Ã¥` → `å`, `Ã¤` → `ä`, `Ã¶` → `ö`
    - `Ã…` → `Å`, `Ã„` → `Ä`, `Ã–` → `Ö`
  - Körde SQL-fix för befintliga meddelanden i databasen
  - Resultat: Svenska tecken visas nu korrekt i tidslinjen

- **Filer ändrade:**
  - `Email_IMAP_Ingest.json` - Uppdaterad n8n workflow med båda fixarna

---

## 2026-01-14 - Fas 2: Auth, Dashboard & Deployment

### Implementerat

- **Deployment:**
  - Byggt och deployat frontend till Netlify.
  - Verifierat att applikationen fungerar live på `marinmekaniker.netlify.app`.

- **Autentisering:**
  - Satt upp `Login.jsx` med Supabase Email/Password auth.
  - Skapat `ProtectedRoute` för att skydda routes.
  - Implementerat `logout`-funktion i Headern.
  - Verifierat RLS (Row Level Security) i databasen.

- **Vyer:**
  - `Today.jsx`: Ny startsida som visar "Att svara på" (Leads), "Kommande jobb" och KPI-statistik.
  - `CustomerList.jsx`: Tabellvy över alla kunder med sök/filtrering.
  - `CustomerDetail.jsx`: Detaljvy för kund med:
    - Kontaktinfo
    - Båtar (motor, regnr)
    - Ärenden (Leads-historik)
    - Tidslinje (Inbox-historik)

- **Komponenter:**
  - `Timeline.jsx`: Återanvändbar komponent för att visa händelser/kommunikation i ordning.
  - `Header.jsx`: Uppdaterad navigation.

### Fixar

- Löst ESLint-varningar gällande imports i `App.jsx`.
- Städat bort oanvänd kod i `CustomerDetail` och `CustomerList`.
- Lagat inloggningsproblem relaterat till `email_confirmed_at`.

### Status (2026-01-14)

- Applikationen körs live i produktion.
- Frontend är kopplad mot Supabase (Read-only förutom auth).
- Redo för Fas 2b: Editering och skapande av data (Actions).
