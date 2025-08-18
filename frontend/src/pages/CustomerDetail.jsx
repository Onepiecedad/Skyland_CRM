import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customersAPI, leadsAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Mail, Phone, MessageSquare, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export function CustomerDetail() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [customerThread, setCustomerThread] = useState([]);
  const [customerLeads, setCustomerLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setLoading(true);
        const customerResponse = await customersAPI.getById(customerId);
        setCustomer(customerResponse.data);
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast.error('Failed to fetch customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [customerId]);

  useEffect(() => {
    const fetchCustomerThread = async () => {
      try {
        setThreadLoading(true);
        const threadResponse = await customersAPI.getThread(customerId, { limit: 50 });
        setCustomerThread(threadResponse.data);
      } catch (error) {
        console.error('Error fetching customer thread:', error);
        toast.error('Failed to fetch customer messages');
      } finally {
        setThreadLoading(false);
      }
    };

    const fetchCustomerLeads = async () => {
      try {
        setLeadsLoading(true);
        const leadsResponse = await leadsAPI.getAll({ customer_id: customerId, limit: 50 });
        setCustomerLeads(leadsResponse.data);
      } catch (error) {
        console.error('Error fetching customer leads:', error);
        toast.error('Failed to fetch customer leads');
      } finally {
        setLeadsLoading(false);
      }
    };

    fetchCustomerThread();
    fetchCustomerLeads();
  }, [customerId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!customer) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Customer not found</p>
        <Button asChild className="mt-4">
          <Link to="/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </div>

      {/* Customer Header */}
      <div className="border rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{customer.name || 'Unnamed Customer'}</h1>
            <p className="text-muted-foreground">Customer ID: {customer.customer_id}</p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                {customer.email}
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                {customer.phone}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Customer since: {formatDate(customer.created_at)}</p>
          <p>Last updated: {formatDate(customer.updated_at)}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerThread.filter(t => t.event_type === 'message').length}</div>
            <p className="text-xs text-muted-foreground">Total messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerLeads.length}</div>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Leads</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customerLeads.filter(lead => ['open', 'new', 'pending', 'qualified'].includes(lead.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Messages & Events</CardTitle>
            </CardHeader>
            <CardContent>
              {threadLoading ? (
                <LoadingSpinner />
              ) : customerThread.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No messages or events found</p>
              ) : (
                <div className="space-y-4">
                  {customerThread.map((item, index) => (
                    <div key={index} className="border-l-2 border-muted pl-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={item.event_type === 'message' ? 'default' : 'secondary'}>
                          {item.event_type === 'message' ? 'Message' : 
                           item.event_type === 'lead_created' ? 'Lead Created' : 
                           'Lead Updated'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(item.occurred_at)}
                        </span>
                        {item.channel && (
                          <Badge variant="outline">{item.channel}</Badge>
                        )}
                      </div>
                      
                      {item.title && (
                        <h4 className="font-medium mb-1">{item.title}</h4>
                      )}
                      
                      {item.body && (
                        <p className="text-sm text-muted-foreground mb-2">{item.body}</p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.source && <span>Source: {item.source}</span>}
                        {item.status && (
                          <StatusBadge status={item.status} type="lead" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <LoadingSpinner />
              ) : customerLeads.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No leads found for this customer</p>
              ) : (
                <div className="space-y-4">
                  {customerLeads.map((lead) => (
                    <div key={lead.lead_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{lead.summary || 'Untitled Lead'}</h4>
                          <p className="text-sm text-muted-foreground">ID: {lead.lead_id}</p>
                        </div>
                        <div className="flex gap-2">
                          <StatusBadge status={lead.status} type="lead" />
                          <StatusBadge status={lead.urgency} type="urgency" />
                        </div>
                      </div>
                      
                      {lead.description && (
                        <p className="text-sm mb-2">{lead.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Intent:</span> {lead.intent || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Channel:</span> {lead.channel || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Expected Close:</span> {lead.expected_close_date || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(lead.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}