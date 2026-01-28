# 🎯 Handlingsplan: Smart Lead Routing med AI-klassificering

> **Skapad:** 2026-01-28  
> **Status:** Planerad  
> **Prioritet:** HÖG - Affärskritisk (missade tidskänsliga Offerta-leads)

---

## 📋 Sammanfattning

### Problemet

Mail från partner-portaler som Offerta.se kommer från generiska e-postadresser (`info@offerta.se`). Nuvarande system:

1. Matchar avsändar-email mot `customers`-tabellen
2. Hittar kundkortet "Offerta.se"
3. Kopplar mailet till det kundkortet
4. **Skapar ALDRIG en lead** eftersom avsändaren "redan är kund"

### Konsekvenser

- ❌ Tidskänsliga Offerta-förfrågningar missas
- ❌ Ingen notifiering på dashboard
- ❌ Ingen prioritering baserat på konkurrens ("6 företag kan svara")
- ❌ Kundinfo (namn, adress, beskrivning) extraheras inte

### Lösningen

AI-driven klassificering som:

1. ✅ Identifierar partner-portal-mail (Offerta, Byggleads, etc.)
2. ✅ Extraherar faktisk kundinformation från mail-innehåll
3. ✅ Skapar lead med korrekt namn, kontaktinfo, och beskrivning
4. ✅ Sätter prioritet baserat på tidskänslighet och konkurrens
5. ✅ Tilldelar relevant kategori (QUOTE, SERVICE, etc.)

---

## 🏗️ Arkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         n8n Workflow                             │
│  Email_IMAP_Ingest                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │  IMAP    │───▶│ Partner Portal  │───▶│ AI Classification │   │
│  │  Read    │    │ Detection       │    │ (OpenAI GPT-4o)   │   │
│  └──────────┘    └─────────────────┘    └──────────────────┘   │
│                           │                      │              │
│                           │ Normal email         │ Portal email │
│                           ▼                      ▼              │
│                  ┌─────────────────┐    ┌──────────────────┐   │
│                  │ Existing Logic  │    │ Extract Customer │   │
│                  │ (customer match)│    │ Info from Body   │   │
│                  └─────────────────┘    └──────────────────┘   │
│                           │                      │              │
│                           ▼                      ▼              │
│                  ┌─────────────────────────────────────────┐   │
│                  │           Supabase Database              │   │
│                  │  • messages (alla mail)                  │   │
│                  │  • leads (nya förfrågningar)             │   │
│                  │  • customers (matchade kunder)           │   │
│                  └─────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📅 Implementationsplan

### Fas 0: Akut åtgärd ✅ SLUTFÖRD
>
> Säkerställ att inga fler leads missas medan vi bygger den permanenta lösningen

| Steg | Uppgift | Status |
|------|---------|--------|
| 0.1 | Manuellt skapa lead för dagens Offerta-förfrågan (Id:51011) | ✅ |
| 0.2 | Soft-delete kundkortet "Offerta.se" temporärt | ✅ |
| 0.3 | Verifiera att nya Offerta-mail skapar leads | ✅ |
| 0.4 | Dokumentera workaround i LOGG.md | ✅ |

**Slutförd:** 2026-01-28 15:51  
**Utfört av:** Thomas + AI-agent

---

### Fas 1: Partner Portal Detection (2-3 timmar)
>
> Lägg till logik i n8n för att identifiera mail från partner-portaler

#### 1.1 Definiera partner-portaler

Skapa en lista över kända partner-portaler:

```javascript
const PARTNER_PORTALS = [
  {
    name: 'Offerta',
    fromEmails: ['info@offerta.se', 'noreply@offerta.se', 'notification@offerta.se'],
    subjectPatterns: [/\(Id:\d+\)/, /förfrågan/i],
    priority: 'HIGH',
    extractionRules: {
      // Regex för att extrahera kundinfo från Offerta-mail
      customerName: /Kontaktperson[:\s]+([^\n]+)/i,
      phone: /Telefon[:\s]+([0-9\s\-]+)/i,
      location: /(?:Var|Plats)[:\s]+([^\n]+)/i,
      description: /(?:Vad|Beskrivning)[:\s]+([^\n]+)/i,
      urgency: /(?:När)[:\s]+([^\n]+)/i,
      competition: /Antal företag som kan besvara[:\s]+(\d+)/i
    }
  },
  {
    name: 'Byggleads',
    fromEmails: ['noreply@byggleads.se'],
    subjectPatterns: [/ny förfrågan/i],
    priority: 'MEDIUM',
    extractionRules: { /* ... */ }
  }
  // Lägg till fler portaler efter behov
];
```

