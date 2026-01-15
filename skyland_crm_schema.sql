-- ============================================================
-- SKYLAND CRM 2.0 - KOMPLETT SUPABASE SCHEMA
-- ============================================================
-- Datum: 2026-01-13
-- Projekt: Skyland CRM för marinmekaniker.nu
-- Version: 1.0 (med alla tillägg)
-- ============================================================

-- Kör detta i Supabase Dashboard → SQL Editor

-- ============================================================
-- 1. CUSTOMERS - Kunder
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Kontaktinfo
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  
  -- Kundstatus
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  source TEXT, -- 'website', 'telegram', 'referral', 'repeat'
  
  -- Anteckningar
  notes TEXT,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}'
);

COMMENT ON TABLE customers IS 'Slutkunder som äger båtar och anlitar marinmekaniker.nu';

-- ============================================================
-- 2. BOATS - Båtar
-- ============================================================

CREATE TABLE boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Båtinfo
  name TEXT, -- "Havsfrun", "Blåvingen"
  make TEXT, -- "Bayliner", "Yamaha"
  model TEXT,
  year INTEGER,
  length_feet DECIMAL(4,1), -- Båtens längd
  
  -- Motor
  engine_type TEXT CHECK (engine_type IN ('outboard', 'inboard', 'sterndrive', 'jet', 'electric')),
  engine_make TEXT, -- "Mercury", "Volvo Penta"
  engine_model TEXT,
  engine_year INTEGER,
  engine_hours INTEGER, -- Gångtimmar
  
  -- Identifiering
  registration_number TEXT,
  hull_id TEXT, -- HIN/CIN-nummer
  
  notes TEXT
);

COMMENT ON TABLE boats IS 'Båtar kopplade till kunder för service-historik';

-- ============================================================
-- 3. INBOX - Råa inkommande meddelanden (staging)
-- ============================================================

CREATE TABLE inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Rådata från webhook
  source TEXT NOT NULL CHECK (source IN ('website_form', 'email', 'telegram', 'phone', 'other')),
  raw_payload JSONB NOT NULL,
  
  -- Parsad kontaktinfo
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'spam', 'error')),
  error_message TEXT, -- Om status = 'error'
  processed_at TIMESTAMPTZ,
  
  -- Koppling efter konvertering
  lead_id UUID -- Sätts när inbox → lead
);

COMMENT ON TABLE inbox IS 'Staging area för råa meddelanden innan AI-processning';

-- ============================================================
-- 4. LEADS - Inkommande förfrågningar
-- ============================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Kontaktinfo
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Förfrågan
  subject TEXT,
  message TEXT,
  
  -- Källa
  source TEXT NOT NULL CHECK (source IN ('website_form', 'email', 'telegram', 'phone', 'referral', 'other')),
  source_id TEXT, -- t.ex. telegram chat_id eller email message_id
  inbox_id UUID REFERENCES inbox(id), -- Koppling till ursprunglig inbox
  
  -- AI-klassificering (från n8n/Gradient)
  ai_category TEXT CHECK (ai_category IN ('SERVICE', 'REPAIR', 'QUOTE', 'QUESTION', 'URGENT', 'SPAM')),
  ai_priority TEXT DEFAULT 'normal' CHECK (ai_priority IN ('urgent', 'high', 'normal', 'low')),
  ai_summary TEXT, -- AI-genererad sammanfattning
  ai_suggested_response TEXT, -- AI-förslag på svar
  ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_processed_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost', 'spam')),
  assigned_to TEXT, -- vem som hanterar
  
  -- Uppföljning
  follow_up_date DATE,
  last_contact_at TIMESTAMPTZ,
  
  -- Konvertering
  customer_id UUID REFERENCES customers(id), -- om konverterad till kund
  converted_at TIMESTAMPTZ,
  
  -- Metadata
  raw_payload JSONB -- original webhook data
);

COMMENT ON TABLE leads IS 'Alla inkommande ärenden innan de konverteras till kunder/jobb';

-- Lägg till FK från inbox till leads (efter leads skapats)
ALTER TABLE inbox ADD CONSTRAINT inbox_lead_fk FOREIGN KEY (lead_id) REFERENCES leads(id);

-- ============================================================
-- 5. JOBS - Arbetsorder
-- ============================================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Kopplingar
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES boats(id),
  lead_id UUID REFERENCES leads(id), -- origin lead
  
  -- Jobbinfo
  title TEXT NOT NULL,
  description TEXT,
  job_type TEXT CHECK (job_type IN ('service', 'repair', 'installation', 'inspection', 'winterization', 'launch')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'in_progress', 'waiting_parts', 
    'completed', 'invoiced', 'cancelled'
  )),
  
  -- Tider
  scheduled_date DATE,
  scheduled_time TEXT,
  estimated_duration_hours DECIMAL(4,1),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Ekonomi
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  hourly_rate DECIMAL(8,2) DEFAULT 850.00,
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  
  -- Plats
  location TEXT CHECK (location IN ('workshop', 'marina', 'customer_location', 'sea_trial')),
  location_details TEXT,
  
  -- Fakturering
  invoice_number TEXT,
  invoiced_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  notes TEXT,
  internal_notes TEXT -- Endast för Thomas
);

