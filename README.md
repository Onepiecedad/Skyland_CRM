# Skyland CRM

Ett modernt CRM-system anpassat för marinmekaniker, byggt för att hantera kunder, båtar, arbetsordrar och kommunikation effektivt.

## 🏗 Arkitektur

Projektet har migrerats från en FastAPI-backend till en serverless-arkitektur med **Supabase**.

* **Frontend:** React (Create React App), Tailwind CSS, Lucide Icons.
* **Databas & Backend:** Supabase (PostgreSQL, Auth, Realtime, API).
* **Automation & AI:** n8n (Webhooks, e-posthantering, AI-klassificering av leads).

## 🚀 Kom igång

### Förutsättningar

* Node.js (v18 eller senare)
* npm

### Installation

1. Klona repot:

    ```bash
    git clone https://github.com/Onepiecedad/Skyland_CRM.git
    cd Skyland_CRM
    ```

2. Installera frontend-beroenden:

    ```bash
    cd frontend
    npm install
    ```

3. Konfigurera miljövariabler:
    Skapa en fil `.env` i `frontend/`-mappen och lägg till dina Supabase-nycklar (finns i Supabase Dashboard):

    ```env
    REACT_APP_SUPABASE_URL=https://ditt-project-id.supabase.co
    REACT_APP_SUPABASE_ANON_KEY=din-anon-key
    ```

    *(Obs: `WDS_SOCKET_PORT=0` kan behövas lokalt för att undvika WebSocket-fel).*

4. Starta applikationen:

    ```bash
    npm start
    ```

    Appen öppnas på `http://localhost:3000`.

## 🗄 Databas (Supabase)

Databasstrukturen definieras i `skyland_crm_schema.sql`. Den innehåller tabeller för:

* `customers` - Kundregister
* `boats` - Båtar kopplade till kunder
* `leads` - Inkommande förfrågningar (AI-sorterade)
* `jobs` - Arbetsordrar
* `inbox` - Staging för inkommande meddelanden
* `activity_log` - Historik över händelser

En vy `customers_overview` används för att aggregera statistik till kundlitan.

## 🤖 Automation (n8n)

Systemet förlitar sig på n8n för backend-logik:

1. **Lead Scoring:** Tar emot data via webhook, kör AI-analys, sparar i Supabase.
2. **Notiser:** Skickar notiser (t.ex. Telegram) vid nya leads.
3. **E-post:** Syncar inkommande mail till `inbox`-tabellen.

## 📂 Projektstruktur

* `/frontend` - React-applikationen.
* `skyland_crm_schema.sql` - SQL-script för att sätta upp databasen.
* `SUPABASE_SCHEMA.md` - Dokumentation av databasmodellen.
* `/_archive` - Gammal kod (FastAPI backend, migreringsscript) som inte längre används.
