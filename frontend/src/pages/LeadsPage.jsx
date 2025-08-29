import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leadsAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Skeleton } from '../components/ui/skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogClose } from '../components/ui/dialog';
import { LeadCard } from '../components/LeadCard';
import { LeadForm } from '../components/forms/LeadForm';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { Filter, Users, TrendingUp, Clock, CheckCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  // Add modalLoading state to fix 'modalLoading is not defined' error
  const [modalLoading, setModalLoading] = useState(false);

  const openLeadModal = async (leadId) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    try {
      const response = await leadsAPI.getAll({ lead_id: leadId });
      // leadsAPI.getAll returns an array, so find the lead by id
      const found = response.data.find(l => l.lead_id === leadId);
      setSelectedLead(found || null);
      if (!found) setModalError("Lead not found");
    } catch (err) {
      setModalError("Failed to load lead");
      setSelectedLead(null);
    } finally {
      setModalLoading(false);
    }
  };
  const closeLeadModal = () => {
    setModalOpen(false);
    setSelectedLead(null);
    setModalError(null);
  };
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
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full mb-2" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leads</h1>
          <p className="text-muted-foreground mb-4">Track and manage all sales opportunities</p>
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

      {/* Card List */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {leads.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No leads found matching your criteria
            </div>
          ) : (
            leads.map((lead) => (
              <div key={lead.lead_id} className="bg-card rounded-xl shadow p-6 flex flex-col gap-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openLeadModal(lead.lead_id)}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{lead.summary || 'Untitled Lead'}</span>
                  <StatusBadge status={lead.status} type="lead" />
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {truncateText(lead.description, 120)}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <span className="font-medium">Customer:</span>{' '}
                    <span className="text-primary">{lead.customer_id}</span>
                  </div>
                  <div>
                    <span className="font-medium">Intent:</span>{' '}
                    <Badge variant="outline">{lead.intent || 'N/A'}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Urgency:</span>{' '}
                    <StatusBadge status={lead.urgency} type="urgency" />
                  </div>
                  <div>
                    <span className="font-medium">Channel:</span>{' '}
                    <Badge variant="outline">{lead.channel || 'N/A'}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Expected Close:</span>{' '}
                    {formatDate(lead.expected_close_date)}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {formatDate(lead.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/customers/${lead.customer_id}`}>View Customer</Link>
                  </Button>
                  <LeadForm lead={lead} onSuccess={handleLeadSuccess}>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </LeadForm>
                  <DeleteConfirmDialog
                    title="Delete Lead"
                    description={`Are you sure you want to delete this lead "${lead.summary || 'Untitled Lead'}"? This action cannot be undone.`}
                    onConfirm={() => handleDeleteLead(lead.lead_id)}
                  >
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DeleteConfirmDialog>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogContent>
          {modalLoading ? (
            <LoadingSpinner />
          ) : modalError ? (
            <div className="text-destructive p-4">{modalError}</div>
          ) : (
            <LeadCard lead={selectedLead} />
          )}
          <DialogClose asChild>
            <Button variant="outline" className="mt-4" onClick={closeLeadModal}>Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}