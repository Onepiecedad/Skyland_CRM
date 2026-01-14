# Product Backlog

## 🟢 Phase 2: CRM Visualization (Current Focus)

*Goal: Give Thomas a clear view of his business data using the new Supabase backend.*

* **[FE-001] Dashboard Overview** (Implemented as Today View)
  * Create a dashboard showing KPIs: Active Jobs, Unread Messages, New Leads.
  * Connect "Recent Activity" list to `activity_log` table.
* **[FE-002] Customer List & Detail View** (Implemented)
  * Implement sortable/filterable list of `customers`.
  * Create "Customer Card" showing Boat info, Active Jobs, and Contact details.
* **[FE-003] Lead Pipeline Board**
  * Kanban or List view for `leads` grouped by Status (New, Contacted, Won).
  * Quick actions: "Convert to Job", "Reject".
* **[FE-004] Job Management UI**
  * List view of active jobs.
  * Detail view allowing editing of status and adding `job_items` (parts/hours).

## 🟡 Phase 3: Communication Module

*Goal: Enable full email communication from within the CRM.*

* **[BE-001] n8n IMAP Sync**
  * Configure n8n to poll email inbox and populate `messages` table.
  * Handle attachments (store in Supabase Storage).
* **[FE-005] Unified Inbox UI**
  * Chat-like interface for email threads.
  * "Reply" composer in the UI.
* **[AI-001] Smart Reply Suggestions**
  * Show AI-generated draft responses next to the Reply box.

## 🟠 Phase 4: Operational Efficiency

*Goal: Automate scheduling and parts ordering.*

* **[FE-006] Tasks & Calendar**
  * Implement `tasks` UI.
  * Calendar view for `scheduled_date` on Jobs.
* **[BE-002] Telegram Bot Integration**
  * Send "Morning Briefing" with today's schedule to Thomas via Telegram.
  * Allow quick-reply status updates via Telegram commands.
