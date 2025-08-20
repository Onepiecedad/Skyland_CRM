import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { inboxAPI } from '../../lib/api';
import { toast } from 'sonner';

export function InboxForm({ message, onSuccess, children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: message?.name || '',
    email: message?.email || '',
    phone: message?.phone || '',
    source: message?.source || '',
    channel: message?.channel || '',
    type: message?.type || '',
    service_type: message?.service_type || '',
    message_raw: message?.message_raw || '',
    status: message?.status || 'unread',
    urgency_level: message?.urgency_level || 'low',
    urgency_score: message?.urgency_score || 1,
    customer_id: message?.customer_id || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up customer_id if empty string
      const submitData = {
        ...formData,
        customer_id: formData.customer_id.trim() || null,
        urgency_score: parseInt(formData.urgency_score) || 1
      };
      
      const response = await inboxAPI.update(message.inbox_id, submitData);
      toast.success('Message updated successfully');

      if (onSuccess) {
        onSuccess(response.data);
      }
      
      setOpen(false);
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Update message details and link to customers.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange('name')}
                placeholder="Sender name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="sender@example.com"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service_type">Service Type</Label>
              <Input
                id="service_type"
                value={formData.service_type}
                onChange={handleInputChange('service_type')}
                placeholder="e.g., marine service, repair"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message_raw">Message</Label>
            <Textarea
              id="message_raw"
              value={formData.message_raw}
              onChange={handleInputChange('message_raw')}
              placeholder="Message content"
              rows={4}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={handleChange('status')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="urgency_level">Urgency Level</Label>
              <Select value={formData.urgency_level} onValueChange={handleChange('urgency_level')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="urgency_score">Score (1-10)</Label>
              <Input
                id="urgency_score"
                type="number"
                min="1"
                max="10"
                value={formData.urgency_score}
                onChange={handleInputChange('urgency_score')}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={handleInputChange('source')}
                placeholder="e.g., website, email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Input
                id="channel"
                value={formData.channel}
                onChange={handleInputChange('channel')}
                placeholder="e.g., webform, direct"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={handleInputChange('type')}
                placeholder="e.g., inquiry, complaint"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customer_id">Link to Customer ID</Label>
            <Input
              id="customer_id"
              value={formData.customer_id}
              onChange={handleInputChange('customer_id')}
              placeholder="Enter customer UUID to link this message"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to unlink from customer
            </p>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Update Message'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}