# Skyland CRM 2.0 - Supabase Database Schema

> **Datum:** 2026-01-13  
> **Projekt:** Skyland CRM för marinmekaniker.nu  
> **Status:** Implementerad

---

## 📋 Översikt

### Arkitektur

```
┌─────────────────────────────────────────────────────────┐
│                    SKYLAND CRM 2.0                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Telegram / Formulär / Mejl                            │
│              │                                          │
│              ▼                                          │
│   ┌─────────────────────────────────────┐              │
│   │            n8n                       │              │
│   │  • Webhook-mottagare                 │              │
│   │  • AI-klassificering (Gradient)      │              │
│   │  • Routing & affärslogik             │              │
│   │  • Skriver till Supabase             │              │
│   └─────────────────────────────────────┘              │
│              │                                          │
│              ▼                                          │
│   ┌─────────────────────────────────────┐              │
│   │         Supabase                     │              │
│   │  • Data (kunder, leads, aktiviteter) │              │
│   │  • Auth                              │              │
│   │  • Realtidsuppdateringar             │              │
│   └─────────────────────────────────────┘              │
│              │                                          │
│              ▼                                          │
│   ┌─────────────────────────────────────┐              │
│   │     React Dashboard                  │              │
│   │  (läser/skriver direkt till Supabase)│              │
│   └─────────────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Designprinciper

- **Ingen FastAPI-backend** – Supabase REST API + n8n hanterar allt
- **AI via Gradient** – Konsoliderad pipeline via DigitalOcean
- **Realtid** – Supabase Realtime för live-uppdateringar i dashboard
- **Row Level Security** – Säker access på databas-nivå

---

## 📊 Tabeller

### 1. `customers` – Kunder

Slutkunder som äger båtar och anlitar marinmekaniker.nu.

```sql
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
```

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `id` | UUID | Primärnyckel |
| `name` | TEXT | Kundens namn (obligatoriskt) |
| `email` | TEXT | E-postadress |
| `phone` | TEXT | Telefonnummer |
| `status` | TEXT | active, inactive, blocked |
| `source` | TEXT | Var kunden kom från |
| `tags` | TEXT[] | Array med taggar för filtrering |

---

### 2. `boats` – Båtar

Båtar kopplade till kunder. Viktig för service-historik.

```sql
CREATE TABLE boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Båtinfo
  name TEXT, -- "Havsfrun", "Blåvingen"
  make TEXT, -- "Bayliner", "Yamaha"
  model TEXT,
  year INTEGER,
  engine_type TEXT, -- 'outboard', 'inboard', 'sterndrive'
  engine_make TEXT, -- "Mercury", "Volvo Penta"
  engine_model TEXT,
  
  -- Identifiering
  registration_number TEXT,
  
  notes TEXT
);
```

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `customer_id` | UUID | FK till customers |
| `name` | TEXT | Båtens namn |
| `make` | TEXT | Tillverkare (Bayliner, etc.) |
| `engine_type` | TEXT | outboard, inboard, sterndrive |
| `engine_make` | TEXT | Motortillverkare (Mercury, Volvo Penta) |

---

### 3. `leads` – Inkommande förfrågningar

Alla inkommande ärenden innan de konverteras till kunder/jobb.

```sql
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
  source TEXT NOT NULL, -- 'website_form', 'email', 'telegram', 'phone'
  source_id TEXT, -- t.ex. telegram chat_id eller email message_id
  
  -- AI-klassificering (från n8n/Gradient)
  ai_category TEXT, -- 'SERVICE', 'REPAIR', 'QUOTE', 'QUESTION', 'SPAM'
  ai_priority TEXT DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
  ai_summary TEXT, -- AI-genererad sammanfattning
  ai_confidence DECIMAL(3,2), -- 0.00-1.00
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost', 'spam')),
  assigned_to TEXT, -- vem som hanterar
  
  -- Konvertering
  customer_id UUID REFERENCES customers(id), -- om konverterad till kund
  
  -- Metadata
  raw_payload JSONB -- original webhook data
);
```

#### AI-klassificering

| Kategori | Beskrivning |
|----------|-------------|
| `SERVICE` | Rutinservice, årlig översyn |
| `REPAIR` | Reparation, något är trasigt |
| `QUOTE` | Vill ha offert |
| `QUESTION` | Allmän fråga |
| `SPAM` | Skräp, ignorera |

#### Prioritet

| Prioritet | Trigger |
|-----------|---------|
| `urgent` | "Strandat", "läcker", "nödsituation" |
| `high` | "Snart", "denna vecka" |
| `normal` | Standard |
| `low` | "Någon gång", "planera" |

---

### 4. `jobs` – Arbetsorder

Faktiska jobb som ska utföras.

```sql
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
  job_type TEXT, -- 'service', 'repair', 'installation', 'inspection'
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'in_progress', 'waiting_parts', 
    'completed', 'invoiced', 'cancelled'
  )),
  
  -- Tider
  scheduled_date DATE,
  scheduled_time TEXT,
  completed_at TIMESTAMPTZ,
  
  -- Ekonomi
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),
  
  -- Plats
  location TEXT, -- 'workshop', 'marina', 'customer_location'
  location_details TEXT,
  
  notes TEXT
);
```

#### Jobbtyper

| Typ | Beskrivning |
|-----|-------------|
| `service` | Rutinservice, oljebyte, etc. |
| `repair` | Reparation av fel |
| `installation` | Montering av ny utrustning |
| `inspection` | Besiktning, statuscheck |

#### Statusflöde

```
pending → scheduled → in_progress → waiting_parts (optional) → completed → invoiced
                                 └→ cancelled