#### 1.2 Uppdatera n8n workflow

Lägg till en ny nod efter "Read Unseen Emails":

```javascript
// Node: "Detect Partner Portal"
const email = $input.first().json;
const fromEmail = email.from?.value?.[0]?.address?.toLowerCase() || '';
const subject = email.subject || '';

// Hitta matchande portal
const matchedPortal = PARTNER_PORTALS.find(portal => 
  portal.fromEmails.some(e => fromEmail.includes(e)) ||
  portal.subjectPatterns.some(p => p.test(subject))
);

return {
  ...email,
  isPartnerPortal: !!matchedPortal,
  portalInfo: matchedPortal || null
};
```

#### 1.3 Skapa branch i workflow

- **IF** `isPartnerPortal === true` → Gå till AI-klassificering
- **ELSE** → Fortsätt med befintlig logik (customer matching)

**Deliverables:**

- [ ] Partner portal configuration
- [ ] Detection node i n8n
- [ ] Branch logic implementerad
- [ ] Tester för Offerta-mail

---

### Fas 2: AI-driven Extraction (3-4 timmar)
>
> Använd OpenAI för att extrahera strukturerad kundinformation

#### 2.1 Skapa AI Extraction Node

Lägg till en OpenAI-nod i n8n för partner-portal-mail:

```javascript
// System prompt för AI-extraction
const systemPrompt = `Du är en expert på att extrahera kundinformation från förfrågningar. 
Analysera följande email från en partner-portal (${portalName}) och extrahera:

1. **customer_name**: Kundens fullständiga namn
2. **customer_email**: Kundens email (om tillgänglig)
3. **customer_phone**: Telefonnummer
4. **location**: Ort och postnummer
5. **property_type**: Typ av fastighet (villa, lägenhet, båt, etc.)
6. **job_description**: Kort sammanfattning av uppdraget
7. **urgency**: "urgent", "soon", eller "flexible"
8. **estimated_value**: Uppskattat värde om angivet
9. **competition_level**: Antal konkurrerande företag (om angivet)
10. **category**: En av [QUOTE, SERVICE, REPAIR, INQUIRY, BOOKING]
11. **priority**: "high", "medium", eller "low" baserat på:
    - HIGH: Snarast möjligt + få konkurrenter
    - MEDIUM: Inom 2 veckor ELLER många konkurrenter
    - LOW: Flexibelt timing

Svara ENDAST med ett JSON-objekt. Inga förklaringar.`;

// User message
const userMessage = `
Ämne: ${email.subject}

Innehåll:
${email.textBody || email.htmlBody}
`;
```

#### 2.2 Hantera AI-respons

```javascript
// Parse AI response
const aiResponse = JSON.parse($input.first().json.message.content);

// Validera och sätt defaults
const extractedData = {
  name: aiResponse.customer_name || 'Okänd kund',
  email: aiResponse.customer_email || null,
  phone: aiResponse.customer_phone || null,
  location: aiResponse.location || null,
  subject: aiResponse.job_description || email.subject,
  ai_summary: aiResponse.job_description,
  ai_category: aiResponse.category || 'INQUIRY',
  priority: aiResponse.priority || 'medium',
  urgency: aiResponse.urgency || 'flexible',
  competition_level: aiResponse.competition_level || null,
  estimated_value: aiResponse.estimated_value || null,
  source: portalName,
  source_id: extractOffertaId(email.subject) // t.ex. "51011"
};
```

#### 2.3 Skapa Lead med extraherad data

```javascript
// Insert into leads table
const leadData = {
  name: extractedData.name,
  email: extractedData.email,
  phone: extractedData.phone,
  subject: email.subject,
  ai_summary: extractedData.ai_summary,
  ai_category: extractedData.ai_category,
  priority: extractedData.priority,
  source: extractedData.source,
  source_id: extractedData.source_id,
  raw_data: JSON.stringify({
    location: extractedData.location,
    urgency: extractedData.urgency,
    competition: extractedData.competition_level,
    estimated_value: extractedData.estimated_value
  }),
  message_id: messageId, // Länka till original-meddelandet
  status: 'new',
  created_at: new Date().toISOString()
};
```

**Deliverables:**

- [ ] OpenAI integration i n8n
- [ ] System prompt optimerad för svenska förfrågningar
- [ ] JSON-parsing och validering
- [ ] Lead creation med alla extraherade fält
- [ ] Error handling för AI-fel

---

### Fas 3: Prioritering och Notifieringar (2 timmar)
>
> Säkerställ att tidskänsliga leads syns direkt

#### 3.1 Uppdatera leads-tabellen

