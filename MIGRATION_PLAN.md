# Migration Plan - Phase 1: Linking & Deduplication

## 🎯 Objective

Establish and execute a deterministic plan to link `inbox`, `leads`, and `customers` and deduplicate `customers` to ensure data integrity.

## ✅ Status: COMPLETED

* **Analysis Date:** 2026-01-14
* **Cleanup Executed:** 2026-01-14 (Removed ~30 test rows)
* **Linking Executed:** 2026-01-14 (9 Inbox links, 7 Lead links)
* **Dedup Status:** NOT REQUIRED (0 duplicates found)

## 📋 Rules & Logic (Reference)

### 1. Linking: Inbox → Lead

* **Target:** `inbox` rows where `lead_id` is NULL.
* **Rule A (Email + Time):** Match if `inbox.email` equals `leads.email` (case-insensitive) AND `inbox.created_at` is within ±72 hours.
* **Rule B (Phone):** Match if Normalized Phone matches (E.164, strip non-digits).
* **Action:** Update `inbox.lead_id` with `leads.id`.

### 2. Linking: Lead → Customer

* **Target:** `leads` rows where `customer_id` is NULL.
* **Rule A (Email):** Match if `LOWER(leads.email) = LOWER(customers.email)`.
* **Rule B (Phone):** Match if Normalized Phone matches.
* **Action:** Update `leads.customer_id` with `customers.id`.

### 3. Deduplication: Customers (No Action Needed)

* **Identification:** Group by `LOWER(email)` where count > 1.
* **Survivor Selection:** Most leads -> Oldest created_at -> Lowest ID.
* **Action:** Re-point FKs for Leads, Jobs, Boats, Messages to survivor. Delete non-survivors.

### 4. Phone Normalization Standard

* Strip `[^0-9]`.
* Replace leading `0046` with `46`.
* Replace leading `0` with `46`.

## ⚠️ Risks & Mitigation

* **Shared Email:** Assumed unique customer identity per email.
* **False Positive:** Time window logic deemed acceptable; low volume risk.
* **Data Loss for Dedup:** Backup recommended before any `dedup_fix.sql` execution (though not needed in this run).
