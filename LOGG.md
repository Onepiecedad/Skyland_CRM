# Utvecklingslogg

## 2026-01-14 - Fas 2: Auth & Dashboard Vyer

### Implementerat

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

* Frontend är nu kopplad "live" mot Supabase (Read-only förutom auth).
* Applikationen är redo för Fas 2b (Editering/Skapande av data).
