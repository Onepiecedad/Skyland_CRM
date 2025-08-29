import React from "react";
import { toast } from 'sonner';
import { Button } from "./ui/button";

export function LeadCard({ lead }) {
  if (!lead) return null;
  return (
    <div className="max-w-xl w-full mx-auto p-4 sm:p-6 bg-card rounded-lg shadow flex flex-col gap-2 sm:gap-4 text-base sm:text-lg">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Lead Details</h2>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Intent:</strong> <span className="break-words">{lead.intent || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Status:</strong> <span>{lead.status || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Channel:</strong> <span>{lead.channel || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Source:</strong> <span>{lead.source || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Customer ID:</strong> <span>{lead.customer_id || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Created:</strong> <span>{lead.created_at ? new Date(lead.created_at).toLocaleString() : "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Updated:</strong> <span>{lead.updated_at ? new Date(lead.updated_at).toLocaleString() : "-"}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2 sm:mt-4">ID: {lead.lead_id}</div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6 w-full">
  <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => { window.dispatchEvent(new CustomEvent('edit-lead', { detail: lead })); toast.success('Edit lead opened'); }}>Edit</Button>
  <Button size="lg" variant="ghost" className="text-destructive w-full sm:w-auto" onClick={() => { window.dispatchEvent(new CustomEvent('delete-lead', { detail: lead })); toast.info('Delete lead dialog opened'); }}>Delete</Button>
      </div>
    </div>
  );
}
