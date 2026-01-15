# Utvecklingslogg

## 2026-01-15 - Systemverifiering innan vidareutveckling

### Kontrollerad

* **Databas (Supabase):**
  * ✅ Tabellen `inbox` finns och har data (43 rader)
  * ✅ Tabellen `messages` finns och har data (2 rader från IMAP-ingest)
  * ✅ Tabellen `customers` finns och har data (34 kunder)
  * ✅ Tabellen `leads` finns och har data (42 leads)
  * ✅ Kolumner för länkning (`customer_id`, `lead_id`) verifierade

* **Frontend:**
  * ✅ Appen bygger utan fel (`npm run build`)
  * ✅ Login fungerar (Supabase auth med email/password)
  * ✅ Kundlistan laddar och visar kunder korrekt
  * ✅ Kundkortet öppnas och visar kontakt, båtar, ärenden
  * ✅ Tidslinjen renderas med formulärhistorik

* **n8n Workflows:**
  * ⚠️ Kunde ej verifiera direkt (kräver dashboard-åtkomst)
  * ✅ Indikation: Färsk data i `messages`-tabellen från IMAP (2026-01-15)

* **Filstruktur:**
  * ✅ `frontend/src/components/Timeline.jsx` finns (71 rader)
  * ✅ `frontend/src/pages/CustomerDetail.jsx` finns (241 rader)
  * ✅ `frontend/src/lib/supabase.js` finns och exporterar klient

### Status

* 🟢 **Systemet är stabilt och redo för vidareutveckling**
* Alla kärnfunktioner verifierade att fungera korrekt

### User Story 3.6: Tidslinje visar formulär och mejl

* **Implementerat:**
  * `Timeline.jsx` omskriven för att själv hämta data med `customerId` som prop
  * Hämtar e-post från `messages`-tabellen (filtrerat på `channel='email'`)
  * Hämtar formulär från `inbox`-tabellen (via `leads.customer_id`)
  * Spam döljs (`status != 'spam'`)
  * Unifierad shape med `type`, `title`, `from_label`, `preview`, `ts`
  * Sorterat fallande på `ts` (senast överst)
  * "Mejl" / "Formulär" label visas tydligt per rad
  * Loading-state, error-state och empty-state hanteras
  * Deduplicering på `id` för att undvika dubbletter i UI
  
* **Filer ändrade:**
  * `frontend/src/components/Timeline.jsx` - Ny implementation
  * `frontend/src/pages/CustomerDetail.jsx` - Skickar `customerId` prop, tog bort gammal hämtningslogik

---

## 2026-01-14 - Fas 2: Auth, Dashboard & Deployment

### Implementerat

* **Deployment:**
  * Byggt och deployat frontend till Netlify.
  * Verifierat att applikationen fungerar live på `marinmekaniker.netlify.app`.

* **Autentisering:**
  * Satt upp `Login.jsx` med Supabase Email/Password auth.
  * Skapat `ProtectedRoute` för att skydda routes.
  * Implementerat `logout`-funktion i Headern.
  * Verifierat RLS (Row Level Security) i databasen.

* **Vyer:**
  * `Today.jsx`: Ny startsida som visar "Att svara på" (Leads), "Kommande jobb" och KPI-statistik.
  * `CustomerList.jsx`: Tabellvy över alla kunder med sök/filtrering.
  * `CustomerDetail.jsx`: Detaljvy för kund med:
    * Kontaktinfo
    * Båtar (motor, regnr)
    * Ärenden (Leads-historik)
    * Tidslinje (Inbox-historik)

* **Komponenter:**
  * `Timeline.jsx`: Återanvändbar komponent för att visa händelser/kommunikation i ordning.
  * `Header.jsx`: Uppdaterad navigation.

### Fixar

* Löst ESLint-varningar gällande imports i `App.jsx`.
* Städat bort oanvänd kod i `CustomerDetail` och `CustomerList`.
* Lagat inloggningsproblem relaterat till `email_confirmed_at`.

### Status

* Applikationen körs live i produktion.
* Frontend är kopplad mot Supabase (Read-only förutom auth).
* Redo för Fas 2b: Editering och skapande av data (Actions).
