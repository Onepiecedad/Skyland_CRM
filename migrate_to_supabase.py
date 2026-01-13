#!/usr/bin/env python3
"""
Migration script: Railway PostgreSQL → Supabase
Migrates customers, leads, and inbox data from the old schema to the new schema.

UPDATED: 2026-01-13 - Only migrates LEADS (customers & inbox already done)
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
    print("SKYLAND CRM - DATA MIGRATION (LEADS ONLY)")
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
    print("\n📥 Fetching leads from Railway...")
    try:
        leads = get_railway_data("leads")
        print(f"   ✓ Found {len(leads)} leads")
    except Exception as e:
        print(f"   ✗ Error fetching data: {e}")
        print("   Make sure the backend is running on http://localhost:8000")
        return
    
    # Log migration start
    log_activity(supabase, "migration_started", 
                 f"Starting leads migration from Railway: {len(leads)} leads")
    
    # Skip customers - already migrated
    # We pass empty mapping since leads might not have customer_id links that matter
    customer_mapping = {}
    
    # Migrate leads only
    lead_mapping = migrate_leads(supabase, leads, customer_mapping)
    
    # Skip inbox - already migrated
    
    # Log migration complete
    log_activity(supabase, "migration_completed",
                 f"Leads migration complete: {len(lead_mapping)} leads migrated")
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ LEADS MIGRATION COMPLETE")
    print("=" * 60)
    print(f"   Leads migrated: {len(lead_mapping)}")
    print("\n🔗 View your data at:")
    print(f"   {SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/aclcpanlrhnyszivvmdy/editor')}")

if __name__ == "__main__":
    main()