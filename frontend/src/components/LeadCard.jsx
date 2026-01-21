import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCustomerName } from '../lib/formatName';
import { StatusBadge } from './StatusBadge';
import { Button } from "./ui/button";
import { User, Mail, Phone, Calendar, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export function LeadCard({ lead }) {
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
      booking: 'Bokning',
      diagnostic: 'Diagnos',
      service_request: 'Serviceförfrågan'
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

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {customer && (
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/kund/${lead.customer_id}`}>
              <User className="h-4 w-4 mr-2" />
              Visa kund
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
