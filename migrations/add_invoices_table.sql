-- Migration: Add invoices table and additional business settings
-- Created: 2026-01-18

-- ============================================================
-- 1. CREATE INVOICES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Kopplingar
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Fakturanummer (auto-genereras: YYYY-NNN)
  invoice_number TEXT UNIQUE NOT NULL,

  -- Datum
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL, -- Förfallodatum (standard: invoice_date + 30 dagar)

  -- Belopp
  subtotal DECIMAL(10,2) NOT NULL, -- Summa exkl. moms
  vat_rate DECIMAL(5,2) DEFAULT 25.00, -- Moms % (Sverige: 25%)
  vat_amount DECIMAL(10,2) NOT NULL, -- Momsbelopp
  total DECIMAL(10,2) NOT NULL, -- Totalsumma inkl. moms

  -- ROT/RUT-avdrag (Swedish tax deductions for home services)
  rot_rut_type TEXT CHECK (rot_rut_type IN ('ROT', 'RUT', NULL)),
  rot_rut_amount DECIMAL(10,2), -- Avdragsbelopp

  -- Betalning
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'
  )),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'card', 'bank_transfer', 'swish', 'cash', etc.
  payment_reference TEXT, -- Betalningsreferens/transaction ID

  -- PDF fil
  pdf_url TEXT, -- URL till PDF i Supabase Storage
  pdf_storage_path TEXT, -- Path i storage bucket

  -- Noteringar
  notes TEXT, -- Interna anteckningar
  customer_notes TEXT, -- Meddelande till kund på fakturan

  -- Påminnelser
  reminder_sent_at TIMESTAMPTZ, -- När påminnelse skickades
  reminder_count INTEGER DEFAULT 0,

  CONSTRAINT valid_amounts CHECK (
    subtotal >= 0 AND
    vat_amount >= 0 AND
    total >= 0 AND
    paid_amount >= 0 AND
    paid_amount <= total
  )
);

-- Kommentarer
COMMENT ON TABLE invoices IS 'Fakturor kopplade till jobb';
COMMENT ON COLUMN invoices.invoice_number IS 'Unikt fakturanummer format: YYYY-NNN (ex: 2026-001)';
COMMENT ON COLUMN invoices.rot_rut_type IS 'ROT (renovering, ombyggnad, tillbyggnad) eller RUT (reparation, underhåll, tvätt)';
COMMENT ON COLUMN invoices.pdf_url IS 'Publik URL till PDF-faktura i Supabase Storage';

-- Index för snabbare queries
CREATE INDEX idx_invoices_job_id ON invoices(job_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ============================================================
-- 2. CREATE INVOICE_ITEMS TABLE (för mer flexibilitet)
-- ============================================================

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Item details
  description TEXT NOT NULL,
  item_type TEXT CHECK (item_type IN ('labor', 'part', 'material', 'other')),
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  -- Koppling till job_items (optional)
  job_item_id UUID REFERENCES job_items(id) ON DELETE SET NULL,

  sort_order INTEGER DEFAULT 0,

  CONSTRAINT valid_invoice_item_amounts CHECK (
    quantity > 0 AND
    unit_price >= 0 AND
    total_price >= 0
  )
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_sort_order ON invoice_items(invoice_id, sort_order);

-- ============================================================
-- 3. UPDATE SETTINGS WITH ADDITIONAL BUSINESS INFO
-- ============================================================

-- Lägg till företagsinformation för fakturor
INSERT INTO settings (key, value, description) VALUES
  ('business_address', '"Strandvägen 12, 123 45 Stockholm"', 'Företagsadress'),
  ('business_org_number', '"559999-9999"', 'Organisationsnummer'),
  ('business_vat_number', '"SE559999999901"', 'VAT/Momsnummer'),
  ('business_bank_account', '"Swedbank: 1234 12 34567"', 'Bankkonto för betalningar'),
  ('business_swish', '"076-855 99 31"', 'Swish-nummer'),
  ('invoice_payment_terms', '30', 'Betalningsvillkor i dagar'),
  ('invoice_footer_text', '"Tack för ditt förtroende! Vid frågor, kontakta oss på info@marinmekaniker.nu"', 'Text i sidfot på fakturor'),
  ('invoice_prefix', '"2026"', 'Prefix för fakturanummer (år)'),
  ('invoice_next_number', '1', 'Nästa fakturanummer (sekvens)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. TRIGGER FÖR AUTO-UPDATE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- ============================================================
-- 5. FUNCTION FÖR ATT GENERERA FAKTURANUMMER
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_num INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Hämta nuvarande år
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Hämta nästa nummer från settings
  SELECT (value::INTEGER) INTO next_num
  FROM settings
  WHERE key = 'invoice_next_number';

  -- Skapa fakturanummer: YYYY-NNN (ex: 2026-001)
  new_invoice_number := current_year || '-' || LPAD(next_num::TEXT, 3, '0');

  -- Uppdatera nästa nummer
  UPDATE settings
  SET value = (next_num + 1)::TEXT::JSONB
  WHERE key = 'invoice_next_number';

  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Policy: Alla kan läsa invoices (för autentiserade användare)
CREATE POLICY "Allow read access to invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Alla kan skapa invoices
CREATE POLICY "Allow insert access to invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Alla kan uppdatera invoices
CREATE POLICY "Allow update access to invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Service role har full access
CREATE POLICY "Service role full access to invoices"
  ON invoices FOR ALL
  TO service_role
  USING (true);

-- Invoice items policies
CREATE POLICY "Allow read access to invoice_items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access to invoice_items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update access to invoice_items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to invoice_items"
  ON invoice_items FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- DONE
-- ============================================================

COMMENT ON TABLE invoices IS 'Migration completed: invoices table with PDF storage support';
