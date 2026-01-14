# Automation Pipelines

## 🟢 Phase 1: Ingestion (Current)

### Web Form to Lead

1. **Trigger:** Webhook from `marinmekaniker.nu` forms.
2. **Action:** n8n `Form Handler` workflow.
3. **Step:** Create entry in `inbox` table.
4. **Step:** AI Classification (Urgency/Category).
5. **Step:** Create/Update `leads` table in Supabase.

## 🟡 Phase 2: Visualization (Next)

*No new pipelines. Focus is on React Dashboard reading existing Supabase data.*

## 🟠 Phase 3: Communication (Future)

### 1. Email Ingestion (IMAP)

1. **Trigger:** n8n Polls IMAP (Every 5 min).
2. **Logic:** Check for new emails in `INBOX`.
3. **Action:** Insert into `inbox` table (Supabase).
4. **Action:** Try to link to existing `customer` or `lead` via Email.
5. **Output:** Update `messages` table with `thread_id`.

### 2. Email Sending (SMTP)

1. **Trigger:** Database Webhook (Supabase) OR API Call from React.
2. **Action:** n8n `Send Email` workflow.
3. **Step:** Send via SMTP provider.
4. **Step:** Update `messages` status to 'sent'.

### 3. AI Reply Assistant

1. **Trigger:** New `inbox` item categorized as `QUESTION`.
2. **Action:** n8n sends content to LLM.
3. **Step:** Generate draft response based on context.
4. **Output:** Write draft to `ai_suggested_response` field in `leads` / `messages`.
