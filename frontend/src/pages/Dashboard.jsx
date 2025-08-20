import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customersAPI, leadsAPI, inboxAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Button } from '../components/ui/button';
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

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    customers: { total: 0, hasUnread: 0, hasOpenLeads: 0 },
    leads: { total: 0, open: 0, urgent: 0 },
    inbox: { total: 0, unlinked: 0, processed: 0 },
    recentCustomers: [],
    recentLeads: [],
    recentMessages: []
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch customers overview
      const customersResponse = await customersAPI.getOverview({ limit: 5 });
      const allCustomersResponse = await customersAPI.getOverview({ limit: 1000 });
      
      // Fetch leads
      const leadsResponse = await leadsAPI.getAll({ limit: 5, sort: 'updated_at desc' });
      const allLeadsResponse = await leadsAPI.getAll({ limit: 1000 });
      
      // Fetch inbox
      const inboxResponse = await inboxAPI.getAll({ limit: 5, sort: 'received_at desc' });
      const allInboxResponse = await inboxAPI.getAll({ limit: 1000 });
      
      // Calculate metrics
      const allCustomers = allCustomersResponse.data;
      const allLeads = allLeadsResponse.data;
      const allInbox = allInboxResponse.data;
      
      const customersWithUnread = allCustomers.filter(c => c.unread_messages > 0).length;
      const customersWithOpenLeads = allCustomers.filter(c => c.open_leads > 0).length;
      
      const openLeads = allLeads.filter(l => l.status !== 'closed' && l.status !== 'lost').length;
      const urgentLeads = allLeads.filter(l => l.urgency === 'high' || l.urgency_score > 7).length;
      
      const unlinkedMessages = allInbox.filter(m => !m.customer_id).length;
      const processedMessages = allInbox.filter(m => m.status === 'processed').length;
      
      setDashboardData({
        customers: {
          total: allCustomers.length,
          hasUnread: customersWithUnread,
          hasOpenLeads: customersWithOpenLeads
        },
        leads: {
          total: allLeads.length,
          open: openLeads,
          urgent: urgentLeads
        },
        inbox: {
          total: allInbox.length,
          unlinked: unlinkedMessages,
          processed: processedMessages
        },
        recentCustomers: customersResponse.data.slice(0, 5),
        recentLeads: leadsResponse.data.slice(0, 5),
        recentMessages: inboxResponse.data.slice(0, 5)
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getLeadStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'contacted': return 'bg-yellow-500';
      case 'qualified': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      case 'lost': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyBadge = (urgency, urgencyScore) => {
    if (urgency === 'high' || urgencyScore > 7) {
      return <Badge variant="destructive">High</Badge>;
    } else if (urgency === 'medium' || urgencyScore > 4) {
      return <Badge variant="default">Medium</Badge>;
    } else {
      return <Badge variant="outline">Low</Badge>;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your CRM overview</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/customers">
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.customers.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.customers.hasUnread} with unread messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.leads.open}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.leads.urgent} urgent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inbox Messages</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.inbox.total}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.inbox.unlinked} unlinked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Recent Customers */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Customers</CardTitle>
                <CardDescription>Latest customer activities</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/customers">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.recentCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No customers yet
              </p>
            ) : (
              dashboardData.recentCustomers.map((customer) => (
                <div key={customer.customer_id} className="flex items-center justify-between space-x-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {customer.name || 'Unnamed Customer'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.email || customer.phone || 'No contact info'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Leads</CardTitle>
                <CardDescription>Latest lead updates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/leads">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No leads yet
              </p>
            ) : (
              dashboardData.recentLeads.map((lead) => (
                <div key={lead.lead_id} className="flex items-start space-x-4">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getLeadStatusColor(lead.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {lead.summary || lead.intent || 'Untitled Lead'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Messages</CardTitle>
                <CardDescription>Latest inbox activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inbox">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No messages yet
              </p>
            ) : (
              dashboardData.recentMessages.map((message) => (
                <div key={message.inbox_id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {message.customer_id ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link to="/customers">
                <Users className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">View Customers</div>
                  <div className="text-sm text-muted-foreground">Manage customer relationships</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link to="/leads">
                <Target className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Manage Leads</div>
                  <div className="text-sm text-muted-foreground">Track sales opportunities</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link to="/inbox">
                <Mail className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Check Inbox</div>
                  <div className="text-sm text-muted-foreground">Review messages</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto py-4" asChild>
              <Link to="/inbox?unlinked_only=true">
                <AlertCircle className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Unlinked Messages</div>
                  <div className="text-sm text-muted-foreground">Link to customers</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}