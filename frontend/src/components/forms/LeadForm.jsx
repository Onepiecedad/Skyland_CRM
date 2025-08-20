import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { leadsAPI } from '../../lib/api';
import { toast } from 'sonner';

export function LeadForm({ lead = null, customerId = null, onSuccess, children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: customerId || lead?.customer_id || '',
    intent: lead?.intent || '',
    status: lead?.status || 'new',
    channel: lead?.channel || '',
    summary: lead?.summary || '',
    description: lead?.description || '',
    urgency: lead?.urgency || 'low',
    urgency_score: lead?.urgency_score || 1,
    expected_close_date: lead?.expected_close_date || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_id) {
      toast.error('Customer ID is required');
      return;
    }
    
    setLoading(true);

    try {
      let response;
      if (lead) {
        // Update existing lead
        const { customer_id, ...updateData } = formData; // Don't update customer_id
        response = await leadsAPI.update(lead.lead_id, updateData);
        toast.success('Lead updated successfully');
      } else {
        // Create new lead
        response = await leadsAPI.create(formData);
        toast.success('Lead created successfully');
      }

      if (onSuccess) {
        onSuccess(response.data);
      }
      
      setOpen(false);
      
      // Reset form if creating new lead
      if (!lead) {
        setFormData({
          customer_id: customerId || '',
          intent: '',
          status: 'new',
          channel: '',
          summary: '',
          description: '',
          urgency: 'low',
          urgency_score: 1,
          expected_close_date: ''
        });
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error(lead ? 'Failed to update lead' : 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (value) => {
    if (field === 'urgency_score') {
      setFormData(prev => ({
        ...prev,
        [field]: parseInt(value) || 1
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lead ? 'Edit Lead' : 'New Lead'}
          </DialogTitle>
          <DialogDescription>
            {lead 
              ? 'Make changes to lead information here.' 
              : 'Add a new lead to track opportunities.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!customerId && (
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer ID *</Label>
              <Input
                id="customer_id"
                value={formData.customer_id}
                onChange={handleInputChange('customer_id')}
                placeholder="Enter customer UUID"
                required
                disabled={!!lead} // Can't change customer for existing lead
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Input
              id="summary"
              value={formData.summary}
              onChange={handleInputChange('summary')}
              placeholder="Brief lead summary"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleInputChange('description')}
              placeholder="Detailed description of the lead"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={handleChange('status')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select value={formData.urgency} onValueChange={handleChange('urgency')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intent">Intent</Label>
              <Input
                id="intent"
                value={formData.intent}
                onChange={handleInputChange('intent')}
                placeholder="e.g., service_request, quote"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Input
                id="channel"
                value={formData.channel}
                onChange={handleInputChange('channel')}
                placeholder="e.g., webform, email, phone"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="urgency_score">Urgency Score (1-10)</Label>
              <Input
                id="urgency_score"
                type="number"
                min="1"
                max="10"
                value={formData.urgency_score}
                onChange={handleInputChange('urgency_score')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={handleInputChange('expected_close_date')}
              />
            </div>
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
              {loading ? 'Saving...' : (lead ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}