import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customersAPI, leadsAPI, inboxAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogClose } from '../components/ui/dialog';
import { CustomerCard } from '../components/CustomerCard';
import { LeadCard } from '../components/LeadCard';
import { InboxMessageCard } from '../components/InboxMessageCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Users,
  Target,
  Inbox,
  TrendingUp,
  Mail,
  AlertCircle,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

function truncateText(text, maxLength = 50) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getUrgencyBadge(urgency, urgency_score) {
  if (urgency === 'high' || urgency_score > 7) {
    return <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">Urgent</span>;
  }
  if (urgency === 'medium' || urgency_score > 4) {
    return <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs">Medium</span>;
  }
  return null;
}

function getLeadStatusColor(status) {
  switch (status) {
    case 'open':
      return 'bg-green-500';
    case 'closed':
      return 'bg-gray-400';
    case 'urgent':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    customers: { total: 0 },
    leads: { open: 0, urgent: 0, total: 0 },
    inbox: { total: 0, unlinked: 0 },
    recentCustomers: [],
    recentLeads: [],
    recentMessages: []
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'customer' | 'lead' | 'inbox'
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalIndex, setModalIndex] = useState(null); // index in recent list

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const customers = await customersAPI.getOverview();
        const leads = await leadsAPI.getAll();
        const inbox = await inboxAPI.getAll();
        setDashboardData({
          customers: { total: customers.data.length },
          leads: {
            open: leads.data.filter(l => l.status === 'open').length,
            urgent: leads.data.filter(l => l.urgent).length,
            total: leads.data.length
          },
          inbox: {
            total: inbox.data.length,
            unlinked: inbox.data.filter(m => !m.customer_id).length
          },
          recentCustomers: customers.data.slice(0, 5),
          recentLeads: leads.data.slice(0, 5),
          recentMessages: inbox.data.slice(0, 5)
        });
      } catch (err) {
        // Optionally handle error, e.g. show toast
      }
    }
    fetchDashboardData();
  }, []);

  const openModal = async (type, id, index = null) => {
    setModalType(type);
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalIndex(index);
    try {
      let response, found;
      if (type === 'customer') {
        response = await customersAPI.getOverview({ customer_id: id });
        found = response.data.find(c => c.customer_id === id);
      } else if (type === 'lead') {
        response = await leadsAPI.getAll({ lead_id: id });
        found = response.data.find(l => l.lead_id === id);
      } else if (type === 'inbox') {
        response = await inboxAPI.getById(id);
        found = response.data || response.data === undefined ? response.data : null;
      }
      setModalData(found || null);
      if (!found) setModalError('Not found');
    } catch (err) {
      setModalError('Failed to load details');
      setModalData(null);
    } finally {
      setModalLoading(false);
    }
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setModalData(null);
    setModalError(null);
    setModalIndex(null);
  };

  // Modal navigation handlers
  const handlePrev = () => {
    if (modalType && modalIndex > 0) {
      let list = [];
      if (modalType === 'customer') list = dashboardData.recentCustomers;
      if (modalType === 'lead') list = dashboardData.recentLeads;
      if (modalType === 'inbox') list = dashboardData.recentMessages;
      const prevItem = list[modalIndex - 1];
      if (prevItem) openModal(modalType, prevItem[`${modalType}_id`], modalIndex - 1);
    }
  };
  const handleNext = () => {
    if (modalType != null && modalIndex != null) {
      let list = [];
      if (modalType === 'customer') list = dashboardData.recentCustomers;
      if (modalType === 'lead') list = dashboardData.recentLeads;
      if (modalType === 'inbox') list = dashboardData.recentMessages;
      if (modalIndex < list.length - 1) {
        const nextItem = list[modalIndex + 1];
        openModal(modalType, nextItem[`${modalType}_id`], modalIndex + 1);
      }
    }
  };

  // ...existing code...
  // Only the main return statement below
  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
        <div className="w-full sm:w-auto text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Welcome to your CRM overview</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/customers">
              <Plus className="h-5 w-5 mr-2" />
              New Customer
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{dashboardData.customers.total}</div>
            <p className="text-xs text-muted-foreground">
              {/* Add any additional info here if needed */}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Leads</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{dashboardData.leads.open}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.leads.urgent} urgent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Inbox Messages</CardTitle>
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{dashboardData.inbox.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.inbox.unlinked} unlinked
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {dashboardData.leads.total > 0
                ? Math.round((dashboardData.leads.open / dashboardData.leads.total) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Lead to customer ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Recent Customers */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
              <div className="w-full sm:w-auto text-center sm:text-left">
                <CardTitle className="text-base sm:text-lg">Recent Customers</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest customer activities</CardDescription>
              </div>
              <Button variant="ghost" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/customers">
                  View All <ArrowRight className="h-5 w-5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-4">
            {dashboardData.recentCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No customers yet
              </p>
            ) : (
              dashboardData.recentCustomers.map((customer, idx) => (
                <div key={customer.customer_id} className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4 hover:bg-muted/30 rounded-md p-2 transition-colors cursor-pointer" onClick={() => openModal('customer', customer.customer_id, idx)}>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-sm font-medium truncate">
                      {customer.name || 'Unnamed Customer'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.email || customer.phone || 'No contact info'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 justify-center sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
                    {customer.unread_messages > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {customer.unread_messages}
                      </Badge>
                    )}
                    {customer.open_leads > 0 && (
                      <Badge variant="default" className="text-xs">
                        {customer.open_leads} leads
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        {/* Recent Leads */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
              <div className="w-full sm:w-auto text-center sm:text-left">
                <CardTitle className="text-base sm:text-lg">Recent Leads</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest lead updates</CardDescription>
              </div>
              <Button variant="ghost" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/leads">
                  View All <ArrowRight className="h-5 w-5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-4">
            {dashboardData.recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No leads yet
              </p>
            ) : (
              dashboardData.recentLeads.map((lead, idx) => (
                <div key={lead.lead_id} className={`flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4 hover:bg-muted/30 rounded-md p-2 transition-colors cursor-pointer`} onClick={() => openModal('lead', lead.lead_id, idx)}>
                  <div className={`w-2 h-2 rounded-full mt-2 sm:mt-0 ${getLeadStatusColor(lead.status)}`} />
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-sm font-medium truncate">
                      {lead.summary || lead.intent || 'Untitled Lead'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1 justify-center sm:justify-start">
                      <span className="text-xs text-muted-foreground capitalize">
                        {lead.status || 'new'}
                      </span>
                      {getUrgencyBadge(lead.urgency, lead.urgency_score)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(lead.updated_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        {/* Recent Messages */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
              <div className="w-full sm:w-auto text-center sm:text-left">
                <CardTitle className="text-base sm:text-lg">Recent Messages</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Latest inbox activity</CardDescription>
              </div>
              <Button variant="ghost" size="lg" asChild className="w-full sm:w-auto">
                <Link to="/inbox">
                  View All <ArrowRight className="h-5 w-5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-4">
            {dashboardData.recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No messages yet
              </p>
            ) : (
              dashboardData.recentMessages.map((message, idx) => (
                <div key={message.inbox_id} className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4 hover:bg-muted/30 rounded-md p-2 transition-colors cursor-pointer" onClick={() => openModal('inbox', message.inbox_id, idx)}>
                  <div className="flex-shrink-0">
                    {message.customer_id ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-1 sm:mt-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-1 sm:mt-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-sm font-medium truncate">
                      {message.name || 'Unknown Sender'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {truncateText(message.message_raw)}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(message.received_at)}
                      </span>
                      {!message.customer_id && (
                        <Badge variant="outline" className="text-xs">
                          Unlinked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Popup Modal for Details */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          {modalLoading ? (
            <LoadingSpinner />
          ) : modalError ? (
            <div className="text-destructive p-4">{modalError}</div>
          ) : modalType === 'customer' ? (
            <CustomerCard customer={modalData} />
          ) : modalType === 'lead' ? (
            <LeadCard lead={modalData} />
          ) : modalType === 'inbox' ? (
            <InboxMessageCard message={modalData} />
          ) : null}
          <div className="flex justify-between items-center mt-4 gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={modalIndex === 0 || modalIndex === null}>Previous</Button>
            <DialogClose asChild>
              <Button variant="outline" size="sm" onClick={closeModal}>Close</Button>
            </DialogClose>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={(() => {
              let list = [];
              if (modalType === 'customer') list = dashboardData.recentCustomers;
              if (modalType === 'lead') list = dashboardData.recentLeads;
              if (modalType === 'inbox') list = dashboardData.recentMessages;
              return modalIndex === null || modalIndex >= list.length - 1;
            })()}>Next</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}