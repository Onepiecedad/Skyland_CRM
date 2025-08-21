import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inboxAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Skeleton } from '../components/ui/skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogClose } from '../components/ui/dialog';
import { DialogTitle } from '../components/ui/dialog';
import { InboxMessageCard } from '../components/InboxMessageCard';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { InboxForm } from '../components/forms/InboxForm';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { Inbox, Mail, MailOpen, Link2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function InboxPage() {
  function getCleanMessageBody(raw, source, channel) {
    if (!raw) return "-";
    if ((source && source.toLowerCase().includes("marinmekaniker")) || (channel && channel.toLowerCase().includes("webform"))) {
      const lines = raw.split(/\r?\n/);
      const filtered = lines.filter(line => {
        const lower = line.toLowerCase();
        if (lower.includes("namn:") || lower.includes("e-post:") || lower.includes("telefon:") || lower.includes("typ av service:") || lower.includes("detta meddelande skickades") || lower.includes("för att svara, använd kundens e-postadress")) {
          return false;
        }
        if (lower.match(/kontaktförfrågan|förfrågan|id:/)) return false;
        return true;
      });
      return filtered.join(" ").replace(/\s{2,}/g, " ").trim() || "-";
    }
    return raw;
  }

  const [loading, setLoading] = useState(false);
  const [inboxItems, setInboxItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, unlinked: 0, processed: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  useEffect(() => {
    setLoading(true);
    inboxAPI.getAll().then(response => {
      console.log('Inbox API response:', response);
      const items = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      setInboxItems(items);
      setStats({
        total: items.length,
        unread: items.filter(i => i.status === 'unread').length,
        unlinked: items.filter(i => !i.customer_id).length,
        processed: items.filter(i => i.status === 'processed').length,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function openMessageModal(id) {
    setModalLoading(true);
    setSelectedMessage(null);
    inboxAPI.getById(id).then(response => {
      setSelectedMessage(response.data);
      setModalLoading(false);
    }).catch(() => {
      setModalError("Failed to load message");
      setModalLoading(false);
    });
  }
  function closeMessageModal() {
    setSelectedMessage(null);
    setModalError(null);
  }
  function handleMessageSuccess() {
    toast.success("Message updated");
  }
  function handleDeleteMessage(id) {
    toast("Message deleted");
  }
  function truncateText(text, max = 120) {
    if (!text) return "-";
    return text.length > max ? text.slice(0, max) + "..." : text;
  }
  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString();
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="text-lg text-muted-foreground">
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full mb-2" />
          ))}
        </div>
        <div className="rounded-md border mt-6">
          <Skeleton className="h-12 w-full mb-2" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">Manage incoming messages and contact forms</p>
        </div>
        <div className="text-lg text-muted-foreground">
          {Array.isArray(inboxItems) ? inboxItems.length : 0} items
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unread}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unlinked</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unlinked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <MailOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-md border mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(inboxItems) && inboxItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No inbox items found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              Array.isArray(inboxItems) && inboxItems.map((item) => (
                <TableRow key={item.inbox_id} className="cursor-pointer hover:bg-muted/30" onClick={() => openMessageModal(item.inbox_id)}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{item.name || '-'}</div>
                      <div className="text-sm text-muted-foreground">{item.email || '-'}</div>
                      <div className="text-sm text-muted-foreground">{item.phone || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-sm">
                      <div className="text-sm">
                        {truncateText(getCleanMessageBody(item.message_raw, item.source, item.channel))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">ID: {item.inbox_id || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Badge variant="outline">{item.source || '-'}</Badge>
                      <div className="text-xs text-muted-foreground">{item.channel || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status || '-'} type="inbox" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.urgency_level || '-'} type="urgency" />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{item.received_at ? formatDate(item.received_at) : '-'}</div>
                  </TableCell>
                  <TableCell>
                    {item.customer_id ? (
                      <Button asChild variant="link" className="h-auto p-0" onClick={e => e.stopPropagation()}>
                        <Link to={`/customers/${item.customer_id}`}>View Customer</Link>
                      </Button>
                    ) : (
                      <Badge variant="outline">Unlinked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {item.customer_id ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/customers/${item.customer_id}`}>View Customer</Link>
                        </Button>
                      ) : null}
                      <InboxForm 
                        message={item} 
                        onSuccess={handleMessageSuccess}
                      >
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </InboxForm>
                      <DeleteConfirmDialog
                        title="Delete Message"
                        description={`Are you sure you want to delete this message from ${item.name || 'Unknown sender'}? This action cannot be undone.`}
                        onConfirm={() => handleDeleteMessage(item.inbox_id)}
                      >
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DeleteConfirmDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!selectedMessage} onOpenChange={closeMessageModal}>
        <DialogContent>
          <DialogTitle>Message Details</DialogTitle>
          <div style={{maxHeight: '60vh', overflowY: 'auto'}}>
            {modalLoading ? (
              <LoadingSpinner />
            ) : modalError ? (
              <div className="text-destructive p-4">{modalError}</div>
            ) : (
              <InboxMessageCard message={selectedMessage} />
            )}
          </div>
          <DialogClose asChild>
            <Button variant="outline" className="mt-4" onClick={closeMessageModal}>Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}