import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { customersAPI } from '../../lib/api';
import { toast } from 'sonner';

export function CustomerForm({ customer = null, onSuccess, children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (customer) {
        // Update existing customer
        response = await customersAPI.update(customer.customer_id, formData);
        toast.success('Customer updated successfully');
      } else {
        // Create new customer
        response = await customersAPI.create(formData);
        toast.success('Customer created successfully');
      }

      if (onSuccess) {
        onSuccess(response.data);
      }
      
      setOpen(false);
      
      // Reset form if creating new customer
      if (!customer) {
        setFormData({ name: '', email: '', phone: '' });
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error(customer ? 'Failed to update customer' : 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Edit Customer' : 'New Customer'}
          </DialogTitle>
          <DialogDescription>
            {customer 
              ? 'Make changes to customer information here.' 
              : 'Add a new customer to your CRM.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Customer name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="customer@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={handleChange('phone')}
              placeholder="+1 (555) 123-4567"
            />
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
              {loading ? 'Saving...' : (customer ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}