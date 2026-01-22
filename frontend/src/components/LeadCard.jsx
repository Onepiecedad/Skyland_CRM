import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { leadsAPI } from '../lib/api';
import { formatCustomerName } from '../lib/formatName';
import { StatusBadge } from './StatusBadge';
import { Button } from "./ui/button";
import { ConvertLeadToJobButton } from './ConvertLeadToJobButton';
import { User, Mail, Phone, Calendar, Clock, Tag, Anchor, Wrench, Sparkles, AlertCircle, Archive } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

export function LeadCard({ lead, onSuccess }) {
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    async function fetchCustomer() {
      if (lead?.customer_id) {
        const { data } = await supabase
          .from('customers')
          .select('id, name, email, phone')
          .eq('id', lead.customer_id)
          .single();
        setCustomer(data);
      }
    }
    fetchCustomer();
  }, [lead?.customer_id]);

  if (!lead) return null;

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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'd MMMM yyyy, HH:mm', { locale: sv });
    } catch {
      return '-';
    }
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
    return labels[status] || status || '-';
  };

  const getIntentLabel = (intent) => {
    const labels = {
      contact: 'Kontakt',
      quote: 'Offert',
      QUOTE: 'Offert',
      booking: 'Bokning',
      BOOKING: 'Bokning',
      diagnostic: 'Diagnos',
      service_request: 'Serviceförfrågan',
      SERVICE: 'Service',
      REPAIR: 'Reparation',
      INQUIRY: 'Förfrågan',
      COMPLAINT: 'Reklamation',
      OTHER: 'Övrigt'
    };
    return labels[intent] || intent || '-';
  };

  const getChannelLabel = (channel) => {
    const labels = {
      email: 'E-post',
      phone: 'Telefon',
      webform: 'Webbformulär',
      referral: 'Referens'
    };
    return labels[channel] || channel || '-';
  };

  const customerName = customer ? formatCustomerName(customer.name) || customer.email : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center pb-4 border-b">
        <h2 className="text-xl font-bold">Förfrågningsdetaljer</h2>
        {lead.summary && (
          <p className="text-muted-foreground mt-1">{lead.summary}</p>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex justify-center">
        <StatusBadge status={lead.status} type="lead" />
      </div>

      {/* Description */}
      {lead.description && (
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-sm">{lead.description}</p>
        </div>
      )}

      {/* AI Insights */}
      {(lead.ai_summary || lead.ai_category || lead.extracted_data) && (
        <div className="bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-4 space-y-3 border border-purple-200/30">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
            <Sparkles className="h-4 w-4" />
            <span>AI-analys</span>
          </div>

          {/* AI Summary */}
          {lead.ai_summary && (
            <p className="text-sm">{lead.ai_summary}</p>
          )}

          {/* AI Category & Priority */}
          <div className="flex flex-wrap gap-2">
            {lead.ai_category && (
              <Badge variant="secondary" className="text-xs">
                {translateCategory(lead.ai_category)}
              </Badge>
            )}
            {lead.ai_priority && (
              <Badge variant={lead.ai_priority === 'high' ? 'destructive' : 'outline'} className="text-xs">
                {lead.ai_priority === 'high' ? 'Brådskande' : lead.ai_priority === 'medium' ? 'Normal' : 'Låg'}
              </Badge>
            )}
          </div>

          {/* Extracted Boat/Motor Data */}
          {lead.extracted_data && Object.keys(lead.extracted_data).length > 0 && (
            <div className="pt-2 border-t border-purple-200/30 space-y-2">
              {(lead.extracted_data.boat_make || lead.extracted_data.boat_model) && (
                <div className="flex items-center gap-2 text-sm">
                  <Anchor className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    <strong>Båt:</strong> {[lead.extracted_data.boat_make, lead.extracted_data.boat_model, lead.extracted_data.boat_year].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {(lead.extracted_data.engine_make || lead.extracted_data.engine_model) && (
                <div className="flex items-center gap-2 text-sm">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    <strong>Motor:</strong> {[lead.extracted_data.engine_make, lead.extracted_data.engine_model, lead.extracted_data.engine_year].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {lead.extracted_data.service_type && (
                <div className="text-sm">
                  <strong>Tjänst:</strong> {lead.extracted_data.service_type}
                </div>
              )}
              {lead.extracted_data.problem_description && (
                <div className="text-sm text-muted-foreground italic">
                  "{lead.extracted_data.problem_description}"
                </div>
              )}
            </div>
          )}

          {/* AI Confidence */}
          {lead.ai_confidence && (
            <div className="text-xs text-muted-foreground">
              AI-säkerhet: {Math.round(lead.ai_confidence * 100)}%
            </div>
          )}
        </div>
      )}

      {/* Customer Info */}
      {customer && (
        <div className="bg-primary/5 rounded-lg p-4 space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground mb-2">Kund</h3>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{customerName}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                {customer.email}
              </a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                {customer.phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Status</p>
          <p className="font-medium">{getStatusLabel(lead.status)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Typ</p>
          <p className="font-medium">{getIntentLabel(lead.intent)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Kanal</p>
          <p className="font-medium">{getChannelLabel(lead.channel)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Källa</p>
          <p className="font-medium">{lead.source || '-'}</p>
        </div>
      </div>

      {/* Dates */}
      <div className="border-t pt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Skapad: {formatDate(lead.created_at)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Uppdaterad: {formatDate(lead.updated_at)}</span>
        </div>
      </div>

      {/* Original Message */}
      {lead.message && (
        <div className="border-t pt-4">
          <h3 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Originalmeddelande
          </h3>
          <div className="bg-muted/30 rounded-lg p-3 max-h-[200px] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap break-words">{lead.message}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
        {lead.status !== 'won' && lead.status !== 'lost' && lead.status !== 'archived' && (
          <ConvertLeadToJobButton
            lead={lead}
            customer={customer}
            onSuccess={onSuccess}
            variant="default"
            size="sm"
            className="flex-1"
          />
        )}
        {customer && (
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/kund/${lead.customer_id}`}>
              <User className="h-4 w-4 mr-2" />
              Visa kund
            </Link>
          </Button>
        )}
        {lead.status !== 'won' && lead.status !== 'lost' && lead.status !== 'archived' && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={async () => {
              try {
                await leadsAPI.update(lead.id || lead.lead_id, { status: 'archived' });
                toast.success('Förfrågan arkiverad');
                onSuccess?.();
              } catch (err) {
                toast.error('Kunde inte arkivera');
              }
            }}
          >
            <Archive className="h-4 w-4 mr-2" />
            Arkivera
          </Button>
        )}
      </div>
    </div>
  );
}
