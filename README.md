# Skyland CRM

Ett kundrelationshanteringssystem (CRM) byggt för att centralisera hantering av kunder, leads och inkommande kommunikation. Specifikt anpassat för **marinmekaniker.nu** – en svensk tjänst för båtreparationer och service.

## 🚀 Funktioner

### Dashboard

- Överblick över alla nyckeltal (kunder, leads, meddelanden)
- Senaste kundaktiviteter och leads
- Konverteringsstatistik

### Kundhantering

- Komplett kundregister med kontaktinformation
- Kundhistorik (tidslinje med alla händelser)
- Sök och filtrera kunder

### Lead-hantering

- Spåra potentiella affärsmöjligheter
- Prioritering med urgency-score
- Automatisk kategorisering av intent

### Inkorg

- Centraliserad inkorg för alla meddelanden
- Integration med webformulär från marinmekaniker.nu
- Automatisk länkning till kundprofiler

---

## 🛠️ Tech Stack

| Del | Teknologi |
|-----|-----------|
| **Frontend** | React, Tailwind CSS, React Router |
| **Backend** | Python, FastAPI, Uvicorn |
| **Databas** | PostgreSQL (Railway) |
| **UI-komponenter** | Radix UI, Lucide Icons |

---

## 📦 Installation

### Förutsättningar

- Node.js 18+
- Python 3.12+
- PostgreSQL (eller tillgång till Railway-databasen)

### 1. Klona repot

```bash
git clone https://github.com/Onepiecedad/Skyland_CRM.git
cd Skyland_CRM
```

### 2. Backend-installation

```bash
cd backend

# Skapa virtuell miljö med Python 3.12
python3.12 -m venv venv
source venv/bin/activate  # På Mac/Linux
# eller: venv\Scripts\activate  # På Windows

# Installera beroenden
pip install -r requirements.txt
```

### 3. Frontend-installation

```bash
cd frontend
npm install --legacy-peer-deps
```

---

## ▶️ Starta appen

### 1. Starta backend (port 8000)

```bash
cd backend
source venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### 2. Starta frontend (port 3000)

```bash
cd frontend
npm start
```

### 3. Öppna i webbläsaren

- **Frontend:** <http://localhost:3000>
- **Backend API:** <http://localhost:8000>
- **API-dokumentation:** <http://localhost:8000/docs>

---

## 🔧 Konfiguration

### Backend (.env)

Skapa filen `backend/.env` med följande innehåll:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
API_TOKEN="your_api_token"
CORS_ORIGINS="*,http://localhost:3000"
```

### Frontend (.env)

Skapa filen `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://127.0.0.1:8000
```

---

## 📚 API-endpoints

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| GET | `/api/customers/overview` | Hämta alla kunder med översikt |
| GET | `/api/customers/{id}` | Hämta enskild kund |
| GET | `/api/customers/{id}/thread` | Hämta kundens historik |
| POST | `/api/customers` | Skapa ny kund |
| PUT | `/api/customers/{id}` | Uppdatera kund |
| DELETE | `/api/customers/{id}` | Ta bort kund |
| GET | `/api/leads` | Hämta alla leads |
| POST | `/api/leads` | Skapa ny lead |
| PUT | `/api/leads/{id}` | Uppdatera lead |
| DELETE | `/api/leads/{id}` | Ta bort lead |
| GET | `/api/inbox` | Hämta alla meddelanden |
| PUT | `/api/inbox/{id}` | Uppdatera meddelande |
| DELETE | `/api/inbox/{id}` | Ta bort meddelande |

---

## 📁 Projektstruktur

```
Skyland_CRM/
├── backend/
│   ├── server.py          # FastAPI-server
│   ├── requirements.txt   # Python-beroenden
│   └── .env              # Miljövariabler
├── frontend/
│   ├── src/
│   │   ├── components/   # React-komponenter
│   │   ├── pages/        # Sidkomponenter
│   │   ├── lib/          # API-klient
│   │   └── App.js        # Huvudapp
│   ├── package.json
│   └── .env
└── README.md
```

---

## 🤝 Bidra

1. Forka repot
2. Skapa en feature-branch (`git checkout -b feature/amazing-feature`)
3. Committa dina ändringar (`git commit -m 'Add amazing feature'`)
4. Pusha till branchen (`git push origin feature/amazing-feature`)
5. Öppna en Pull Request

---

## 📄 Licens

Detta projekt är privat och tillhör Skyland/marinmekaniker.nu.
