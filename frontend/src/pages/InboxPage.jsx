import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inboxAPI } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Inbox, Mail, MailOpen, Clock, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export function InboxPage() {
  const [inboxItems, setInboxItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('received_at desc');

  const fetchInboxItems = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        channel: channelFilter === 'all' ? undefined : channelFilter,
        unlinked_only: unlinkedOnly,
        sort: sortBy,
        limit: 100
      };
      
      const response = await inboxAPI.getAll(params);
      setInboxItems(response.data);
    } catch (error) {
      console.error('Error fetching inbox items:', error);
      toast.error('Failed to fetch inbox items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxItems();
  }, [statusFilter, typeFilter, sourceFilter, channelFilter, unlinkedOnly, sortBy]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Calculate stats
  const stats = {
    total: inboxItems.length,
    unread: inboxItems.filter(item => item.status === 'unread').length,
    unlinked: inboxItems.filter(item => !item.customer_id).length,
    processed: inboxItems.filter(item => item.status === 'processed').length
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">Manage incoming messages and contact forms</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {inboxItems.length} items
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="unlinked-only"
            checked={unlinkedOnly}
            onCheckedChange={setUnlinkedOnly}
          />
          <label
            htmlFor="unlinked-only"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Unlinked only
          </label>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="contact_form">Contact Form</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="marinmekaniker.nu">marinmekaniker.nu</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="direct">Direct</SelectItem>
          </SelectContent>
        </Select>

        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="webform">Web Form</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="received_at desc">Recently Received</SelectItem>
            <SelectItem value="received_at asc">Oldest First</SelectItem>
            <SelectItem value="created_at desc">Recently Created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inboxItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No inbox items found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              inboxItems.map((item) => (
                <TableRow key={item.inbox_id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{item.name || 'Unnamed Contact'}</div>
                      {item.email && (
                        <div className="text-sm text-muted-foreground">{item.email}</div>
                      )}
                      {item.phone && (
                        <div className="text-sm text-muted-foreground">{item.phone}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-sm">
                      <div className="text-sm">{truncateText(item.message_raw)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {item.inbox_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.service_type || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline">{item.source || 'N/A'}</Badge>
                      {item.channel && (
                        <div className="text-xs text-muted-foreground">{item.channel}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} type="inbox" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.urgency_level} type="urgency" />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(item.received_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.customer_id ? (
                      <Button asChild variant="link" className="h-auto p-0">
                        <Link to={`/customers/${item.customer_id}`}>
                          View Customer
                        </Link>
                      </Button>
                    ) : (
                      <Badge variant="outline">Unlinked</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.customer_id && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/customers/${item.customer_id}`}>
                          View Details
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}