import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { leadsAPI } from "../lib/api";
import { LoadingSpinner } from "../components/LoadingSpinner";

export function LeadDetail() {
  const { lead_id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLead() {
      try {
        setLoading(true);
        const response = await leadsAPI.getById(lead_id);
        setLead(response.data);
      } catch (err) {
        setError("Failed to load lead");
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [lead_id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-destructive">{error}</div>;
  if (!lead) return <div>No lead found.</div>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-card rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-2">Lead: {lead.summary || lead.intent || "Untitled Lead"}</h2>
      <p className="text-muted-foreground mb-2">Status: {lead.status}</p>
      <div className="mb-4">
        <strong>Customer ID:</strong> {lead.customer_id}<br />
        <strong>Urgency:</strong> {lead.urgency}<br />
        <strong>Channel:</strong> {lead.channel}
      </div>
      <div className="mb-4">
        <strong>Description:</strong>
        <p className="mt-2 whitespace-pre-line">{lead.description}</p>
      </div>
      {/* Add more fields as needed */}
    </div>
  );
}
