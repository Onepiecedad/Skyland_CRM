-- ============================================
-- SKYLAND CRM 2.0 - SUPABASE SCHEMA
-- För marinmekaniker.nu
-- 
-- Kör denna fil i Supabase Dashboard → SQL Editor
-- ============================================
-- ============================================
-- 1. KUNDER
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
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
    source TEXT,
    -- Anteckningar
    notes TEXT,
    -- Metadata
    tags TEXT [] DEFAULT '{}'
);
-- ============================================
-- 2. BÅTAR
-- ============================================
CREATE TABLE IF NOT EXISTS boats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Båtinfo
    name TEXT,
    make TEXT,
    model TEXT,
    year INTEGER,
    engine_type TEXT,
    engine_make TEXT,
    engine_model TEXT,
    -- Identifiering
    registration_number TEXT,
    notes TEXT
);
-- ============================================
-- 3. LEADS
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
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
    source TEXT NOT NULL,
    source_id TEXT,
    -- AI-klassificering
    ai_category TEXT,
    ai_priority TEXT DEFAULT 'normal',
    ai_summary TEXT,
    ai_confidence DECIMAL(3, 2),
    -- Status
    status TEXT DEFAULT 'new' CHECK (
        status IN (
            'new',
            'contacted',
            'quoted',
            'won',
            'lost',
            'spam'
        )
    ),
    assigned_to TEXT,
    -- Konvertering
    customer_id UUID REFERENCES customers(id),
    -- Metadata
    raw_payload JSONB
);
-- ============================================
-- 4. JOBB/ARBETSORDER
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Kopplingar
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    boat_id UUID REFERENCES boats(id),
    lead_id UUID REFERENCES leads(id),
    -- Jobbinfo
    title TEXT NOT NULL,
    description TEXT,
    job_type TEXT,
    -- Status
    status TEXT DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'scheduled',
            'in_progress',
            'waiting_parts',
            'completed',
            'invoiced',
            'cancelled'
        )
    ),
    -- Tider
    scheduled_date DATE,
    scheduled_time TEXT,
    completed_at TIMESTAMPTZ,
    -- Ekonomi
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    estimated_cost DECIMAL(10, 2),
    final_cost DECIMAL(10, 2),
    -- Plats
    location TEXT,
    location_details TEXT,
    notes TEXT
);
-- ============================================
-- 5. AKTIVITETSLOGG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Vad hände
    action TEXT NOT NULL,
    description TEXT,
    -- Kopplingar
    customer_id UUID REFERENCES customers(id) ON DELETE
    SET NULL,
        lead_id UUID REFERENCES leads(id) ON DELETE
    SET NULL,
        job_id UUID REFERENCES jobs(id) ON DELETE
    SET NULL,
        -- Metadata
        actor TEXT,
        metadata JSONB
);
-- ============================================
-- 6. MEDDELANDEN
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Kopplingar
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id),
    -- Meddelande
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    -- Status
    status TEXT DEFAULT 'sent',
    -- Referenser
    external_id TEXT,
    metadata JSONB
);
-- ============================================
-- 7. INSTÄLLNINGAR
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================
-- INDEXES
-- ============================================
-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_ai_category ON leads(ai_category);
-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_date);
-- Activity log
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_lead ON activity_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_customer ON activity_log(customer_id);
-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_customer ON messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
-- ============================================
-- TRIGGERS
-- ============================================
-- Auto-uppdatera updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE
UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at BEFORE
UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at BEFORE
UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Aktivera RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
-- Service role full access (för n8n)
DROP POLICY IF EXISTS "Service role full access customers" ON customers;
CREATE POLICY "Service role full access customers" ON customers FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access boats" ON boats;
CREATE POLICY "Service role full access boats" ON boats FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access leads" ON leads;
CREATE POLICY "Service role full access leads" ON leads FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access jobs" ON jobs;
CREATE POLICY "Service role full access jobs" ON jobs FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access activity_log" ON activity_log;
CREATE POLICY "Service role full access activity_log" ON activity_log FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access messages" ON messages;
CREATE POLICY "Service role full access messages" ON messages FOR ALL USING (true);
DROP POLICY IF EXISTS "Service role full access settings" ON settings;
CREATE POLICY "Service role full access settings" ON settings FOR ALL USING (true);
-- ============================================
-- DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (key, value)
VALUES (
        'business_name',
        '"Marinmekaniker Thomas Guldager"'
    ),
    ('business_phone', '"076-855 99 31"'),
    (
        'business_website',
        '"https://marinmekaniker.nu"'
    ),
    ('default_hourly_rate', '850'),
    ('ai_enabled', 'true') ON CONFLICT (key) DO NOTHING;
-- ============================================
-- DONE!
-- ============================================