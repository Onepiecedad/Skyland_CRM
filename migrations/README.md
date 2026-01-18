# Database Migrations

## Köra migrationer

### Via Supabase Dashboard (Enklast)

1. Logga in på [Supabase Dashboard](https://supabase.com/dashboard)
2. Välj ditt projekt (Skyland CRM)
3. Gå till **SQL Editor** i vänstermenyn
4. Öppna `add_invoices_table.sql` och kopiera innehållet
5. Klistra in SQL-koden i editorn
6. Klicka **Run** för att köra migrationen

### Via Supabase CLI (Avancerat)

```bash
# Installera Supabase CLI om inte redan gjort
npm install -g supabase

# Logga in
supabase login

# Länka projektet
supabase link --project-ref <your-project-ref>

# Kör migration
supabase db push

# Eller kör direkt via psql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f migrations/add_invoices_table.sql
```

## Migrationer

### `add_invoices_table.sql` (2026-01-18)

Lägger till:
- **invoices** tabell - Fakturor kopplade till jobb
- **invoice_items** tabell - Fakturarader (backup/flexibilitet)
- **Business settings** - Företagsinformation (adress, org.nr, bankkonto, etc.)
- **Auto-numbering** - Funktion för att generera fakturanummer (YYYY-NNN)
- **RLS policies** - Row Level Security
- **Indexes** - För prestanda

#### Vad skapas:

**Tabeller:**
- `invoices` - Huvudtabell för fakturor
- `invoice_items` - Fakturarader (som backup till job_items)

**Settings som läggs till:**
- `business_address` - Företagsadress
- `business_org_number` - Organisationsnummer
- `business_vat_number` - VAT/Momsnummer
- `business_bank_account` - Bankkonto
- `business_swish` - Swish-nummer
- `invoice_payment_terms` - Betalningsvillkor (dagar)
- `invoice_footer_text` - Text i sidfot på fakturor
- `invoice_prefix` - Prefix för fakturanummer
- `invoice_next_number` - Nästa löpnummer

**Funktioner:**
- `generate_invoice_number()` - Genererar unikt fakturanummer

## Verifiera migration

Efter körning, verifiera i SQL Editor:

```sql
-- Kolla att tabellerna skapades
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('invoices', 'invoice_items');

-- Kolla settings
SELECT * FROM settings WHERE key LIKE 'business_%' OR key LIKE 'invoice_%';

-- Test: Generera fakturanummer
SELECT generate_invoice_number();
```

Du borde se:
- `invoices` och `invoice_items` tabeller
- 9 nya settings
- Fakturanummer: `2026-001`