```

---

### 5. `activity_log` – Aktivitetslogg

Spårar allt som händer i systemet för audit trail.

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vad hände
  action TEXT NOT NULL, -- 'lead_created', 'status_changed', 'ai_classified', 'email_sent'
  description TEXT,
  
  -- Kopplingar (valfria)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  
  -- Metadata
  actor TEXT, -- 'system', 'n8n', 'user', 'ai'
  metadata JSONB -- extra data
);
```

#### Exempel på actions

| Action | Beskrivning |
|--------|-------------|
| `lead_created` | Ny lead via webhook |
| `lead_classified` | AI klassificerade lead |
| `status_changed` | Status ändrades |
| `email_sent` | E-post skickades |
| `telegram_received` | Telegram-meddelande mottaget |
| `job_completed` | Jobb markerat som klart |

---

### 6. `messages` – Kommunikationshistorik

All kommunikation med kunder.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Kopplingar
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  
  -- Meddelande
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL, -- 'email', 'telegram', 'sms', 'phone'
  subject TEXT,
  content TEXT,
  
  -- Status
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  
  -- Referenser
  external_id TEXT, -- telegram message_id, email id
  metadata JSONB
);
```

---

### 7. `settings` – Systeminställningar

Key-value store för konfiguration.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Exempel på settings

```json
{
  "business_name": "Marinmekaniker Thomas Guldager",
  "business_phone": "076-855 99 31",
  "default_hourly_rate": 850,
  "working_hours": { "start": "08:00", "end": "17:00" },
  "telegram_bot_token": "xxx",
  "ai_enabled": true
}
```

---

## 🔗 Relationsdiagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   customers  │──────▶│    boats     │       │    leads     │
│              │       │              │       │              │
│  • Kunder    │       │  • Båtar     │       │  • Förfrågn. │
│  • Kontakt   │       │  • Motorer   │       │  • AI-klass. │
└──────┬───────┘       └──────────────┘       └──────┬───────┘
       │                                              │
       │       ┌──────────────┐                       │
       └──────▶│     jobs     │◀──────────────────────┘
               │              │
               │  • Arbeten   │
               │  • Status    │
               │  • Ekonomi   │
               └──────┬───────┘
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ activity_  │ │  messages  │ │  settings  │
│    log     │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘
```

---

## 📁 Indexes

```sql
-- Snabb sökning på leads
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_ai_category ON leads(ai_category);

-- Snabb sökning på kunder
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_status ON customers(status);

-- Snabb sökning på jobb
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_date);

-- Aktivitetslogg
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_lead ON activity_log(lead_id);
CREATE INDEX idx_activity_customer ON activity_log(customer_id);

-- Meddelanden
CREATE INDEX idx_messages_customer ON messages(customer_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

---

## 🔐 Row Level Security (RLS)

```sql
-- Aktivera RLS på alla tabeller
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Service role har full access (för n8n)
CREATE POLICY "Service role full access" ON customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON jobs
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Authenticated users kan läsa allt
CREATE POLICY "Authenticated read" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read" ON leads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Authenticated users kan skapa/uppdatera
CREATE POLICY "Authenticated write" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');
```

---

## 🔄 Triggers

```sql
-- Auto-uppdatera updated_at
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
```

---

## 📦 Komplett SQL-fil

Kör detta i Supabase SQL Editor för att skapa alla tabeller:

```sql
-- Se separata filen: supabase_schema.sql
```

---

## 🚀 Nästa steg

1. **Skapa Supabase-projekt** (om inte redan gjort)
2. **Kör SQL-schemat** i Supabase Dashboard → SQL Editor
3. **Konfigurera RLS-policies** för säkerhet
4. **Sätt upp n8n-workflows** som skriver till Supabase
5. **Koppla React-dashboard** till Supabase

---

## 📞 Kontakt

För frågor om detta schema, kontakta projektansvarig.
