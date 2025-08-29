import React from "react";
import { toast } from 'sonner';
import { Button } from "./ui/button";

export function CustomerCard({ customer }) {
  if (!customer) return null;
  return (
    <div className="max-w-xl w-full mx-auto p-4 sm:p-6 bg-card rounded-lg shadow flex flex-col gap-2 sm:gap-4 text-base sm:text-lg">
      <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Customer Details</h2>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Name:</strong> <span className="break-words">{customer.name || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Email:</strong> <span className="break-words">{customer.email || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Phone:</strong> <span className="break-words">{customer.phone || "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Created:</strong> <span>{customer.created_at ? new Date(customer.created_at).toLocaleString() : "-"}</span>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <strong>Updated:</strong> <span>{customer.updated_at ? new Date(customer.updated_at).toLocaleString() : "-"}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2 sm:mt-4">ID: {customer.customer_id}</div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6 w-full">
  <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => { window.dispatchEvent(new CustomEvent('edit-customer', { detail: customer })); toast.success('Edit customer opened'); }}>Edit</Button>
  <Button size="lg" variant="ghost" className="text-destructive w-full sm:w-auto" onClick={() => { window.dispatchEvent(new CustomEvent('delete-customer', { detail: customer })); toast.info('Delete customer dialog opened'); }}>Delete</Button>
      </div>
    </div>
  );
}
