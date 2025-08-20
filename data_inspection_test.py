#!/usr/bin/env python3
"""
Skyland CRM Data Inspection Test
Specifically checks what data exists in the database for the requested endpoints
"""

import requests
import json
from datetime import datetime

class DataInspector:
    def __init__(self, base_url="https://work-together-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = "skyland_dev_token_123"
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

    def inspect_customers_overview(self):
        """Check customers overview data"""
        print("🔍 Inspecting GET /api/customers/overview")
        print("-" * 50)
        
        try:
            response = requests.get(f"{self.base_url}/customers/overview", headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Status: {response.status_code}")
                print(f"📊 Total customers found: {len(data)}")
                
                if data:
                    print("\n📋 Sample customer data:")
                    for i, customer in enumerate(data[:3]):  # Show first 3 customers
                        print(f"\nCustomer {i+1}:")
                        print(f"  - ID: {customer.get('customer_id', 'N/A')}")
                        print(f"  - Name: {customer.get('name', 'N/A')}")
                        print(f"  - Email: {customer.get('email', 'N/A')}")
                        print(f"  - Phone: {customer.get('phone', 'N/A')}")
                        print(f"  - Unread Messages: {customer.get('unread_messages', 0)}")
                        print(f"  - Total Messages: {customer.get('total_messages', 0)}")
                        print(f"  - Open Leads: {customer.get('open_leads', 0)}")
                        print(f"  - Latest Activity: {customer.get('latest_activity_at', 'N/A')}")
                        print(f"  - Latest Message: {customer.get('latest_message', 'N/A')[:100] if customer.get('latest_message') else 'N/A'}...")
                else:
                    print("📭 No customers found in database")
                    
            else:
                print(f"❌ Error: Status {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")

    def inspect_leads(self):
        """Check leads data"""
        print("\n\n🔍 Inspecting GET /api/leads")
        print("-" * 50)
        
        try:
            response = requests.get(f"{self.base_url}/leads", headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Status: {response.status_code}")
                print(f"📊 Total leads found: {len(data)}")
                
                if data:
                    print("\n📋 Sample lead data:")
                    for i, lead in enumerate(data[:3]):  # Show first 3 leads
                        print(f"\nLead {i+1}:")
                        print(f"  - ID: {lead.get('lead_id', 'N/A')}")
                        print(f"  - Customer ID: {lead.get('customer_id', 'N/A')}")
                        print(f"  - Status: {lead.get('status', 'N/A')}")
                        print(f"  - Intent: {lead.get('intent', 'N/A')}")
                        print(f"  - Channel: {lead.get('channel', 'N/A')}")
                        print(f"  - Urgency: {lead.get('urgency', 'N/A')}")
                        print(f"  - Summary: {lead.get('summary', 'N/A')[:100] if lead.get('summary') else 'N/A'}...")
                        print(f"  - Created: {lead.get('created_at', 'N/A')}")
                        print(f"  - Updated: {lead.get('updated_at', 'N/A')}")
                else:
                    print("📭 No leads found in database")
                    
            else:
                print(f"❌ Error: Status {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")

    def inspect_inbox(self):
        """Check inbox data"""
        print("\n\n🔍 Inspecting GET /api/inbox")
        print("-" * 50)
        
        try:
            response = requests.get(f"{self.base_url}/inbox", headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Status: {response.status_code}")
                print(f"📊 Total inbox messages found: {len(data)}")
                
                if data:
                    print("\n📋 Sample inbox data:")
                    for i, message in enumerate(data[:3]):  # Show first 3 messages
                        print(f"\nMessage {i+1}:")
                        print(f"  - ID: {message.get('inbox_id', 'N/A')}")
                        print(f"  - Source: {message.get('source', 'N/A')}")
                        print(f"  - Channel: {message.get('channel', 'N/A')}")
                        print(f"  - Type: {message.get('type', 'N/A')}")
                        print(f"  - Name: {message.get('name', 'N/A')}")
                        print(f"  - Email: {message.get('email', 'N/A')}")
                        print(f"  - Phone: {message.get('phone', 'N/A')}")
                        print(f"  - Service Type: {message.get('service_type', 'N/A')}")
                        print(f"  - Status: {message.get('status', 'N/A')}")
                        print(f"  - Customer ID: {message.get('customer_id', 'N/A')}")
                        print(f"  - Received: {message.get('received_at', 'N/A')}")
                        print(f"  - Message: {message.get('message_raw', 'N/A')[:100] if message.get('message_raw') else 'N/A'}...")
                else:
                    print("📭 No inbox messages found in database")
                    
            else:
                print(f"❌ Error: Status {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")

    def run_inspection(self):
        """Run all data inspections"""
        print("🔍 SKYLAND CRM DATABASE DATA INSPECTION")
        print("=" * 60)
        print(f"🌐 API Base URL: {self.base_url}")
        print(f"🔑 Using Token: {self.token}")
        print("=" * 60)
        
        self.inspect_customers_overview()
        self.inspect_leads()
        self.inspect_inbox()
        
        print("\n" + "=" * 60)
        print("✅ Data inspection completed!")
        print("=" * 60)

def main():
    """Main inspection runner"""
    inspector = DataInspector()
    inspector.run_inspection()

if __name__ == "__main__":
    main()