Lägg till nya kolumner om de saknas:

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_id VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgency VARCHAR(20);

-- Index för snabbare queries
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
```

#### 3.2 Uppdatera Dashboard (Today.jsx)

Visa prioritet och källa i "Att svara på"-listan:

```jsx
// Sortera leads efter prioritet
const sortedLeads = useMemo(() => {
  return [...leads].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });
}, [leads]);

// Visa prioritet-badge
{lead.priority === 'high' && (
  <Badge variant="destructive" className="text-xs animate-pulse">
    ⚡ Brådskande
  </Badge>
)}

// Visa källa
{lead.source && (
  <Badge variant="outline" className="text-xs">
    {lead.source}
  </Badge>
)}
```

#### 3.3 Push-notifikationer för HIGH-priority

Utöka PWA service worker för att visa notifikationer:

```javascript
// I n8n: Skicka push notification för high-priority leads
if (extractedData.priority === 'high') {
  await sendPushNotification({
    title: `⚡ Ny brådskande förfrågan!`,
    body: `${extractedData.name} - ${extractedData.ai_summary}`,
    url: '/leads',
    tag: `lead-${leadId}`
  });
}
```

**Deliverables:**

- [ ] Databasschema uppdateringar
- [ ] Dashboard sorterar efter prioritet
- [ ] Visuell indikation för brådskande leads
- [ ] Push-notifikationer för high-priority

---

### Fas 4: Testning och Validering (1-2 timmar)

#### 4.1 Testa med verkliga Offerta-mail

1. Skicka ett test-mail som ser ut som Offerta-format
2. Verifiera att:
   - Mail identifieras som partner-portal
   - AI extraherar korrekt information
   - Lead skapas med rätt data
   - Prioritet sätts korrekt
   - Dyker upp på dashboard

#### 4.2 Edge cases att testa

- [ ] Mail utan telefonnummer
- [ ] Mail med ofullständig adress
- [ ] Mail med special-tecken (å, ä, ö)
- [ ] Mail med HTML-formatering
- [ ] Flera förfrågningar samma dag
- [ ] Dubbletter (samma source_id)

#### 4.3 Dokumentera i LOGG.md

```markdown
## 2026-01-XX: Smart Lead Routing implementerat

### Ändringar
- n8n workflow uppdaterat med partner-portal detection
- AI-klassificering för Offerta-mail
- Prioritetsbaserad sortering på dashboard
- Push-notifikationer för brådskande förfrågningar

### Testade scenarier
- ✅ Offerta-mail skapar lead korrekt
- ✅ Kundinfo extraheras från mail-body
- ✅ High-priority leads visas överst
```

---

## 📊 Success Metrics

| Mätetal | Före | Mål | Mäts via |
|---------|------|-----|----------|
| Missade Offerta-leads | ~100% | 0% | Manual audit |
| Tid till första respons | >24h | <2h | Lead timestamps |
| Korrekt extraherad kundinfo | 0% | >90% | Manual review |
| Prioritetsklassificering | N/A | >85% accuracy | Sampling |

---

## ⚠️ Risker och Mitigering

| Risk | Sannolikhet | Påverkan | Mitigering |
|------|-------------|----------|------------|
| OpenAI API nere | Låg | Hög | Fallback till regex-extraction |
| Fel format på Offerta-mail | Medium | Medium | Uppdatera prompts/regler |
| AI extraherar fel data | Medium | Hög | Manuell granskning första veckan |
| Dubblerade leads | Låg | Medium | source_id deduplication |

---

## 💰 Kostnadskalkyl

| Resurs | Kostnad/månad |
|--------|---------------|
| OpenAI API (GPT-4o) | ~$5-10 (vid 100-200 mail) |
| n8n (redan inkluderat) | $0 |
| Utvecklingstid | ~8-12 timmar |

**ROI:** Ett enda vunnet Offerta-jobb (15 000 kr) betalar för 6+ månaders API-kostnader.

---

## 📝 Nästa steg

1. **IDAG:** Genomför Fas 0 (akut åtgärd)
2. **Denna vecka:** Implementera Fas 1-2
3. **Nästa vecka:** Fas 3-4 + go-live

---

## 🔗 Relaterade dokument

- [LOGG.md](../LOGG.md) - Utvecklingslogg
- [n8n workflow](https://n8n.skylandai.se/workflow/bzWAZy9HzFu2k-IrE7Thp) - Email_IMAP_Ingest
- [AI Assistant dokumentation](../frontend/src/components/AiAssistant.jsx)

---

*Senast uppdaterad: 2026-01-28 av AI-assistenten*
