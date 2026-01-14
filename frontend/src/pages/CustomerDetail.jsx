import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Timeline } from '../components/Timeline';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export const CustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [boats, setBoats] = useState([]);
  const [leads, setLeads] = useState([]);
  const [timelineItems, setTimelineItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch customer
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single();

        if (customerError) throw customerError;
        setCustomer(customerData);

        // Fetch boats
        const { data: boatsData } = await supabase
          .from('boats')
          .select('*')
          .eq('customer_id', id);
        setBoats(boatsData || []);

        // Fetch leads (ärenden)
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false });
        setLeads(leadsData || []);

        // Fetch timeline (inbox items connected to these leads)
        if (leadsData && leadsData.length > 0) {
          const leadIds = leadsData.map((l) => l.id);
          const { data: inboxData } = await supabase
            .from('inbox')
            .select('*')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false });
          setTimelineItems(inboxData || []);
        } else {
          setTimelineItems([]);
        }

      } catch (err) {
        console.error('Error fetching customer details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) return <div className="p-8">Laddar...</div>;

  if (!customer) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Kunden hittades inte</h2>
        <Button asChild>
          <Link to="/kunder">Tillbaka till kunder</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
        <Button variant="outline" asChild>
          <Link to="/kunder">Tillbaka</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kontaktinfo */}
        <Card>
          <CardHeader>
            <CardTitle>Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>

        {/* Båtar */}
        <Card>
          <CardHeader>
            <CardTitle>Båtar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {boats.length === 0 ? (
              <p className="text-muted-foreground">Ingen båt registrerad</p>
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
              <p className="text-muted-foreground">Inga ärenden</p>
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
                    <Badge variant="outline">{lead.status}</Badge>
                    {lead.ai_category && <Badge variant="secondary" className="text-xs">{lead.ai_category}</Badge>}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tidslinje */}
      <Timeline items={timelineItems} />
    </div>
  );
};