import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customersAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Skeleton } from '../components/ui/skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogClose } from '../components/ui/dialog';
import { DialogTitle } from '../components/ui/dialog';
import { CustomerCard } from '../components/CustomerCard';
import { Badge } from '../components/ui/badge';
import { CustomerForm } from '../components/forms/CustomerForm';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { Search, Filter, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function CustomersOverview() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  // Add loading state to fix runtime error
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest_activity_at desc");
  const [hasUnread, setHasUnread] = useState("all");
  const [hasOpenLeads, setHasOpenLeads] = useState("all");

  // Fetch customers from API
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Map filter values to API params
      const params = {
        q: searchQuery || undefined,
        sort: sortBy,
        has_unread: hasUnread === "all" ? undefined : hasUnread === "true",
        has_open_leads: hasOpenLeads === "all" ? undefined : hasOpenLeads === "true",
      };
      const response = await customersAPI.getOverview(params);
      setCustomers(response.data);
    } catch (error) {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch customers on mount and when filters change
  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy, hasUnread, hasOpenLeads]);

  const openCustomerModal = async (customerId) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    try {
      const response = await customersAPI.getById(customerId);
      setSelectedCustomer(response.data || null);
      if (!response.data) setModalError("Customer not found");
    } catch (err) {
      setModalError("Failed to load customer");
      setSelectedCustomer(null);
    } finally {
      setModalLoading(false);
    }
  };
  // Add closeCustomerModal to fix 'closeCustomerModal is not defined' error
  const closeCustomerModal = () => {
    setModalOpen(false);
    setSelectedCustomer(null);
    setModalError(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Never';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) {
      return '-';
    }
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
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <div className="rounded-md border">
          <Skeleton className="h-12 w-full mb-2" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">Manage and view all customer interactions</p>
          </div>
          <div className="flex items-center gap-3">
            <CustomerForm onSuccess={handleCustomerSuccess}>
              <Button className="text-lg md:text-xl">
                <Plus className="h-4 w-4 mr-2" />
                New Customer
              </Button>
            </CustomerForm>
            <div className="text-sm text-muted-foreground">
              {customers.length} customers
            </div>
          </div>
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
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
                  <TableRow key={customer.customer_id} className="cursor-pointer hover:bg-muted/30" onClick={() => openCustomerModal(customer.customer_id)}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name || '-'}</div>
                        <div className="text-sm text-muted-foreground">{customer.customer_id || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{customer.email || '-'}</div>
                        <div className="text-sm text-muted-foreground">{customer.phone || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{customer.latest_activity_at ? formatDate(customer.latest_activity_at) : '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="text-sm">{customer.latest_message ? truncateText(customer.latest_message) : '-'}</div>
                        <div className="text-xs text-muted-foreground mt-1">Service: {customer.latest_service_type || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{typeof customer.total_messages === 'number' ? customer.total_messages + ' total' : '-'}</Badge>
                        <Badge variant={customer.unread_messages > 0 ? "destructive" : "outline"}>{customer.unread_messages > 0 ? customer.unread_messages + ' unread' : '-'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={customer.open_leads > 0 ? "default" : "outline"}>{customer.open_leads > 0 ? customer.open_leads + ' open' : 'No open leads'}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <CustomerForm 
                          customer={customer} 
                          onSuccess={handleCustomerSuccess}
                        >
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </CustomerForm>
                        <DeleteConfirmDialog
                          title="Delete Customer"
                          description={`Are you sure you want to delete ${customer.name || 'this customer'}? This will also delete all associated leads and unlink inbox messages. This action cannot be undone.`}
                          onConfirm={() => handleDeleteCustomer(customer.customer_id)}
                        >
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DeleteConfirmDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <DialogContent>
          <DialogTitle>Customer Details</DialogTitle>
          <div style={{maxHeight: '60vh', overflowY: 'auto'}}>
            {modalLoading ? (
              <LoadingSpinner />
            ) : modalError ? (
              <div className="text-destructive p-4">{modalError}</div>
            ) : (
              <CustomerCard customer={selectedCustomer} />
            )}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="mt-4" onClick={closeCustomerModal}>Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}