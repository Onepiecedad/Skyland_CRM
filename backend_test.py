#!/usr/bin/env python3
"""
Skyland CRM Backend API Test Suite
Tests all API endpoints with authentication and data validation
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, List

class SkylandCRMTester:
    def __init__(self, base_url="https://work-together-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = "skyland_dev_token_123"
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            'name': name,
            'success': success,
            'details': details
        })

    def test_health_check(self):
        """Test the root health check endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'No message')}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False

    def test_authentication(self):
        """Test authentication with invalid token"""
        try:
            invalid_headers = {'Authorization': 'Bearer invalid_token', 'Content-Type': 'application/json'}
            response = requests.get(f"{self.base_url}/customers/overview", headers=invalid_headers, timeout=10)
            success = response.status_code == 401
            details = f"Status: {response.status_code} (Expected 401 for invalid token)"
            self.log_test("Authentication - Invalid Token", success, details)
            return success
        except Exception as e:
            self.log_test("Authentication - Invalid Token", False, f"Exception: {str(e)}")
            return False

    def test_customers_overview(self):
        """Test GET /api/customers/overview with various filters"""
        test_cases = [
            {"name": "Basic Overview", "params": {}},
            {"name": "With Search", "params": {"q": "test"}},
            {"name": "With Unread Filter", "params": {"has_unread": "true"}},
            {"name": "With Open Leads Filter", "params": {"has_open_leads": "true"}},
            {"name": "With Sorting", "params": {"sort": "name asc"}},
            {"name": "With Pagination", "params": {"limit": "10", "offset": "0"}},
        ]

        for case in test_cases:
            try:
                response = requests.get(
                    f"{self.base_url}/customers/overview", 
                    headers=self.headers, 
                    params=case["params"],
                    timeout=10
                )
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Records: {len(data)}"
                    # Validate data structure
                    if data and len(data) > 0:
                        first_record = data[0]
                        required_fields = ['customer_id', 'name', 'email', 'phone', 'unread_messages', 'total_messages', 'open_leads']
                        missing_fields = [field for field in required_fields if field not in first_record]
                        if missing_fields:
                            success = False
                            details += f", Missing fields: {missing_fields}"
                        else:
                            details += ", All required fields present"
                
                self.log_test(f"Customers Overview - {case['name']}", success, details)
            except Exception as e:
                self.log_test(f"Customers Overview - {case['name']}", False, f"Exception: {str(e)}")

    def test_customer_detail(self):
        """Test GET /api/customers/{id} - first get a customer ID from overview"""
        try:
            # First get customer list to get a valid ID
            response = requests.get(f"{self.base_url}/customers/overview", headers=self.headers, params={"limit": "1"}, timeout=10)
            if response.status_code != 200:
                self.log_test("Customer Detail", False, "Could not get customer list for testing")
                return False
            
            customers = response.json()
            if not customers:
                self.log_test("Customer Detail", False, "No customers found for testing")
                return False
            
            customer_id = customers[0]['customer_id']
            
            # Test getting customer detail
            response = requests.get(f"{self.base_url}/customers/{customer_id}", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                required_fields = ['customer_id', 'name', 'email', 'phone', 'created_at', 'updated_at']
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", Customer: {data.get('name', 'N/A')}"
            
            self.log_test("Customer Detail", success, details)
            return success, customer_id if success else None
            
        except Exception as e:
            self.log_test("Customer Detail", False, f"Exception: {str(e)}")
            return False, None

    def test_customer_thread(self, customer_id: str):
        """Test GET /api/customers/{id}/thread"""
        try:
            response = requests.get(f"{self.base_url}/customers/{customer_id}/thread", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Thread items: {len(data)}"
                if data and len(data) > 0:
                    first_item = data[0]
                    required_fields = ['customer_id', 'event_type', 'occurred_at']
                    missing_fields = [field for field in required_fields if field not in first_item]
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += f", Event type: {first_item.get('event_type', 'N/A')}"
            
            self.log_test("Customer Thread", success, details)
            return success
        except Exception as e:
            self.log_test("Customer Thread", False, f"Exception: {str(e)}")
            return False

    def test_leads(self):
        """Test GET /api/leads with various filters"""
        test_cases = [
            {"name": "Basic Leads", "params": {}},
            {"name": "Filter by Status", "params": {"status": "open"}},
            {"name": "Filter by Intent", "params": {"intent": "purchase"}},
            {"name": "Filter by Urgency", "params": {"urgency": "high"}},
            {"name": "Filter by Channel", "params": {"channel": "email"}},
            {"name": "With Sorting", "params": {"sort": "created_at desc"}},
            {"name": "With Pagination", "params": {"limit": "5", "offset": "0"}},
        ]

        for case in test_cases:
            try:
                response = requests.get(
                    f"{self.base_url}/leads", 
                    headers=self.headers, 
                    params=case["params"],
                    timeout=10
                )
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Leads: {len(data)}"
                    if data and len(data) > 0:
                        first_lead = data[0]
                        required_fields = ['lead_id', 'customer_id', 'status', 'created_at', 'updated_at']
                        missing_fields = [field for field in required_fields if field not in first_lead]
                        if missing_fields:
                            success = False
                            details += f", Missing fields: {missing_fields}"
                        else:
                            details += f", Status: {first_lead.get('status', 'N/A')}"
                
                self.log_test(f"Leads - {case['name']}", success, details)
            except Exception as e:
                self.log_test(f"Leads - {case['name']}", False, f"Exception: {str(e)}")

    def test_inbox(self):
        """Test GET /api/inbox with various filters"""
        test_cases = [
            {"name": "Basic Inbox", "params": {}},
            {"name": "Unlinked Messages", "params": {"unlinked_only": "true"}},
            {"name": "Filter by Status", "params": {"status": "new"}},
            {"name": "Filter by Type", "params": {"type": "inquiry"}},
            {"name": "Filter by Source", "params": {"source": "website"}},
            {"name": "Filter by Channel", "params": {"channel": "email"}},
            {"name": "With Sorting", "params": {"sort": "received_at desc"}},
            {"name": "With Pagination", "params": {"limit": "5", "offset": "0"}},
        ]

        for case in test_cases:
            try:
                response = requests.get(
                    f"{self.base_url}/inbox", 
                    headers=self.headers, 
                    params=case["params"],
                    timeout=10
                )
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Messages: {len(data)}"
                    if data and len(data) > 0:
                        first_message = data[0]
                        required_fields = ['inbox_id', 'created_at']
                        missing_fields = [field for field in required_fields if field not in first_message]
                        if missing_fields:
                            success = False
                            details += f", Missing fields: {missing_fields}"
                        else:
                            details += f", Source: {first_message.get('source', 'N/A')}"
                
                self.log_test(f"Inbox - {case['name']}", success, details)
            except Exception as e:
                self.log_test(f"Inbox - {case['name']}", False, f"Exception: {str(e)}")

    def test_customer_crud(self):
        """Test Customer CRUD operations (Create, Update, Delete)"""
        created_customer_id = None
        
        # Test CREATE customer
        try:
            customer_data = {
                "name": "Erik Svensson",
                "email": "erik.svensson@marinservice.se", 
                "phone": "+46701234567"
            }
            
            response = requests.post(
                f"{self.base_url}/customers",
                headers=self.headers,
                json=customer_data,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                created_customer_id = data.get('customer_id')
                required_fields = ['customer_id', 'name', 'email', 'phone', 'created_at', 'updated_at']
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", Created customer: {data.get('name')}"
            
            self.log_test("Customer CRUD - Create", success, details)
            
        except Exception as e:
            self.log_test("Customer CRUD - Create", False, f"Exception: {str(e)}")
        
        # Test UPDATE customer (if create was successful)
        if created_customer_id:
            try:
                update_data = {
                    "name": "Erik Svensson Updated",
                    "phone": "+46709876543"
                }
                
                response = requests.put(
                    f"{self.base_url}/customers/{created_customer_id}",
                    headers=self.headers,
                    json=update_data,
                    timeout=10
                )
                
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    if data.get('name') == update_data['name'] and data.get('phone') == update_data['phone']:
                        details += f", Updated customer: {data.get('name')}"
                    else:
                        success = False
                        details += ", Update data not reflected correctly"
                
                self.log_test("Customer CRUD - Update", success, details)
                
            except Exception as e:
                self.log_test("Customer CRUD - Update", False, f"Exception: {str(e)}")
        
        # Test UPDATE with invalid customer ID
        try:
            invalid_id = "00000000-0000-0000-0000-000000000000"
            update_data = {"name": "Test"}
            
            response = requests.put(
                f"{self.base_url}/customers/{invalid_id}",
                headers=self.headers,
                json=update_data,
                timeout=10
            )
            
            success = response.status_code == 404
            details = f"Status: {response.status_code} (Expected 404 for invalid ID)"
            
            self.log_test("Customer CRUD - Update Invalid ID", success, details)
            
        except Exception as e:
            self.log_test("Customer CRUD - Update Invalid ID", False, f"Exception: {str(e)}")
        
        # Test DELETE customer (if create was successful)
        if created_customer_id:
            try:
                response = requests.delete(
                    f"{self.base_url}/customers/{created_customer_id}",
                    headers=self.headers,
                    timeout=10
                )
                
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Message: {data.get('message', 'No message')}"
                
                self.log_test("Customer CRUD - Delete", success, details)
                
            except Exception as e:
                self.log_test("Customer CRUD - Delete", False, f"Exception: {str(e)}")
        
        # Test DELETE with invalid customer ID
        try:
            invalid_id = "00000000-0000-0000-0000-000000000000"
            
            response = requests.delete(
                f"{self.base_url}/customers/{invalid_id}",
                headers=self.headers,
                timeout=10
            )
            
            success = response.status_code == 404
            details = f"Status: {response.status_code} (Expected 404 for invalid ID)"
            
            self.log_test("Customer CRUD - Delete Invalid ID", success, details)
            
        except Exception as e:
            self.log_test("Customer CRUD - Delete Invalid ID", False, f"Exception: {str(e)}")

    def test_lead_crud(self):
        """Test Lead CRUD operations (Create, Update, Delete)"""
        created_lead_id = None
        customer_id = None
        
        # First get a valid customer ID for testing
        try:
            response = requests.get(f"{self.base_url}/customers/overview", headers=self.headers, params={"limit": "1"}, timeout=10)
            if response.status_code == 200:
                customers = response.json()
                if customers:
                    customer_id = customers[0]['customer_id']
        except:
            pass
        
        if not customer_id:
            self.log_test("Lead CRUD - Setup", False, "Could not get customer ID for testing")
            return
        
        # Test CREATE lead
        try:
            lead_data = {
                "customer_id": customer_id,
                "intent": "service_request",
                "status": "new",
                "channel": "email",
                "summary": "Båtmotor service behövs",
                "description": "Kunden behöver service på sin båtmotor innan säsongen",
                "urgency": "medium",
                "urgency_score": 5
            }
            
            response = requests.post(
                f"{self.base_url}/leads",
                headers=self.headers,
                json=lead_data,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                created_lead_id = data.get('lead_id')
                required_fields = ['lead_id', 'customer_id', 'status', 'created_at', 'updated_at']
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += f", Created lead: {data.get('summary')}"
            
            self.log_test("Lead CRUD - Create", success, details)
            
        except Exception as e:
            self.log_test("Lead CRUD - Create", False, f"Exception: {str(e)}")
        
        # Test UPDATE lead (if create was successful)
        if created_lead_id:
            try:
                update_data = {
                    "status": "open",  # Use valid status from database
                    "urgency": "high",
                    "urgency_score": 8,
                    "summary": "Båtmotor service - BRÅDSKANDE"
                }
                
                response = requests.put(
                    f"{self.base_url}/leads/{created_lead_id}",
                    headers=self.headers,
                    json=update_data,
                    timeout=10
                )
                
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    if (data.get('status') == update_data['status'] and 
                        data.get('urgency') == update_data['urgency'] and
                        data.get('summary') == update_data['summary']):
                        details += f", Updated lead: {data.get('summary')}"
                    else:
                        success = False
                        details += ", Update data not reflected correctly"
                
                self.log_test("Lead CRUD - Update", success, details)
                
            except Exception as e:
                self.log_test("Lead CRUD - Update", False, f"Exception: {str(e)}")
        
        # Test UPDATE with invalid lead ID
        try:
            invalid_id = "00000000-0000-0000-0000-000000000000"
            update_data = {"status": "closed"}
            
            response = requests.put(
                f"{self.base_url}/leads/{invalid_id}",
                headers=self.headers,
                json=update_data,
                timeout=10
            )
            
            success = response.status_code == 404
            details = f"Status: {response.status_code} (Expected 404 for invalid ID)"
            
            self.log_test("Lead CRUD - Update Invalid ID", success, details)
            
        except Exception as e:
            self.log_test("Lead CRUD - Update Invalid ID", False, f"Exception: {str(e)}")
        
        # Test DELETE lead (if create was successful)
        if created_lead_id:
            try:
                response = requests.delete(
                    f"{self.base_url}/leads/{created_lead_id}",
                    headers=self.headers,
                    timeout=10
                )
                
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Message: {data.get('message', 'No message')}"
                
                self.log_test("Lead CRUD - Delete", success, details)
                
            except Exception as e:
                self.log_test("Lead CRUD - Delete", False, f"Exception: {str(e)}")
        
        # Test DELETE with invalid lead ID
        try:
            invalid_id = "00000000-0000-0000-0000-000000000000"
            
            response = requests.delete(
                f"{self.base_url}/leads/{invalid_id}",
                headers=self.headers,
                timeout=10
            )
            
            success = response.status_code == 404
            details = f"Status: {response.status_code} (Expected 404 for invalid ID)"
            
            self.log_test("Lead CRUD - Delete Invalid ID", success, details)
            
        except Exception as e:
            self.log_test("Lead CRUD - Delete Invalid ID", False, f"Exception: {str(e)}")

    def test_inbox_crud(self):
        """Test Inbox CRUD operations (Update, Delete)"""
        inbox_id = None
        
        # First get a valid inbox ID for testing
        try:
            response = requests.get(f"{self.base_url}/inbox", headers=self.headers, params={"limit": "1"}, timeout=10)
            if response.status_code == 200:
                messages = response.json()
                if messages:
                    inbox_id = messages[0]['inbox_id']
        except:
            pass
        
        if not inbox_id:
            self.log_test("Inbox CRUD - Setup", False, "Could not get inbox ID for testing")
            return
        
        # Test UPDATE inbox message
        try:
            update_data = {
                "status": "processed",
                "urgency_level": "high",
                "urgency_score": 8
            }
            
            response = requests.put(
                f"{self.base_url}/inbox/{inbox_id}",
                headers=self.headers,
                json=update_data,
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if (data.get('status') == update_data['status'] and 
                    data.get('urgency_level') == update_data['urgency_level']):
                    details += f", Updated message status: {data.get('status')}"
                else:
                    success = False
                    details += ", Update data not reflected correctly"
            
            self.log_test("Inbox CRUD - Update", success, details)
            
        except Exception as e:
            self.log_test("Inbox CRUD - Update", False, f"Exception: {str(e)}")
        
        # Test UPDATE with invalid inbox ID
        try:
            invalid_id = "00000000-0000-0000-0000-000000000000"
            update_data = {"status": "processed"}
            
            response = requests.put(
                f"{self.base_url}/inbox/{invalid_id}",
                headers=self.headers,
                json=update_data,
                timeout=10
            )
            
            success = response.status_code == 404
            details = f"Status: {response.status_code} (Expected 404 for invalid ID)"
            
            self.log_test("Inbox CRUD - Update Invalid ID", success, details)
            
        except Exception as e:
            self.log_test("Inbox CRUD - Update Invalid ID", False, f"Exception: {str(e)}")
        
        # Test DELETE inbox message (using a different message to avoid affecting the update test)
        try:
            # Get another inbox message for deletion test
            response = requests.get(f"{self.base_url}/inbox", headers=self.headers, params={"limit": "2"}, timeout=10)
            delete_inbox_id = None
            
            if response.status_code == 200:
                messages = response.json()
                if len(messages) > 1:
                    # Use the second message for deletion to avoid conflicts
                    delete_inbox_id = messages[1]['inbox_id']
                elif len(messages) == 1:
                    # If only one message, we'll skip the delete test to preserve data
                    self.log_test("Inbox CRUD - Delete", True, "Skipped to preserve test data (only one message)")
                    delete_inbox_id = None
            
            if delete_inbox_id:
                response = requests.delete(
                    f"{self.base_url}/inbox/{delete_inbox_id}",
                    headers=self.headers,
                    timeout=10
                )
                
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Message: {data.get('message', 'No message')}"
                
                self.log_test("Inbox CRUD - Delete", success, details)
            
        except Exception as e:
            self.log_test("Inbox CRUD - Delete", False, f"Exception: {str(e)}")
        
        # Test DELETE with invalid inbox ID
        try:
            invalid_id = "00000000-0000-0000-0000-000000000000"
            
            response = requests.delete(
                f"{self.base_url}/inbox/{invalid_id}",
                headers=self.headers,
                timeout=10
            )
            
            success = response.status_code == 404
            details = f"Status: {response.status_code} (Expected 404 for invalid ID)"
            
            self.log_test("Inbox CRUD - Delete Invalid ID", success, details)
            
        except Exception as e:
            self.log_test("Inbox CRUD - Delete Invalid ID", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Skyland CRM API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test health check first
        if not self.test_health_check():
            print("❌ Health check failed - API may be down")
            return False
        
        # Test authentication
        self.test_authentication()
        
        # Test all GET endpoints
        self.test_customers_overview()
        
        success, customer_id = self.test_customer_detail()
        if success and customer_id:
            self.test_customer_thread(customer_id)
        
        self.test_leads()
        self.test_inbox()
        
        # Test CRUD operations
        print("\n🔧 Testing CRUD Operations...")
        self.test_customer_crud()
        self.test_lead_crud()
        self.test_inbox_crud()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check details above.")
            failed_tests = [test for test in self.test_results if not test['success']]
            print("\nFailed Tests:")
            for test in failed_tests:
                print(f"  - {test['name']}: {test['details']}")
            return False

def main():
    """Main test runner"""
    tester = SkylandCRMTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())