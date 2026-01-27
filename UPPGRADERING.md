# 🚀 Uppgraderingsplan: Skyland CRM

> **Mål:** Göra meddelandehanteringen så användarvänlig att Thomas slutar använda sin vanliga mailklient och övergår helt till CRM:et.
>
> **Design-filosofi:** Apple-kvalitet – rent, minimalistiskt, intuitivt. Varje element ska ha ett syfte.

---

## 📊 Nuläge

### Vad som fungerar ✅

- Email-import via n8n (inkommande mail hämtas automatiskt)
- Resend-integration för utgående mail (ny, deployad)
- AI-assistent med tillgång till leads, kunder, jobb, meddelanden
- Grundläggande meddelandevisning med sök, filter, sortering

### Vad som behöver förbättras ❌

- Listvy: Visar dubbel information ("Tradit → Tradit")
- Meddelandetext: Rå HTML/citat-historik visas, svårläst
- Ingen modal: Expandering inline istället för ren popup
- AI begränsad: Har bara `body_preview`, inte fullständig text
- Ingen klickbar koppling: Kan inte gå direkt till kundkort

---

## 🎯 Fas 1: Ren Meddelandevy (Apple-stil)

**Tiduppskattning:** 2-3 timmar  
**Prioritet:** 🔴 KRITISK  
**Påverkan:** Omedelbar förbättring av daglig användning

### 1.1 Omdesignad Listvy

**Nuvarande:**

```
[Icon] Tradit ● 27 jan, 14:00 → Tradit
┌─────────────────────────────────┐
│ Ekonomiska händelser för...    │
└─────────────────────────────────┘
↩ Svara  🗑
```

**Ny design:**

```
┌────────────────────────────────────────────────────┐
│ ● Lars Johansson                        27 jan    │
│   Re: Ang Johnson 30 hk                           │
│   Hej, har du möjlighet att ringa...             │
└────────────────────────────────────────────────────┘
```

**Ändringar:**

- [ ] Ta bort chattbubbla-design → Ren listad rad
- [ ] Visa: **Avsändare (klickbar)** · _Ämne_ · Förhandsvisning
- [ ] Datum högerjusterat
- [ ] Oläst = Blå prick + fet text
- [ ] Hover-effekt med subtil bakgrund
- [ ] Klick → Öppna modal (inte expandera inline)

**Filer att ändra:**

- `frontend/src/pages/Messages.jsx`

### 1.2 Klickbar Avsändare → Kundkort

**Funktionalitet:**

- Alla avsändarnamn är klickbara
- Om kopplad till kund: Navigera till `/kund/{id}`
- Om inte kopplad: Visa popup "Skapa ny kund?"

**Ändringar:**

- [ ] Lägg till `Link` på avsändarnamn
- [ ] Fallback för okopplade meddelanden
- [ ] Visuell indikering (understruken vid hover)

### 1.3 Modal för Meddelandeläsning

**Design:**

```
┌─────────────────────────────────────────────────────┐
│                                              ✕     │
│  👤 Lars Johansson                                  │
│  📧 lasseman3@gmail.com                             │
│  📅 25 januari 2026, 13:04                          │
│                                                    │
│  ───────────────────────────────────────────────   │
│  Re: Re: Re: Ang Johnson 30 hk                      │
│  ───────────────────────────────────────────────   │
│                                                    │
│  Hej, har du möjlighet att ringa mej imorgon       │
│  efter lunch kan vi prata ihop oss.                │
│  0734-472034.                                      │
│                                                    │
│  Och det bästa kanske är om du har möjlighet       │
│  komma och hämta motorn? Den står på ett enkelt    │
│  trästativ idag.                                   │
│                                                    │
│  Mvh Lars Johansson                                │
│                                                    │
│  ▼ Visa tidigare meddelanden (3 st)                │
│                                                    │
│  ───────────────────────────────────────────────   │
│  [👤 Visa kundkort]  [📎 Bifoga jobb]  [↩ Svara]  [🗑]│
└─────────────────────────────────────────────────────┘
```

**Komponenter:**

- [ ] Skapa `MessageModal.jsx`
- [ ] Header med avsändarinfo
- [ ] Renskriven meddelandetext
- [ ] Kollapsbar historik
- [ ] Action-knappar i footer

### 1.4 Smart Textrensning

**Problem:** Email-historik med citat visas

**Lösning:** Förbättra `cleanEmailBody()` för att:

1. **Identifiera och klippa vid:**
   - "Den tors 22 jan. 2026 09:56 Lars Johansson <email> skrev:"
   - "On Mon, Jan 6, 2024..."
   - "> " citerade rader
   - "Skickat från min iPhone"

