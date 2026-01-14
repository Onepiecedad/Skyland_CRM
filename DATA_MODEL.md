# Skyland CRM - Data Model

> **Version:** 2.0  
> **Backend:** Supabase (PostgreSQL)  
> **Status:** Phase 2 Ready

## 🏷 Core Entities

### 1. Customers (`customers`)

Represents the end client.

* `id`: UUID (PK)
* `email`: string (Unique identifier logic)
* `phone`: string (Normalized E.164)
* ... (standard fields)

### 2. Leads (`leads`)

Inquiries that are potentially new business.

* `id`: UUID (PK)
* `customer_id`: UUID (FK -> customers)
* `status`: new, contacted, won, lost

### 3. Messages (`messages`)

Communication history with threading support.

* `id`: UUID (PK)
* `customer_id`: UUID (FK -> customers, optional)
* `lead_id`: UUID (FK -> leads, optional)
* `job_id`: UUID (FK -> jobs, optional)
* **Threading & Mail Protocol:**
  * `thread_id`: string (Group conversations)
  * `in_reply_to`: string (References parent message ID)
  * `smtp_message_id`: string (Unique ID from mail server)
  * `imap_uid`: integer (UID from mail server)
    * `mailbox`: string (Default: 'INBOX', 'SENT', 'ARCHIVE')
    * **Constraint:** `UNIQUE(imap_uid, mailbox)` - *Prevents duplicate ingest per folder*
* `subject`: string
* `content`: text
* `direction`: 'inbound' | 'outbound'
* `channel`: 'email' | 'telegram' | 'sms'
* `timestamp`: timestamptz

### 4. Tasks (`tasks`) - *Planned*

Actionable items for Thomas. Supports polymorphic linking.

* `id`: UUID (PK)
* `description`: text
* `status`: 'pending' | 'done'
* `due_date`: date
* **Polymorphic Links (One or many set):**
  * `lead_id`: UUID (FK -> leads) - *Task related to closing a lead*
  * `job_id`: UUID (FK -> jobs) - *Task related to a specific job*
  * `customer_id`: UUID (FK -> customers) - *General reminder for a customer*
* `is_standalone`: boolean (If no foreign keys are set)

## 🔗 Relationships

* **Customers 1:N Boats**
* **Customers 1:N Leads**
* **Customers 1:N Jobs**
* **Customers 1:N Messages** (Directly or via Leads/Jobs)
* **Jobs 1:N JobItems**
* **Inbox 1:1 Lead** (Transient relation)
