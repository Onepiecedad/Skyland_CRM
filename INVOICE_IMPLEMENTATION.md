# Fakturasystem - Implementation Status

## ✅ Klart (Phase 1)

### 1. Databas-schema
- **File**: `migrations/add_invoices_table.sql`
- **Tabeller**:
  - `invoices` - Huvudtabell för fakturor
  - `invoice_items` - Fakturarader (backup/flexibilitet)
- **Funktioner**:
  - `generate_invoice_number()` - Auto-genererar fakturanummer (YYYY-NNN)
- **Settings**:
  - business_address, business_org_number, business_vat_number
  - business_bank_account, business_swish
  - invoice_payment_terms, invoice_footer_text
  - invoice_prefix, invoice_next_number

### 2. API-funktioner
- **File**: `frontend/src/lib/api.js`
- **invoicesAPI**: Full CRUD för fakturor
  - `getAll()` - Hämta alla med filtrering
  - `getById()` - Hämta specifik faktura
  - `create()` - Skapa ny faktura från jobb
  - `update()` - Uppdatera faktura
  - `markAsPaid()` - Markera som betald
  - `markAsUnpaid()` - Markera som obetald
  - `updatePdfUrl()` - Uppdatera PDF URL
  - `delete()` - Radera faktura + PDF
- **invoiceItemsAPI**: CRUD för fakturarader
- **settingsAPI**: Hämta företagsinformation för fakturor

### 3. PDF-bibliotek
- **Installerat**:
  - `@react-pdf/renderer` - För PDF-generering
  - `jspdf` - Alternativ PDF-generering

---

## 🚧 Nästa steg (Phase 2)

### STEG 1: Kör databas-migration