2. **Behålla:**
   - Exakt originaltext
   - Styckeindelning
   - Mvh/Hälsningar

3. **Ta bort:**
   - HTML/CSS-rester
   - Specialtecken/mojibake
   - Tomma rader i följd

**Filer att ändra:**

- `frontend/src/pages/Messages.jsx` (utilities)

---

## 🎯 Fas 2: Konversationstrådar

**Tiduppskattning:** 2-4 timmar  
**Prioritet:** 🟡 HÖG  
**Påverkan:** Bättre översikt av kundkommunikation

### 2.1 Gruppera efter Tråd

**Logik:**

- Matcha på `Re:` i ämne → samma tråd
- Matcha på samma kund + liknande ämne
- Visa som: "3 meddelanden i tråden"

### 2.2 Trådvy i Modal

**Design:**

```
Senaste meddelandet överst
    ↓
────────────────────
Tidigare (klicka för att visa)
    │
    ├─ 22 jan: Lars svarade...
    ├─ 22 jan: Du skrev...
    └─ 21 jan: Lars initierade...
```

### 2.3 Databasoptimering

**Ny kolumn (optional):**

```sql
ALTER TABLE messages ADD COLUMN thread_id UUID;
```

---

## 🎯 Fas 3: AI-assistenten uppgraderad

**Tiduppskattning:** 2-3 timmar  
**Prioritet:** 🟡 HÖG  
**Påverkan:** Thomas kan ställa frågor om all kundkommunikation

### 3.1 Fullständig Meddelandedata

**Nuvarande (begränsat):**

```javascript
.select('id, subject, from_email, from_name, to_email, direction, received_at, body_preview, customer_id')
```

**Uppgraderat:**

```javascript
.select(`
  id, subject, from_email, from_name, to_email, 
  direction, received_at, status,
  body_preview, body_full,
  customer:customers!messages_customer_id_fkey (id, name, email, phone)
`)
```

**Filer att ändra:**

- `frontend/src/components/AiAssistant.jsx`

### 3.2 Dynamisk Sökning

**Nuvarande:** AI får cached data vid öppning

**Uppgraderat:** AI kan söka i realtid:

```
User: "Vad skrev Lars Johansson senast?"
AI: *söker i databasen* → "Lars skrev den 25 jan om att hämta motorn..."
```

**Implementation:**

- Edge Function för semantisk sökning
- Eller: Skicka användarfråga + kontext till GPT-4o

### 3.3 Kontextmedvetenhet

**Funktionalitet:**

- AI vet vilken sida användaren är på
- Auto-inkludera relevant data

**Exempel:**

```
// Om på /meddelanden
"Du tittar just nu på meddelandesidan. Det finns 5 olästa mail."

// Om på /kund/123
"Du tittar på Jan Gustafsson. Han har 3 öppna jobb."
```

### 3.4 Generera Svar direkt

**Flöde:**

1. User: "Skriv ett svar till Lars om att jag kan komma på fredag"
2. AI genererar svar
3. Knapp: "Använd som svar" → Öppnar svars-modal med text ifylld

---

## 🎯 Fas 4: Svarsfunktionen Förbättrad

**Tiduppskattning:** 2-3 timmar  
**Prioritet:** 🟡 MEDIUM  
**Påverkan:** Snabbare och smartare svar

### 4.1 Fler Svarsmallar

**Kategorier:**

- 📋 Offert/Prisförfrågan
- 🔧 Service & Underhåll
- 📅 Bokningar & Tider
- ✅ Bekräftelser
- ℹ️ Information

**Implementation:**

- Flytta mallar till databas (kan redigeras)
- Taggning för snabb filtrering

### 4.2 AI-genererade Svar

**Knapp i svars-modal:** `🤖 Föreslå svar`

**Flöde:**

1. Klicka "Föreslå svar"
2. AI analyserar originalmeddelandet
3. Genererar professionellt svar
4. Användaren kan redigera innan skicka

### 4.3 Bilagestöd

**Funktionalitet:**

- Ladda upp filer (PDF, bilder)
- Bifoga till utgående mail
- Kräver Resend-uppgradering

### 4.4 Leveransstatus

**Visa i UI:**

- ⏳ Skickas...
- ✅ Levererat
- 👁️ Öppnat (om Resend-tracking aktiverat)
- ❌ Misslyckades

---

## 🎯 Fas 5: UX-förbättringar

**Tiduppskattning:** 3-4 timmar  
**Prioritet:** 🟢 MEDIUM  
**Påverkan:** Polerad upplevelse

