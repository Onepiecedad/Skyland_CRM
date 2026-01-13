#!/usr/bin/env python3
"""
Migration script: Railway PostgreSQL → Supabase
Migrates customers, leads, and inbox data from the old schema to the new schema.
"""

import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment
load_dotenv()
if not os.getenv("SUPABASE_SERVICE_KEY"):
    load_dotenv("backend/.env")

# Configuration
RAILWAY_API = "http://localhost:8000"
RAILWAY_TOKEN = "skyland_dev_token_123"

# Supabase credentials - UPDATE THESE
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://aclcpanlrhnyszivvmdy.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")  # Use service role key for full access

def get_railway_data(endpoint: str) -> list:
    """Fetch data from Railway API"""
    headers = {"Authorization": f"Bearer {RAILWAY_TOKEN}"}
    response = requests.get(f"{RAILWAY_API}/api/{endpoint}", headers=headers)
    response.raise_for_status()
    return response.json()

def migrate_customers(supabase: Client, customers: list) -> dict:
    """Migrate customers and return mapping of old_id -> new_id"""
    print(f"\n📦 Migrating {len(customers)} customers...")
    id_mapping = {}
    
    for c in customers:
        # Transform to new schema
        new_customer = {
            "name": c.get("name") or "Unknown",
            "email": c.get("email"),
            "phone": c.get("phone"),
            "status": "active",
            "source": "website",
            "notes": None,
            "tags": []
        }
        
        try:
            result = supabase.table("customers").insert(new_customer).execute()
            if result.data:
                new_id = result.data[0]["id"]
                old_id = c.get("customer_id")
                id_mapping[str(old_id)] = new_id
                print(f"  ✓ {new_customer['name']}")
        except Exception as e:
            print(f"  ✗ Error migrating {new_customer['name']}: {e}")
    
    return id_mapping

def migrate_leads(supabase: Client, leads: list, customer_mapping: dict) -> dict:
    """Migrate leads and return mapping of old_id -> new_id"""
    print(f"\n📦 Migrating {len(leads)} leads...")
    id_mapping = {}
    
    # Map old status values to new
    status_map = {
        "new": "new",
        "open": "new",
        "contacted": "contacted",
        "qualified": "quoted",
        "converted": "won",
        "closed": "won",
        "lost": "lost"
    }
    
    # Map old intent/urgency to AI fields
    urgency_map = {
        "high": "high",
        "medium": "normal",
        "low": "low",
        "urgent": "urgent"
    }
    
    for lead in leads:
        # Get customer ID if linked
        old_customer_id = str(lead.get("customer_id")) if lead.get("customer_id") else None
        new_customer_id = customer_mapping.get(old_customer_id) if old_customer_id else None
        
        # Transform to new schema
        new_lead = {
            "name": lead.get("summary") or lead.get("description", "")[:100] or "Unknown",
            "email": None,  # Extract from customer if needed
            "phone": None,
            "subject": lead.get("intent"),
            "message": lead.get("description"),
            "source": lead.get("channel", "website_form") or "website_form",
            "source_id": lead.get("dedupe_key"),
            "ai_category": lead.get("intent", "SERVICE").upper() if lead.get("intent") else None,
            "ai_priority": urgency_map.get(lead.get("urgency"), "normal"),
            "ai_summary": lead.get("summary"),
            "ai_confidence": (lead.get("urgency_score") or 5) / 10.0,  # Convert 1-10 to 0-1
            "status": status_map.get(lead.get("status"), "new"),
            "customer_id": new_customer_id,
            "raw_payload": json.dumps(lead) if lead else None
        }
        
        # Clean up source to match CHECK constraint
        valid_sources = ['website_form', 'email', 'telegram', 'phone', 'referral', 'other']
        if new_lead["source"] not in valid_sources:
            new_lead["source"] = "other"
        
        try:
            result = supabase.table("leads").insert(new_lead).execute()
            if result.data:
                new_id = result.data[0]["id"]
                old_id = lead.get("lead_id")
                id_mapping[str(old_id)] = new_id
                print(f"  ✓ Lead: {new_lead['name'][:40]}...")
        except Exception as e:
            print(f"  ✗ Error migrating lead: {e}")
    
    return id_mapping

