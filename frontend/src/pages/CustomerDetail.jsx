import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Timeline } from '../components/Timeline';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { AlertCircle, RefreshCw, Pencil, Save, X } from 'lucide-react';

export const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [boats, setBoats] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
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
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{customer.name || 'Okänd kund'}</h1>
        <div className="flex gap-2">
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Redigera
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(-1)}>
            Tillbaka
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kontaktinfo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kontakt</CardTitle>
            {isEditing && (
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Spara
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
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
              </>
            ) : (
              <>
                <div>
                  <span className="text-sm font-medium text-muted-foreground block">Namn</span>
                  <span>{customer.name || '-'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground block">Email</span>
                  <span>{customer.email || '-'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground block">Telefon</span>
                  <span>{customer.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground block">Adress</span>
                  <span>{customer.address || '-'}</span>
                  {(customer.postal_code || customer.city) && (
                    <span className="block">{customer.postal_code} {customer.city}</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Båtar */}
        <Card>
          <CardHeader>
            <CardTitle>Båtar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {boats.length === 0 ? (
              <p className="text-muted-foreground text-center py-2">Ingen båt registrerad</p>
            ) : (
              boats.map((boat) => (
                <div key={boat.id} className="p-3 border rounded-lg bg-muted/20">
                  <div className="font-semibold">
                    {boat.name || `${boat.make || ''} ${boat.model || ''}`.trim() || 'Namnlös båt'}
                  </div>
                  {boat.registration_number && (
                    <div className="text-sm text-muted-foreground">
                      Reg: {boat.registration_number}
                    </div>
                  )}
                  {(boat.engine_make || boat.engine_model) && (
                    <div className="text-sm mt-1">
                      Motor: {[boat.engine_make, boat.engine_model].filter(Boolean).join(' ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Ärenden (Leads) */}
        <Card>
          <CardHeader>
            <CardTitle>Ärenden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {leads.length === 0 ? (
              <p className="text-muted-foreground text-center py-2">Inga ärenden</p>
            ) : (
              leads.map((lead) => (
                <div key={lead.id} className="flex justify-between items-start border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <div className="font-medium">
                      {lead.ai_summary || lead.subject || 'Inget ämne'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lead.created_at ? format(new Date(lead.created_at), 'd MMM yyyy', { locale: sv }) : ''}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {lead.status && <Badge variant="outline">{lead.status}</Badge>}
                    {lead.ai_category && <Badge variant="secondary" className="text-xs">{lead.ai_category}</Badge>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tidslinje */}
      <Timeline customerId={id} />
    </div>
  );
};