### 5.1 Realtidsuppdateringar

**Implementation:**

```javascript
// Supabase Realtime
supabase
  .channel('messages')
  .on('INSERT', handleNewMessage)
  .subscribe();
```

**Resultat:** Nya mail visas direkt utan refresh

### 5.2 Push-notifikationer

**Kräver:**

- Service Worker
- Notification API permission
- Backend-trigger vid ny mail

### 5.3 Tangentbordsgenvägar

| Genväg | Funktion |
|--------|----------|
| `J` | Nästa meddelande |
| `K` | Föregående meddelande |
| `O` / `Enter` | Öppna meddelande |
| `R` | Svara |
| `E` | Arkivera |
| `/` | Fokusera sökfält |
| `Esc` | Stäng modal |

### 5.4 Taggar & Kategorier

**Funktionalitet:**

- Märk meddelanden: "Offert", "Brådskande", "Väntar svar"
- Filter på taggar
- Färgkodning

### 5.5 Påminnelser

**UI:**

```
[⏰ Påminn mig] → 
  - Om 1 timme
  - Imorgon morgon
  - Om 2 dagar
  - Välj datum...
```

**Lagring:** Ny tabell `reminders` eller kolumn i `messages`

---

## 🎯 Fas 6: Kundkoppling & Auto-matchning

**Tiduppskattning:** 2-3 timmar  
**Prioritet:** 🟢 MEDIUM  
**Påverkan:** Mindre manuellt arbete

### 6.1 Auto-matchning av Mail

**Vid ny mail:**

1. Extrahera avsändar-email
2. Sök i `customers.email`
3. Om match: Koppla automatiskt
4. Om ingen: Föreslå "Skapa ny kund?"

### 6.2 Lead → Kund Konvertering

**Knapp på lead-kort:** `[Konvertera till kund]`

**Flöde:**

1. Klicka
2. Förifylla formulär med lead-data
3. Bekräfta
4. Lead markeras som konverterad
5. Alla relaterade meddelanden kopplas om

### 6.3 Meddelandehistorik på Kundkort

**Visa på kundkort:**

```
📧 Senaste kommunikation
─────────────────────────
25 jan - Re: Ang Johnson 30 hk
22 jan - Re: Ang Johnson 30 hk  
12 jan - Tack på förhand...
[Visa alla 8 meddelanden →]
```

---

## 📅 Implementeringsordning

| Fas | Prioritet | Tidsuppskattning | Beroenden |
|-----|-----------|------------------|-----------|
| **Fas 1** | 🔴 Kritisk | 2-3h | Ingen |
| **Fas 2** | 🟡 Hög | 2-4h | Fas 1 |
| **Fas 3** | 🟡 Hög | 2-3h | Ingen |
| **Fas 4** | 🟡 Medium | 2-3h | Fas 1 |
| **Fas 5** | 🟢 Medium | 3-4h | Fas 1, 4 |
| **Fas 6** | 🟢 Medium | 2-3h | Fas 1 |

---

## ✅ Checklistor per Fas

### Fas 1 Checklista

- [ ] Ny listdesign i `Messages.jsx`
- [ ] Klickbara avsändarnamn med Link
- [ ] Skapa `MessageModal.jsx`
- [ ] Förbättra `cleanEmailBody()`
- [ ] Testa på mobil och desktop
- [ ] Deploya och verifiera

### Fas 2 Checklista

- [ ] Trådgrupperingslogik
- [ ] Trådvy i modal
- [ ] (Optional) Databas-kolumn för thread_id

### Fas 3 Checklista

- [ ] Uppgradera AI-kontext med body_full
- [ ] Lägg till kunddata i meddelandekontext
- [ ] Implementera dynamisk sökning
- [ ] Lägg till sidkontext

### Fas 4 Checklista

- [ ] Flytta mallar till databas
- [ ] Lägg till AI-svarsgenerering
- [ ] (Optional) Bilagestöd
- [ ] Leveransstatusvisning

### Fas 5 Checklista

- [ ] Implementera Supabase Realtime
- [ ] Lägg till tangentbordsgenvägar
- [ ] Skapa tagg-system
- [ ] Påminnelsefunktion

### Fas 6 Checklista

- [ ] Auto-matchningslogik vid mail-import
- [ ] Lead-konverteringsflöde
- [ ] Meddelandehistorik på kundkort

---

## 📝 Anteckningar

**Skapad:** 2026-01-27  
**Senast uppdaterad:** 2026-01-27  
**Status:** Planering klar, redo för implementation

---

> 💡 **Nästa steg:** Starta Fas 1 - Ren Meddelandevy