def migrate_inbox(supabase: Client, inbox_items: list, customer_mapping: dict, lead_mapping: dict):
    """Migrate inbox messages"""
    print(f"\n📦 Migrating {len(inbox_items)} inbox messages...")
    
    for item in inbox_items:
        # Get linked IDs
        old_customer_id = str(item.get("customer_id")) if item.get("customer_id") else None
        new_customer_id = customer_mapping.get(old_customer_id) if old_customer_id else None
        
        # Transform to new schema
        new_inbox = {
            "source": item.get("source", "website_form") or "website_form",
            "raw_payload": json.dumps(item),
            "name": item.get("name"),
            "email": item.get("email"),
            "phone": item.get("phone"),
            "message": item.get("message_raw"),
            "status": "processed" if item.get("status") == "processed" else "pending"
        }
        
        # Validate source
        valid_sources = ['website_form', 'email', 'telegram', 'phone', 'other']
        if new_inbox["source"] not in valid_sources:
            new_inbox["source"] = "website_form"
        
        try:
            result = supabase.table("inbox").insert(new_inbox).execute()
            if result.data:
                print(f"  ✓ Inbox: {new_inbox['name'] or 'Unknown'}")
                
                # Also create a message record for communication history
                if new_customer_id:
                    message = {
                        "customer_id": new_customer_id,
                        "direction": "inbound",
                        "channel": new_inbox["source"].replace("_form", ""),
                        "subject": item.get("service_type"),
                        "content": item.get("message_raw"),
                        "from_address": item.get("email") or item.get("phone"),
                        "status": "read"
                    }
                    if message["channel"] not in ['email', 'telegram', 'sms', 'phone', 'website']:
                        message["channel"] = "website"
                    supabase.table("messages").insert(message).execute()
        except Exception as e:
            print(f"  ✗ Error migrating inbox: {e}")

def log_activity(supabase: Client, action: str, description: str):
    """Log migration activity"""
    try:
        supabase.table("activity_log").insert({
            "action": action,
            "description": description,
            "actor": "system",
            "metadata": {"migration": "railway_to_supabase", "timestamp": datetime.now().isoformat()}
        }).execute()
    except Exception as e:
        print(f"Warning: Could not log activity: {e}")

def main():
    print("=" * 60)
    print("SKYLAND CRM - DATA MIGRATION")
    print("Railway PostgreSQL → Supabase")
    print("=" * 60)
    
    # Check Supabase credentials
    if not SUPABASE_KEY:
        print("\n❌ ERROR: SUPABASE_SERVICE_KEY not set!")
        print("Please add SUPABASE_SERVICE_KEY to your .env file")
        print("Get it from: Supabase Dashboard → Settings → API → service_role key")
        return
    
    # Connect to Supabase
    print(f"\n🔌 Connecting to Supabase...")
    print(f"   URL: {SUPABASE_URL}")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("   ✓ Connected!")
    except Exception as e:
        print(f"   ✗ Connection failed: {e}")
        return
    
    # Fetch data from Railway
    print("\n📥 Fetching data from Railway...")
    try:
        customers = get_railway_data("customers/overview")
        leads = get_railway_data("leads")
        inbox = get_railway_data("inbox")
        print(f"   ✓ Found {len(customers)} customers, {len(leads)} leads, {len(inbox)} inbox items")
    except Exception as e:
        print(f"   ✗ Error fetching data: {e}")
        print("   Make sure the backend is running on http://localhost:8000")
        return
    
    # Log migration start
    log_activity(supabase, "migration_started", 
                 f"Starting migration from Railway: {len(customers)} customers, {len(leads)} leads, {len(inbox)} inbox")
    
    # Migrate in order (respecting foreign key relationships)
    customer_mapping = migrate_customers(supabase, customers)
    lead_mapping = migrate_leads(supabase, leads, customer_mapping)
    migrate_inbox(supabase, inbox, customer_mapping, lead_mapping)
    
    # Log migration complete
    log_activity(supabase, "migration_completed",
                 f"Migration complete: {len(customer_mapping)} customers, {len(lead_mapping)} leads migrated")
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ MIGRATION COMPLETE")
    print("=" * 60)
    print(f"   Customers migrated: {len(customer_mapping)}")
    print(f"   Leads migrated: {len(lead_mapping)}")
    print(f"   Inbox messages migrated: {len(inbox)}")
    print("\n🔗 View your data at:")
    print(f"   {SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/aclcpanlrhnyszivvmdy/editor')}")

if __name__ == "__main__":
    main()
