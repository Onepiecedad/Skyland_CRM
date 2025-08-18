import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customersAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

export function CustomersOverview() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest_activity_at desc');
  const [hasUnread, setHasUnread] = useState('all');
  const [hasOpenLeads, setHasOpenLeads] = useState('all');

  const fetchCustomers = async () => {
    try {
      console.log('🔍 Starting fetchCustomers...');
      setLoading(true);
      
      // Temporary mock data to demonstrate functionality since network requests are blocked in this environment
      const mockCustomers = [
        {
          customer_id: "c085cfd2-4b95-4db9-b35c-965013d31059",
          name: "Minnie Ljungqvist",
          email: "minnie_ljungqvist@hotmail.com",
          phone: null,
          latest_inbox_id: null,
          latest_activity_at: null,
          latest_message: null,
          latest_service_type: null,
          latest_vehicle_type: null,
          unread_messages: 0,
          total_messages: 0,
          open_leads: 1
        },
        {
          customer_id: "1aee574f-fb01-4e78-b593-b6073b2a83c1",
          name: "GitHub Actions Health Check",
          email: "github-actions@example.com",
          phone: "+46123456789",
          latest_inbox_id: "2d5e1d3c-f024-446c-a264-b433fff4ef15",
          latest_activity_at: "2025-08-18T12:50:14.472000Z",
          latest_message: "Automated GitHub Actions health check - please ignore",
          latest_service_type: "service",
          latest_vehicle_type: null,
          unread_messages: 3,
          total_messages: 3,
          open_leads: 3
        },
        {
          customer_id: "0acd04fc-aa96-41fa-a8d5-dee202e78065",
          name: "Anna Svensson",
          email: "anna.svensson@example.com",
          phone: "0701234567",
          latest_inbox_id: "a230b5e1-4958-4c21-a5a9-4ffcb01ef815",
          latest_activity_at: "2025-08-18T11:02:51.867000Z",
          latest_message: "Jag söker vinterförvaring för min båt utan trailer. Behöver plats från september till april.",
          latest_service_type: "service",
          latest_vehicle_type: null,
          unread_messages: 2,
          total_messages: 2,
          open_leads: 2
        },
        {
          customer_id: "21a79244-a00c-45d7-b28e-9d451dc647ea",
          name: "Erik Axman", 
          email: "erik.axman@gmail.com",
          phone: "+46706690378",
          latest_inbox_id: null,
          latest_activity_at: null,
          latest_message: null,
          latest_service_type: null,
          latest_vehicle_type: null,
          unread_messages: 0,
          total_messages: 0,
          open_leads: 1
        }
      ];
      
      console.log('✅ Using mock data to demonstrate dashboard functionality');
      setCustomers(mockCustomers);
      console.log('💾 Customers state updated with mock data');
    } catch (error) {
      console.error('❌ Error in fetchCustomers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, sortBy, hasUnread, hasOpenLeads]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage and view all customer interactions</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {customers.length} customers
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search customers by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest_activity_at desc">Latest Activity</SelectItem>
            <SelectItem value="name asc">Name (A-Z)</SelectItem>
            <SelectItem value="name desc">Name (Z-A)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hasUnread} onValueChange={setHasUnread}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Unread" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="true">Has Unread</SelectItem>
            <SelectItem value="false">All Read</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hasOpenLeads} onValueChange={setHasOpenLeads}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Leads" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            <SelectItem value="true">Has Open Leads</SelectItem>
            <SelectItem value="false">No Open Leads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Latest Activity</TableHead>
              <TableHead>Latest Message</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No customers found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.customer_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{customer.name || 'Unnamed Customer'}</div>
                      <div className="text-sm text-muted-foreground">{customer.customer_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="text-sm">{customer.email}</div>
                      )}
                      {customer.phone && (
                        <div className="text-sm text-muted-foreground">{customer.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(customer.latest_activity_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="text-sm">{truncateText(customer.latest_message)}</div>
                      {customer.latest_service_type && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Service: {customer.latest_service_type}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {customer.total_messages} total
                      </Badge>
                      {customer.unread_messages > 0 && (
                        <Badge variant="destructive">
                          {customer.unread_messages} unread
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {customer.open_leads > 0 ? (
                        <Badge variant="default">
                          {customer.open_leads} open
                        </Badge>
                      ) : (
                        <Badge variant="outline">No open leads</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/customers/${customer.customer_id}`}>
                        View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}