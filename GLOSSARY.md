# Ordlista (Glossary)

Denna lista kopplar samman termer som Thomas (användaren) ser i gränssnittet med de tekniska termerna i systemet.

## Kärnobjekt

| Svensk Term | Teknisk Term | Beskrivning |
| :--- | :--- | :--- |
| **Kund** | `customer` | En person eller företag som köpt tjänster. Har historik. |
| **Ärende / Förfrågan** | `lead` | Ett inkommande intresse som ännu inte blivit ett jobb. |
| **Jobb / Arbetsorder** | `job` | Ett bekräftat uppdrag som ska utföras på en båt. |
| **Båt** | `boat` | Objektet som arbetet utförs på. |
| **Inkorg / Meddelande** | `inbox` / `message` | Kommunikation (email, formulär, SMS). |
| **Att svara på** | `lead` (status='new') | Leads som kräver åtgärd. |
| **Uppgift** | `task` | En kom-ihåg-lapp för Thomas (t.ex. "Beställ delar"). |

## Statusar & Flöden

| Svensk Term | Teknisk Motsvarighet |
| :--- | :--- |
| **Ny** | `status = 'new'` |
| **Pågående** | `status = 'in_progress'` |
| **Väntar på delar** | `status = 'waiting_parts'` |
| **Klar** | `status = 'completed'` |
| **Fakturerad** | `status = 'invoiced'` |
| **Akut** | `priority = 'urgent'` |