COMMENT ON TABLE jobs IS 'Faktiska jobb som ska utföras';

-- ============================================================
-- 6. JOB_ITEMS - Rader på arbetsorder
-- ============================================================

CREATE TABLE job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Typ
  item_type TEXT DEFAULT 'labor' CHECK (item_type IN ('labor', 'part', 'material', 'other')),
  
  -- Beskrivning
  description TEXT NOT NULL,
  part_number TEXT, -- För reservdelar
  
  -- Kvantitet och pris
  quantity DECIMAL(8,2) DEFAULT 1,
  unit TEXT DEFAULT 'st', -- 'st', 'tim', 'meter', 'liter'
  unit_price DECIMAL(10,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  total_price DECIMAL(10,2),
  
  -- Sortering
  sort_order INTEGER DEFAULT 0,
  
  notes TEXT
);

COMMENT ON TABLE job_items IS 'Rader på arbetsorder - timmar och reservdelar';

-- ============================================================
-- 7. ACTIVITY_LOG - Aktivitetslogg
-- ============================================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vad hände
  action TEXT NOT NULL,
  description TEXT,
  
  -- Kopplingar (valfria)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  inbox_id UUID REFERENCES inbox(id) ON DELETE SET NULL,
  
  -- Metadata
  actor TEXT NOT NULL DEFAULT 'system', -- 'system', 'n8n', 'user', 'ai', 'telegram'
  actor_id TEXT, -- user_id eller bot_id
  
  -- Extra data
  metadata JSONB,
  
  -- För snabb filtrering
  entity_type TEXT, -- 'customer', 'lead', 'job', 'inbox'
  entity_id UUID
);

COMMENT ON TABLE activity_log IS 'Spårar allt som händer i systemet för audit trail';

-- ============================================================
-- 8. MESSAGES - Kommunikationshistorik
-- ============================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Kopplingar
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  job_id UUID REFERENCES jobs(id),
  
  -- Meddelande
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram', 'sms', 'phone', 'website')),
  
  -- Innehåll
  subject TEXT,
  content TEXT,
  
  -- Avsändare/mottagare
  from_address TEXT, -- email/telefon
  to_address TEXT,
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'queued', 'sent', 'delivered', 'read', 'failed', 'bounced')),
  error_message TEXT,
  
  -- Timing
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Referenser
  external_id TEXT, -- telegram message_id, email id
  thread_id TEXT, -- för att gruppera konversationer
  reply_to_id UUID REFERENCES messages(id),
  
  metadata JSONB
);

COMMENT ON TABLE messages IS 'All kommunikation med kunder';

-- ============================================================
-- 9. SETTINGS - Systeminställningar
-- ============================================================

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

COMMENT ON TABLE settings IS 'Key-value store för systemkonfiguration';

-- Sätt in standardinställningar
INSERT INTO settings (key, value, description) VALUES
  ('business_name', '"Marinmekaniker Thomas Guldager"', 'Företagsnamn'),
  ('business_phone', '"076-855 99 31"', 'Telefonnummer'),
  ('business_email', '"info@marinmekaniker.nu"', 'E-postadress'),
  ('default_hourly_rate', '850', 'Timpris i SEK'),
  ('working_hours', '{"start": "08:00", "end": "17:00", "days": ["mon","tue","wed","thu","fri"]}', 'Arbetstider'),
  ('ai_enabled', 'true', 'AI-klassificering aktiverad'),
  ('ai_model', '"llama3.1-8b"', 'AI-modell för klassificering'),
  ('telegram_notifications', 'true', 'Skicka notiser via Telegram'),
  ('auto_respond_enabled', 'false', 'Automatiska svar aktiverat');

-- ============================================================
-- 10. INDEXES
-- ============================================================

-- Inbox
CREATE INDEX idx_inbox_status ON inbox(status);
CREATE INDEX idx_inbox_created ON inbox(created_at DESC);
CREATE INDEX idx_inbox_source ON inbox(source);

-- Leads
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_ai_category ON leads(ai_category);
CREATE INDEX idx_leads_ai_priority ON leads(ai_priority);
CREATE INDEX idx_leads_customer ON leads(customer_id);
CREATE INDEX idx_leads_follow_up ON leads(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name ON customers(name);

-- Boats
CREATE INDEX idx_boats_customer ON boats(customer_id);
CREATE INDEX idx_boats_registration ON boats(registration_number);

-- Jobs
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_boat ON jobs(boat_id);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_date);
CREATE INDEX idx_jobs_type ON jobs(job_type);

