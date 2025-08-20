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
import { CustomerForm } from '../components/forms/CustomerForm';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { Search, Filter, Plus, Edit, Trash2 } from 'lucide-react';
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
      const params = {
        q: searchQuery || undefined,
        sort: sortBy,
        has_unread: hasUnread === 'all' ? undefined : hasUnread === 'true',
        has_open_leads: hasOpenLeads === 'all' ? undefined : hasOpenLeads === 'true',
        limit: 50
      };
      
      console.log('📋 API params:', params);
      console.log('🌐 Making API call to customersAPI.getOverview...');
      
      const response = await customersAPI.getOverview(params);
      console.log('✅ API response received:', response);
      console.log('📊 Customer data:', response.data);
      
      setCustomers(response.data);
      console.log('💾 Customers state updated');
    } catch (error) {
      console.error('❌ Error in fetchCustomers:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response);
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

  const handleCustomerSuccess = (updatedCustomer) => {
    // Refresh the customers list
    fetchCustomers();
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await customersAPI.delete(customerId);
      toast.success('Customer deleted successfully');
      fetchCustomers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error; // Re-throw to be caught by DeleteConfirmDialog
    }
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