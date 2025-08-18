import React from 'react';
import { Badge } from './ui/badge';

export function StatusBadge({ status, type = 'lead' }) {
  const getVariantAndText = (status, type) => {
    if (type === 'lead') {
      switch (status?.toLowerCase()) {
        case 'open':
        case 'new':
          return { variant: 'default', text: status };
        case 'pending':
          return { variant: 'secondary', text: status };
        case 'qualified':
          return { variant: 'default', text: status };
        case 'proposal':
          return { variant: 'secondary', text: status };
        case 'won':
          return { variant: 'default', text: status, className: 'bg-green-600 hover:bg-green-700' };
        case 'lost':
          return { variant: 'destructive', text: status };
        case 'on_hold':
          return { variant: 'secondary', text: 'On Hold' };
        case 'archived':
          return { variant: 'outline', text: status };
        default:
          return { variant: 'outline', text: status || 'Unknown' };
      }
    }
    
    if (type === 'urgency') {
      switch (status?.toLowerCase()) {
        case 'low':
          return { variant: 'outline', text: status };
        case 'medium':
          return { variant: 'secondary', text: status };
        case 'high':
          return { variant: 'default', text: status, className: 'bg-orange-600 hover:bg-orange-700' };
        case 'urgent':
          return { variant: 'destructive', text: status };
        default:
          return { variant: 'outline', text: status || 'Unknown' };
      }
    }

    if (type === 'inbox') {
      switch (status?.toLowerCase()) {
        case 'unread':
          return { variant: 'destructive', text: 'Unread' };
        case 'read':
          return { variant: 'secondary', text: 'Read' };
        case 'processed':
          return { variant: 'default', text: 'Processed' };
        default:
          return { variant: 'outline', text: status || 'Unknown' };
      }
    }

    return { variant: 'outline', text: status || 'Unknown' };
  };

  const { variant, text, className } = getVariantAndText(status, type);
  
  return (
    <Badge variant={variant} className={className}>
      {text}
    </Badge>
  );
}