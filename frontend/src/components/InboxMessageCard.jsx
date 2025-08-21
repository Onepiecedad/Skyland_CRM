import React from "react";
import { toast } from 'sonner';
import { Button } from "./ui/button";

export function InboxMessageCard({ message }) {
  if (!message) return null;

  // Helper to clean up message body for form submissions
  function getCleanMessageBody(raw, source, channel) {
    if (!raw) return "-";
    // Only clean if it's a form submission
    if ((source && source.toLowerCase().includes("marinmekaniker")) || (channel && channel.toLowerCase().includes("webform"))) {
      // Remove lines containing name, email, phone, and boilerplate
      const lines = raw.split(/\r?\n/);
      const filtered = lines.filter(line => {
        const lower = line.toLowerCase();
        if (lower.includes("namn:") || lower.includes("e-post:") || lower.includes("telefon:") || lower.includes("typ av service:") || lower.includes("detta meddelande skickades") || lower.includes("för att svara, använd kundens e-postadress")) {
          return false;
        }
        // Remove lines that are just the subject or ID
        if (lower.match(/kontaktförfrågan|förfrågan|id:/)) return false;
        return true;
      });
      // Remove empty lines and trim
      return filtered.join("\n").replace(/\n{2,}/g, "\n").trim() || "-";
    }
    return raw;
  }

  const cleanMessage = getCleanMessageBody(message.message_raw, message.source, message.channel);

  return (
    <div className="max-w-xl w-full mx-auto p-4 sm:p-6 bg-card rounded-lg shadow flex flex-col gap-2 sm:gap-4 text-base sm:text-lg">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Message from {message.name || "-"}</h2>
      <p className="text-muted-foreground mb-2 text-center">Received: {message.received_at ? new Date(message.received_at).toLocaleString() : "-"}</p>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Email:</strong> <span className="break-words">{message.email || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Phone:</strong> <span className="break-words">{message.phone || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Source:</strong> <span>{message.source || "-"}</span>
        <strong>Channel:</strong> <span>{message.channel || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Service Type:</strong> <span>{message.service_type || "-"}</span>
      </div>
      <div className="mb-4">
        <strong>Message:</strong>
        <div className="mt-2 whitespace-pre-line bg-muted/30 p-3 rounded text-sm sm:text-base">{cleanMessage}</div>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Status:</strong> <span>{message.status || "-"}</span>
        <strong>Urgency:</strong> <span>{message.urgency_level || "-"}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2 sm:mt-4">ID: {message.inbox_id || "-"}</div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6 w-full">
        <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => { window.dispatchEvent(new CustomEvent('edit-inbox', { detail: message })); toast.success('Edit message opened'); }}>Edit</Button>
        <Button size="lg" variant="ghost" className="text-destructive w-full sm:w-auto" onClick={() => { window.dispatchEvent(new CustomEvent('delete-inbox', { detail: message })); toast.info('Delete message dialog opened'); }}>Delete</Button>
      </div>
    </div>
  );
}
