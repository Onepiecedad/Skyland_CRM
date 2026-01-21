# AI Email Intelligence - Konfigurationsguide

## Översikt

Vi har skapat en AI Edge Function som analyserar inkommande e-post och:

1. **Klassificerar** om det är en relevant affärsförfrågan
2. **Filtrerar bort** jobbansökningar, nyhetsbrev, spam
3. **Extraherar** båtmodell, motor, service-typ från relevanta meddelanden
4. **Prioriterar** baserat på innehåll (akut vs normal)

## Steg 1: Konfigurera OpenAI API-nyckel

1. Gå till Supabase Dashboard: <https://supabase.com/dashboard/project/aclcpanlrhnyszivvmdy>
2. Klicka på **Edge Functions** i vänstermenyn
3. Klicka på **analyze-email** funktionen
4. Gå till fliken **Secrets**
5. Lägg till en ny secret:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Din OpenAI API-nyckel (börjar med `sk-...`)

## Steg 2: Testa Edge Function

Testa att den fungerar:

```bash
curl -X POST https://aclcpanlrhnyszivvmdy.supabase.co/functions/v1/analyze-email \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Service av Mercury utombordare",
    "from_email": "kund@example.com",
    "from_name": "Anders Andersson", 
    "body": "Hej! Jag har en Mercury 90 hk 4-takt från 2018 som behöver årsservice. Finns det tid nästa vecka?"
  }'
```

Förväntat svar:

```json
{
  "category": "SERVICE",
  "priority": "medium",
  "summary": "Årsservice för Mercury 90 hk utombordare från 2018",
  "confidence": 0.95,
  "is_business_relevant": true,
  "extracted_data": {
    "engine_make": "Mercury",
    "engine_model": "90 hk 4-takt",
    "engine_year": "2018",
    "service_type": "Årsservice"
  }
}
```

## Steg 3: Uppdatera n8n Workflow

I n8n, redigera **Email_IMAP_Ingest** workflow:

### Lägg till HTTP Request-nod efter "Insert Message"

1. Lägg till en **HTTP Request** nod
2. Konfigurera:
   - **Method**: POST
   - **URL**: `https://aclcpanlrhnyszivvmdy.supabase.co/functions/v1/analyze-email`
   - **Body Content Type**: JSON
   - **Body Parameters**:

     ```json
     {
       "subject": "{{ $json.subject }}",
       "from_email": "{{ $json.from_email }}",
       "from_name": "{{ $json.from_name }}",
       "body": "{{ $json.body_text }}"
     }
     ```

### Lägg till IF-nod för att filtrera irrelevanta

1. Lägg till en **IF** nod efter HTTP Request
2. Condition: `{{ $json.is_business_relevant }}` equals `true`

### Uppdatera Lead-skapande

1. I noden som skapar leads, lägg till:
   - `ai_category`: `{{ $json.category }}`
   - `ai_priority`: `{{ $json.priority }}`
   - `ai_summary`: `{{ $json.summary }}`
   - `ai_confidence`: `{{ $json.confidence }}`
   - `extracted_data`: `{{ JSON.stringify($json.extracted_data) }}`
   - `is_business_relevant`: `{{ $json.is_business_relevant }}`

## Kategorier som Edge Function returnerar

| Kategori | Skapa Lead? | Beskrivning |
|----------|-------------|-------------|
| QUOTE | ✅ Ja | Offertförfrågan |
| SERVICE | ✅ Ja | Servicebehov |
| QUESTION | ✅ Ja | Allmän fråga |
| FOLLOWUP | ✅ Ja | Uppföljning |
| SPAM | ❌ Nej | Spam/reklam |
| IRRELEVANT | ❌ Nej | Jobbansökan, nyhetsbrev, etc |

## Nästa steg

1. Frontend visar redan `ai_summary` på förfrågningslistan
2. Vi kan förbättra UI för att visa extraherad båt/motor-info
3. Automatisk uppdatering av kundkort med extraherad info
