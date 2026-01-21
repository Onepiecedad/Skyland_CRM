import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { leadsAPI } from '../lib/api';
import { formatCustomerName } from '../lib/formatName';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Skeleton } from '../components/ui/skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogClose } from '../components/ui/dialog';
import { LeadCard } from '../components/LeadCard';
import { LeadForm } from '../components/forms/LeadForm';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';
import { Users, TrendingUp, Clock, CheckCircle, Plus, Edit, Trash2, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at desc');

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort: sortBy,
        limit: 100
      };

      const response = await leadsAPI.getAll(params);
      setLeads(response.data || []);

      // Fetch customer names for all unique customer_ids
      const customerIds = [...new Set((response.data || []).map(l => l.customer_id).filter(Boolean))];
      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .in('id', customerIds);

        const customersMap = {};
        (customersData || []).forEach(c => {
          customersMap[c.id] = c;
        });
        setCustomers(customersMap);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Kunde inte hämta förfrågningar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, sortBy]);

  // Pull-to-refresh
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh: fetchLeads,
    threshold: 80
  });

  const openLeadModal = async (leadId) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    try {
      const response = await leadsAPI.getAll({ lead_id: leadId });
      const found = response.data.find(l => l.lead_id === leadId);
      setSelectedLead(found || null);
      if (!found) setModalError("Förfrågan hittades inte");
    } catch (err) {
      setModalError("Kunde inte ladda förfrågan");
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

  const handleLeadSuccess = () => {
    fetchLeads();
  };

  const handleDeleteLead = async (leadId) => {
    try {
      await leadsAPI.delete(leadId);
      toast.success('Förfrågan borttagen');
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  };

  const handleQuickStatusChange = async (e, leadId, newStatus) => {
    e.stopPropagation();
    try {
      await leadsAPI.update(leadId, { status: newStatus });
      const statusLabels = {
        qualified: 'kvalificerad',
        won: 'vunnen',
        lost: 'förlorad'
      };
      toast.success(`Förfrågan markerad som ${statusLabels[newStatus] || newStatus}`);
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Kunde inte uppdatera status');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'd MMM yyyy', { locale: sv });
    } catch {
      return '-';
    }
  };

  const getCustomerDisplayName = (customerId) => {
    const customer = customers[customerId];
    if (!customer) return null;
    return formatCustomerName(customer.name) || customer.email || 'Okänd kund';
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'Ny',
      open: 'Öppen',
      pending: 'Väntar',
      qualified: 'Kvalificerad',
      proposal: 'Offert skickad',
      won: 'Vunnen',
      lost: 'Förlorad',
      on_hold: 'Pausad',
      archived: 'Arkiverad'
    };
    return labels[status] || status;
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
      <div className="space-y-4 p-4" {...handlers}>
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" {...handlers}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Förfrågningar</h1>
          <p className="text-sm text-muted-foreground">Hantera inkommande förfrågningar och offertförslag</p>
        </div>
        <div className="flex items-center gap-2">
          <LeadForm onSuccess={handleLeadSuccess}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Ny förfrågan</span>
              <span className="sm:hidden">Ny</span>
            </Button>
          </LeadForm>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {leads.length} st
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Totalt</p>
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Aktiva</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.open}</p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Kvalificerade</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.qualified}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vunna</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.won}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-muted-foreground hidden sm:block" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla status</SelectItem>
            <SelectItem value="new">Ny</SelectItem>
            <SelectItem value="open">Öppen</SelectItem>
            <SelectItem value="pending">Väntar</SelectItem>
            <SelectItem value="qualified">Kvalificerad</SelectItem>
            <SelectItem value="won">Vunnen</SelectItem>
            <SelectItem value="lost">Förlorad</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Sortering" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at desc">Senast uppdaterad</SelectItem>
            <SelectItem value="created_at desc">Senast skapad</SelectItem>
            <SelectItem value="created_at asc">Äldst först</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lead List */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <div className="space-y-3">
          {leads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Inga förfrågningar</p>
                <p className="text-sm">Det finns inga förfrågningar som matchar dina filter</p>
              </CardContent>
            </Card>
          ) : (
            leads.map((lead) => {
              const customerName = getCustomerDisplayName(lead.customer_id);
              const customer = customers[lead.customer_id];

              return (
                <Card
                  key={lead.lead_id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer active:bg-muted/50"
                  onClick={() => openLeadModal(lead.lead_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
                            {lead.summary || lead.name || 'Namnlös förfrågan'}
                          </h3>
                          {lead.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                              {lead.description}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={lead.status} type="lead" />
                      </div>

                      {/* Customer info */}
                      {(customerName || customer) && (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[150px] sm:max-w-none">{customerName}</span>
                          </div>
                          {customer?.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground hidden sm:flex">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer with date and actions */}
                      <div className="flex items-center justify-between gap-2 pt-1" onClick={e => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">
                          Skapad {formatDate(lead.created_at)}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Quick status buttons */}
                          {lead.status !== 'qualified' && lead.status !== 'won' && lead.status !== 'lost' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => handleQuickStatusChange(e, lead.lead_id, 'qualified')}
                              className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                            >
                              <CheckCircle className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Kvalificera</span>
                            </Button>
                          )}
                          {lead.status === 'qualified' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => handleQuickStatusChange(e, lead.lead_id, 'won')}
                              className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Vunnen</span>
                            </Button>
                          )}

                          {customer && (
                            <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                              <Link to={`/kund/${lead.customer_id}`}>
                                <User className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline">Visa kund</span>
                              </Link>
                            </Button>
                          )}

                          <LeadForm lead={lead} onSuccess={handleLeadSuccess}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </LeadForm>

                          <DeleteConfirmDialog
                            title="Ta bort förfrågan"
                            description={`Är du säker på att du vill ta bort "${lead.summary || lead.name || 'denna förfrågan'}"? Detta kan inte ångras.`}
                            onConfirm={() => handleDeleteLead(lead.lead_id)}
                          >
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </DeleteConfirmDialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
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
            <Button variant="outline" className="mt-4" onClick={closeLeadModal}>Stäng</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}