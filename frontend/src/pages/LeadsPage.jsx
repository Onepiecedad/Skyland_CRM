import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leadsAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LeadForm } from '../components/forms/LeadForm';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { Filter, Users, TrendingUp, Clock, CheckCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at desc');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        intent: intentFilter === 'all' ? undefined : intentFilter,
        urgency: urgencyFilter === 'all' ? undefined : urgencyFilter,
        channel: channelFilter === 'all' ? undefined : channelFilter,
        sort: sortBy,
        limit: 100
      };
      
      const response = await leadsAPI.getAll(params);
      setLeads(response.data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, intentFilter, urgencyFilter, channelFilter, sortBy]);

  const handleLeadSuccess = (updatedLead) => {
    // Refresh the leads list
    fetchLeads();
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await leadsAPI.delete(leadId);
      toast.success('Lead deleted successfully');
      fetchLeads(); // Refresh the list
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error; // Re-throw to be caught by DeleteConfirmDialog
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text, maxLength = 150) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Calculate stats
  const stats = {
    total: leads.length,
    open: leads.filter(lead => ['open', 'new', 'pending'].includes(lead.status)).length,
    qualified: leads.filter(lead => lead.status === 'qualified').length,
    won: leads.filter(lead => lead.status === 'won').length
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Track and manage all sales opportunities</p>
        </div>
        <div className="flex items-center gap-3">
          <LeadForm onSuccess={handleLeadSuccess}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
          </LeadForm>
          <div className="text-sm text-muted-foreground">
            {leads.length} leads
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open/Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.qualified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.won}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/30 rounded-lg">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intent</SelectItem>
            <SelectItem value="contact">Contact</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="diagnostic">Diagnostic</SelectItem>
            <SelectItem value="service_request">Service Request</SelectItem>
          </SelectContent>
        </Select>

        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="webform">Web Form</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at desc">Recently Updated</SelectItem>
            <SelectItem value="created_at desc">Recently Created</SelectItem>
            <SelectItem value="expected_close_date asc">Close Date (Soon)</SelectItem>
            <SelectItem value="expected_close_date desc">Close Date (Far)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Expected Close</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No leads found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.lead_id}>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium">{lead.summary || 'Untitled Lead'}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {truncateText(lead.description, 100)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {lead.lead_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="link" className="h-auto p-0 text-left">
                      <Link to={`/customers/${lead.customer_id}`}>
                        {lead.customer_id}
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status} type="lead" />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.intent || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.urgency} type="urgency" />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.channel || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(lead.expected_close_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(lead.created_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/customers/${lead.customer_id}`}>
                        View Customer
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