-- Job Items
CREATE INDEX idx_job_items_job ON job_items(job_id);
CREATE INDEX idx_job_items_type ON job_items(item_type);

-- Activity Log
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_action ON activity_log(action);
CREATE INDEX idx_activity_lead ON activity_log(lead_id);
CREATE INDEX idx_activity_customer ON activity_log(customer_id);
CREATE INDEX idx_activity_job ON activity_log(job_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);

-- Messages
CREATE INDEX idx_messages_customer ON messages(customer_id);
CREATE INDEX idx_messages_lead ON messages(lead_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_thread ON messages(thread_id);

-- ============================================================
-- 11. TRIGGERS - Auto-uppdatera updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Settings updated_at
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_settings_timestamp();

-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Aktivera RLS på alla tabeller
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CUSTOMERS POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- BOATS POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON boats
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON boats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert" ON boats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update" ON boats
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- INBOX POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON inbox
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON inbox
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- LEADS POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON leads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert" ON leads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update" ON leads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- JOBS POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON jobs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert" ON jobs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update" ON jobs
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- JOB_ITEMS POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON job_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON job_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert" ON job_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update" ON job_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete" ON job_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- ACTIVITY_LOG POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON activity_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON activity_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Activity log är append-only för användare
CREATE POLICY "Authenticated insert" ON activity_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- MESSAGES POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert" ON messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update" ON messages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- SETTINGS POLICIES
-- ============================================================

CREATE POLICY "Service role full access" ON settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Endast service role kan ändra settings
-- (eller lägg till admin-roll om du vill)

-- ============================================================
-- 13. HJÄLPFUNKTIONER
-- ============================================================

-- Funktion för att logga aktivitet
CREATE OR REPLACE FUNCTION log_activity(
  p_action TEXT,
  p_description TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_lead_id UUID DEFAULT NULL,
  p_job_id UUID DEFAULT NULL,
  p_actor TEXT DEFAULT 'system',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO activity_log (action, description, customer_id, lead_id, job_id, actor, metadata)
  VALUES (p_action, p_description, p_customer_id, p_lead_id, p_job_id, p_actor, p_metadata)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion för att hämta setting
CREATE OR REPLACE FUNCTION get_setting(p_key TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN (SELECT value FROM settings WHERE key = p_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion för att sätta setting
CREATE OR REPLACE FUNCTION set_setting(p_key TEXT, p_value JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO settings (key, value)
  VALUES (p_key, p_value)
  ON CONFLICT (key) DO UPDATE SET value = p_value, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 14. VIEWS (för dashboard)
-- ============================================================

-- Aktiva leads med prioritet
CREATE OR REPLACE VIEW active_leads AS
SELECT 
  l.*,
  c.name as customer_name
FROM leads l
LEFT JOIN customers c ON l.customer_id = c.id
WHERE l.status NOT IN ('won', 'lost', 'spam')
ORDER BY 
  CASE l.ai_priority 
    WHEN 'urgent' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'normal' THEN 3 
    WHEN 'low' THEN 4 
  END,
  l.created_at DESC;

-- Kommande jobb
CREATE OR REPLACE VIEW upcoming_jobs AS
SELECT 
  j.*,
  c.name as customer_name,
  c.phone as customer_phone,
  b.name as boat_name,
  b.make as boat_make,
  b.model as boat_model
FROM jobs j
JOIN customers c ON j.customer_id = c.id
LEFT JOIN boats b ON j.boat_id = b.id
WHERE j.status IN ('pending', 'scheduled')
  AND j.scheduled_date >= CURRENT_DATE
ORDER BY j.scheduled_date, j.scheduled_time;

-- Dashboard-statistik
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM leads WHERE status = 'new') as new_leads,
  (SELECT COUNT(*) FROM leads WHERE status = 'new' AND ai_priority IN ('urgent', 'high')) as urgent_leads,
  (SELECT COUNT(*) FROM jobs WHERE status = 'scheduled' AND scheduled_date = CURRENT_DATE) as todays_jobs,
  (SELECT COUNT(*) FROM jobs WHERE status = 'in_progress') as active_jobs,
  (SELECT COUNT(*) FROM jobs WHERE status = 'waiting_parts') as waiting_parts,
  (SELECT COUNT(*) FROM inbox WHERE status = 'pending') as unprocessed_inbox;

-- ============================================================
-- KLART!
-- ============================================================

-- Verifiera att allt skapades
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
