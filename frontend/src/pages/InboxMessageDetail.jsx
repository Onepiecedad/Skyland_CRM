import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { inboxAPI } from "../lib/api";
import { LoadingSpinner } from "../components/LoadingSpinner";

export function InboxMessageDetail() {
  const { inbox_id } = useParams();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMessage() {
      try {
        setLoading(true);
        const response = await inboxAPI.getById(inbox_id);
        setMessage(response.data);
      } catch (err) {
        setError("Failed to load message");
      } finally {
        setLoading(false);
      }
    }
    fetchMessage();
  }, [inbox_id]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-destructive">{error}</div>;
  if (!message) return <div>No message found.</div>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-card rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-2">Message from {message.name || "Unknown Sender"}</h2>
      <p className="text-muted-foreground mb-2">Received: {new Date(message.received_at).toLocaleString()}</p>
      <div className="mb-4">
        <strong>Email:</strong> {message.email || "-"}<br />
        <strong>Phone:</strong> {message.phone || "-"}
      </div>
      <div className="mb-4">
        <strong>Message:</strong>
        <p className="mt-2 whitespace-pre-line">{message.message_raw}</p>
      </div>
      {/* Add more fields as needed */}
    </div>
  );
}
