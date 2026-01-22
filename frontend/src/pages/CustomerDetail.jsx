import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCustomerName } from '../lib/formatName';
import { Timeline } from '../components/Timeline';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { AlertCircle, RefreshCw, Pencil, Save, X, ArrowLeft, Phone, Mail as MailIcon, MapPin, Wrench, Trash2, StickyNote, Ship, Plus } from 'lucide-react';
import { BoatForm } from '../components/forms/BoatForm';
import { LeadForm } from '../components/forms/LeadForm';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog';
import { ConvertLeadToJobButton } from '../components/ConvertLeadToJobButton';
import { boatsAPI, leadsAPI } from '../lib/api';
import { toast } from 'sonner';

// Helper to translate AI categories to Swedish
const translateCategory = (category) => {
  if (!category) return null;
  const translations = {
    'QUOTE': 'Offert',
    'SERVICE': 'Service',
    'REPAIR': 'Reparation',
    'INQUIRY': 'Förfrågan',
    'BOOKING': 'Bokning',
    'COMPLAINT': 'Reklamation',
    'OTHER': 'Övrigt',
    'SPAM': 'Spam'
  };
  return translations[category.toUpperCase()] || category;
};

export const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [boats, setBoats] = useState([]);
  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) {
        if (customerError.code === 'PGRST116') {
          setCustomer(null);
          setLoading(false);
          return;
        }
        throw customerError;
      }
      setCustomer(customerData);
      setEditForm(customerData);

      // Fetch boats
      const { data: boatsData, error: boatsError } = await supabase
        .from('boats')
        .select('*')
        .eq('customer_id', id);

      if (boatsError) throw boatsError;
      setBoats(boatsData || []);

      // Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Kunde inte ladda kunddata. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
          postal_code: editForm.postal_code,
          city: editForm.city,
          notes: editForm.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setCustomer(editForm);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving customer:', err);
      alert('Kunde inte spara ändringar. Försök igen.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm(customer);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const confirmMessage = `Är du säker på att du vill ta bort ${formatCustomerName(customer.name, customer.email)}? Detta tar även bort alla meddelanden, ärenden, båtar och jobb kopplade till denna kund.`;

    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    try {
      // Delete customer - CASCADE handles messages, leads, boats, jobs automatically
      const { error: customerError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (customerError) {
        console.error('Error deleting customer:', customerError);
        throw customerError;
      }

      toast.success('Kund borttagen');
      // Navigate back to customer list
      navigate('/kunder');
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('Kunde inte ta bort kunden. Försök igen.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-muted-foreground">{error}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  Tillbaka
                </Button>
                <Button onClick={fetchData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Försök igen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Kunden hittades inte</h2>
              <p className="text-muted-foreground">Kunden kan ha tagits bort eller så är länken felaktig.</p>
              <Button asChild>
                <Link to="/kunder">Tillbaka till kunder</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Kunder', href: '/kunder' },
          { label: formatCustomerName(customer.name, customer.email) }
        ]}
      />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight truncate">
            {formatCustomerName(customer.name, customer.email)}
          </h1>
        </div>
        <div className="flex gap-2 ml-10 sm:ml-0">
          {!isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Redigera</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {deleting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Radera</span>
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick actions on mobile */}
      {!isEditing && (customer.phone || customer.email) && (
        <div className="flex gap-2 sm:hidden">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
            >
              <Phone className="h-4 w-4" />
              Ring
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium"
            >
              <MailIcon className="h-4 w-4" />
              Mejla
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Kontaktinfo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Kontakt</CardTitle>
            {isEditing && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Spara</span>
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Namn</Label>
                  <Input
                    id="name"
                    value={editForm.name || ''}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    placeholder="Kundnamn"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => handleEditChange('email', e.target.value)}
                    placeholder="email@exempel.se"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={editForm.phone || ''}
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    placeholder="07X-XXX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adress</Label>
                  <Input
                    id="address"
                    value={editForm.address || ''}
                    onChange={(e) => handleEditChange('address', e.target.value)}
                    placeholder="Gatuadress"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postnummer</Label>
                    <Input
                      id="postal_code"
                      value={editForm.postal_code || ''}
                      onChange={(e) => handleEditChange('postal_code', e.target.value)}
                      placeholder="123 45"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ort</Label>
                    <Input
                      id="city"
                      value={editForm.city || ''}
                      onChange={(e) => handleEditChange('city', e.target.value)}
                      placeholder="Stad"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Anteckningar</Label>
                  <textarea
                    id="notes"
                    value={editForm.notes || ''}
                    onChange={(e) => handleEditChange('notes', e.target.value)}
                    placeholder="Egna noteringar om kunden..."
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <MailIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground block">Email</span>
                    <span className="break-all">{customer.email || '-'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Telefon</span>
                    <span>{customer.phone || '-'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Adress</span>
                    <span>{customer.address || '-'}</span>
                    {(customer.postal_code || customer.city) && (
                      <span className="block">{customer.postal_code} {customer.city}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Anteckningar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-yellow-500" />
              Anteckningar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.notes ? (
              <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Inga anteckningar. Klicka på Redigera för att lägga till.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Båtar/Fordon */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Båtar/Fordon
            </CardTitle>
            <BoatForm customerId={id} onSuccess={fetchData}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Lägg till
              </Button>
            </BoatForm>
          </CardHeader>
          <CardContent className="space-y-3">
            {boats.length === 0 ? (
              <p className="text-muted-foreground text-center py-2 text-sm">Inget fordon registrerat</p>
            ) : (
              boats.map((boat) => (
                <div key={boat.id} className="p-3 border rounded-lg bg-muted/20 flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base">
                      {boat.name || `${boat.make || ''} ${boat.model || ''}`.trim() || 'Namnlöst fordon'}
                    </div>
                    {boat.model && (
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {boat.model} {boat.year && `(${boat.year})`}
                      </div>
                    )}
                    {boat.registration_number && (
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Reg: {boat.registration_number}
                      </div>
                    )}
                    {boat.engine_type && (
                      <div className="text-xs sm:text-sm mt-1">
                        Motor: {boat.engine_type}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <BoatForm boat={boat} customerId={id} onSuccess={fetchData}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </BoatForm>
                    <ConfirmDeleteDialog
                      title="Ta bort fordon"
                      description={`Är du säker på att du vill ta bort "${boat.name || 'detta fordon'}"?`}
                      onConfirm={async () => {
                        await boatsAPI.delete(boat.id);
                        toast.success('Fordon borttaget');
                        fetchData();
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ärenden (Leads) */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Ärenden</CardTitle>
            <LeadForm customerId={id} onSuccess={fetchData}>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nytt ärende
              </Button>
            </LeadForm>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads.length === 0 ? (
              <p className="text-muted-foreground text-center py-2 text-sm">Inga ärenden</p>
            ) : (
              leads.map((lead) => (
                <div key={lead.id} className="p-3 border rounded-lg bg-muted/20 flex justify-between items-start gap-2 group">
                  <LeadForm lead={lead} customerId={id} onSuccess={fetchData}>
                    <div className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="font-medium text-sm sm:text-base group-hover:text-primary transition-colors">
                        {lead.ai_summary || lead.subject || 'Inget ämne'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lead.created_at ? format(new Date(lead.created_at), 'd MMM yyyy', { locale: sv }) : ''}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lead.status && <Badge variant="outline" className="text-xs">{lead.status}</Badge>}
                        {lead.ai_category && <Badge variant="secondary" className="text-xs">{translateCategory(lead.ai_category)}</Badge>}
                      </div>
                      {lead.message && (
                        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-2">
                          {lead.message}
                        </p>
                      )}
                    </div>
                  </LeadForm>
                  <div className="flex gap-1 shrink-0">
                    {lead.status !== 'won' && lead.status !== 'lost' && (
                      <ConvertLeadToJobButton
                        lead={lead}
                        onSuccess={fetchData}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      />
                    )}
                    <ConfirmDeleteDialog
                      title="Ta bort ärende"
                      description={`Är du säker på att du vill ta bort ärendet "${lead.subject || lead.ai_summary || 'detta ärende'}"?`}
                      onConfirm={async () => {
                        await leadsAPI.delete(lead.id);
                        toast.success('Ärende borttaget');
                        fetchData();
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Jobb */}
        <Card>
          <CardHeader className="pb-2 sm:pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Jobb
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/jobb/nytt?customer=${id}`}>
                + Nytt jobb
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobs.length === 0 ? (
              <p className="text-muted-foreground text-center py-2 text-sm">Inga jobb</p>
            ) : (
              jobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobb/${job.id}`}
                  className="flex justify-between items-start gap-2 border-b last:border-0 pb-3 last:pb-0 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base truncate">
                      {job.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {job.created_at ? format(new Date(job.created_at), 'd MMM yyyy', { locale: sv }) : ''}
                      {job.scheduled_date && ` • Inbokad ${format(new Date(job.scheduled_date), 'd MMM', { locale: sv })}`}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    {job.status && (
                      <Badge variant="outline" className="text-xs">
                        {job.status === 'pending' && 'Väntande'}
                        {job.status === 'scheduled' && 'Inbokad'}
                        {job.status === 'in_progress' && 'Pågående'}
                        {job.status === 'completed' && 'Klar'}
                        {job.status === 'invoiced' && 'Fakturerad'}
                        {job.status === 'cancelled' && 'Avbruten'}
                      </Badge>
                    )}
                    {job.job_type && (
                      <Badge variant="secondary" className="text-xs">
                        {job.job_type === 'service' && 'Service'}
                        {job.job_type === 'repair' && 'Reparation'}
                        {job.job_type === 'installation' && 'Installation'}
                        {job.job_type === 'inspection' && 'Besiktning'}
                        {job.job_type === 'winterization' && 'Förvintring'}
                        {job.job_type === 'launch' && 'Sjösättning'}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tidslinje */}
      <Timeline customerId={id} customer={customer} />
    </div>
  );
};