**Via Supabase Dashboard** (Rekommenderat):
1. Gå till [Supabase Dashboard](https://supabase.com/dashboard)
2. Välj projektet "Skyland CRM"
3. Gå till **SQL Editor**
4. Öppna `migrations/add_invoices_table.sql`
5. Kopiera hela innehållet
6. Klistra in i SQL Editor
7. Klicka **Run**

**Verifiera**:
```sql
-- Kolla att tabellerna skapades
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('invoices', 'invoice_items');

-- Test fakturanummer
SELECT generate_invoice_number();  -- Ska returnera: 2026-001
```

### STEG 2: Skapa Supabase Storage Bucket

1. Gå till **Storage** i Supabase Dashboard
2. Klicka **New bucket**
3. Namn: `invoices`
4. **Public bucket**: ✅ Ja (för att kunna dela PDF-länkar)
5. **File size limit**: 5 MB
6. Klicka **Create bucket**

**Policies** (Sätt via SQL Editor):
```sql
-- Tillåt authenticated users att ladda upp
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');

-- Tillåt alla att läsa (publik bucket)
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'invoices');

-- Tillåt authenticated users att radera
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'invoices');
```

### STEG 3: Uppdatera företagsinformation

Gå till Supabase Dashboard → SQL Editor och kör:

```sql
-- Uppdatera med RÄTT företagsinformation
UPDATE settings SET value = '"Din riktiga adress här"' WHERE key = 'business_address';
UPDATE settings SET value = '"Ditt org.nummer"' WHERE key = 'business_org_number';
UPDATE settings SET value = '"Ditt VAT-nummer"' WHERE key = 'business_vat_number';
UPDATE settings SET value = '"Ditt bankkonto"' WHERE key = 'business_bank_account';
UPDATE settings SET value = '"Ditt Swish-nummer"' WHERE key = 'business_swish';
UPDATE settings SET value = '"Din faktura-sidfot"' WHERE key = 'invoice_footer_text';
```

---

## 🔜 TODO (Phase 3 - Nästa session)

### 1. PDF-generation utilities
- **File**: `frontend/src/lib/invoiceUtils.js`
- Funktioner:
  - `generateInvoicePDF()` - Generera PDF från fakturadata
  - `uploadInvoicePDF()` - Ladda upp PDF till Supabase Storage
  - `downloadInvoicePDF()` - Ladda ner PDF
  - `calculateInvoiceTotals()` - Beräkna subtotal, VAT, total

### 2. Invoice PDF Template
- **File**: `frontend/src/components/invoices/InvoiceTemplate.jsx`
- React-PDF komponent för faktura-layout
- Svenska format och design
- Företagsinfo, kundinfo, fakturarader, totaler

### 3. UI Components
**Files**:
- `frontend/src/pages/InvoiceList.jsx` - Lista alla fakturor
- `frontend/src/pages/InvoiceDetail.jsx` - Visa faktura + PDF preview
- `frontend/src/components/invoices/CreateInvoiceDialog.jsx` - Dialog för att skapa faktura från jobb

### 4. Integrera i JobDetail
- Knapp: "Skapa faktura" (om status = completed)
- Visa befintliga fakturor för jobbet
- Knapp: "Markera som betald" / "Markera som obetald"

### 5. Integrera i CustomerDetail
- Lista kundens fakturor
- Totalt utestående belopp
- Betalningshistorik

---

## 📊 Funktionalitet

### Faktura-flöde:
1. **Jobb slutfört** → Status: "completed"
2. **Skapa faktura** → Hämtar job_items → Beräknar total → Skapar faktura
3. **Generera PDF** → Skapar PDF → Laddar upp till Storage → Sparar URL
4. **Skicka till kund** → E-post med PDF-länk (framtida feature)
5. **Markera som betald** → Uppdaterar payment_status, paid_at, payment_method

### Betalningsflöde:
- **Unpaid** → Standard när faktura skapas
- **Paid** → Markeras manuellt eller via Swish/kort-integration (framtida)
- **Overdue** → Auto-flaggas efter förfallodatum (framtida automation)
- **Partially_paid** → Delbetalning (framtida feature)

---

## 🎯 Funktioner som kommer:

### Core (Nästa session):
- ✅ Generera PDF-faktura från jobb
- ✅ Ladda ner PDF
- ✅ Markera som betald/obetald
- ✅ Visa fakturor på jobb och kunder

### Future enhancements:
- 📧 E-posta faktura direkt till kund
- 💳 Swish-integration (auto-markera som betald)
- 🔔 Påminnelser för förfallna fakturor
- 📊 Faktura-rapporter (intäkter per månad, obetalda)
- 🏠 ROT/RUT-avdrag stöd (redan i schema, behöver UI)
- 📄 Offert → Faktura conversion
- 🔁 Återkommande fakturor (service-avtal)

---

## 💡 Användning (efter Phase 3 klar):

### Skapa faktura från jobb:

```javascript
// I JobDetail.jsx
import { invoicesAPI, jobItemsAPI, settingsAPI } from '@/lib/api';

const handleCreateInvoice = async () => {
  // 1. Hämta job items
  const jobItems = await jobItemsAPI.getByJob(job.id);

  // 2. Beräkna total
  const subtotal = jobItems.data.reduce((sum, item) => sum + item.total_price, 0);
  const vatRate = 25.00; // 25% svensk moms
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  // 3. Skapa faktura
  const invoice = await invoicesAPI.create({
    job_id: job.id,
    customer_id: job.customer_id,
    subtotal,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total,
    customer_notes: 'Tack för ditt förtroende!',
  });

  // 4. Kopiera job_items till invoice_items
  const invoiceItems = jobItems.data.map(item => ({
    invoice_id: invoice.data.id,
    description: item.description,
    item_type: item.item_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
    job_item_id: item.id,
  }));

  await invoiceItemsAPI.bulkCreate(invoiceItems);

  // 5. Generera PDF (Phase 3)
  // const pdfUrl = await generateInvoicePDF(invoice.data.id);

  console.log('Faktura skapad!', invoice.data.invoice_number);
};
```

---

## 🔐 Säkerhet

- ✅ RLS policies aktiverade
- ✅ Endast authenticated users kan CRUD
- ✅ Service role har full access (för n8n automations)
- ✅ PDF storage: Public read, authenticated write/delete
- ✅ Validering av belopp (CHECK constraints)

---

## 📝 Databas-struktur

### invoices
| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | UUID | Primärnyckel |
| invoice_number | TEXT | Auto-genererad (2026-001) |
| job_id | UUID | Koppling till jobb |
| customer_id | UUID | Koppling till kund |
| invoice_date | DATE | Fakturadatum |
| due_date | DATE | Förfallodatum |
| subtotal | DECIMAL | Summa exkl. moms |
| vat_rate | DECIMAL | Momssats (25.00) |
| vat_amount | DECIMAL | Momsbelopp |
| total | DECIMAL | Totalsumma inkl. moms |
| payment_status | TEXT | unpaid/paid/overdue/cancelled |
| paid_amount | DECIMAL | Betalt belopp |
| paid_at | TIMESTAMPTZ | Betalningsdatum |
| payment_method | TEXT | card/swish/bank_transfer/cash |
| pdf_url | TEXT | URL till PDF |
| pdf_storage_path | TEXT | Storage path |
| notes | TEXT | Interna anteckningar |
| customer_notes | TEXT | Meddelande till kund |

### invoice_items
| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | UUID | Primärnyckel |
| invoice_id | UUID | Koppling till faktura |
| description | TEXT | Beskrivning |
| item_type | TEXT | labor/part/material/other |
| quantity | DECIMAL | Antal |
| unit_price | DECIMAL | Pris per enhet |
| total_price | DECIMAL | Totalpris |
| job_item_id | UUID | Koppling till job_item (optional) |

---

**Status**: Phase 1 klar ✅
**Nästa**: Kör migration + skapa storage bucket → Sedan Phase 2 (PDF-generering + UI)
