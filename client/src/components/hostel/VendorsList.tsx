import React, { useState } from 'react';
import { Plus, Search, Building2, Phone, MapPin, Edit2 } from 'lucide-react';
import { api } from '../../api';
import { Modal } from '../Modal';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function VendorsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    contact_number: '',
    address: ''
  });



  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['hostel_vendors'],
    queryFn: () => api.getVendors()
  });

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.contact_number && v.contact_number.includes(searchTerm))
  );

  const mutation = useMutation({
    mutationFn: (newVendor: any) => api.createVendor(newVendor),
    onSuccess: () => {
      toast.success('Vendor added successfully');
      queryClient.invalidateQueries({ queryKey: ['hostel_vendors'] });
      setIsModalOpen(false);
      setFormData({ name: '', contact_number: '', address: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add vendor');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; vendor: any }) => api.updateVendor(data.id, data.vendor),
    onSuccess: () => {
      toast.success('Vendor updated successfully');
      queryClient.invalidateQueries({ queryKey: ['hostel_vendors'] });
      setIsModalOpen(false);
      setEditId(null);
      setFormData({ name: '', contact_number: '', address: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update vendor');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({ id: editId, vendor: formData });
    } else {
      mutation.mutate(formData);
    }
  };

  const openEditModal = (vendor: any) => {
    setEditId(vendor.id);
    setFormData({
      name: vendor.name,
      contact_number: vendor.contact_number || '',
      address: vendor.address || ''
    });
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading vendors...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search vendors..." 
            className="pl-10"
          />
        </div>
        <Button onClick={() => {
          setEditId(null);
          setFormData({ name: '', contact_number: '', address: '' });
          setIsModalOpen(true);
        }} className="gap-2">
          <Plus size={18} /> Add Vendor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            No vendors found. Add a new vendor to get started.
          </div>
        ) : (
          filteredVendors.map(vendor => (
            <Card key={vendor.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Building2 size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{vendor.name}</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(vendor)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Edit2 size={16} />
                  </Button>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  {vendor.contact_number && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} />
                      <span>{vendor.contact_number}</span>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{vendor.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Vendor" : "Add New Vendor"}>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-2">
            <Label>Vendor Name</Label>
            <Input
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Ramu Provisions"
            />
          </div>

          <div className="space-y-2">
            <Label>Contact Number (Optional)</Label>
            <Input
              value={formData.contact_number}
              onChange={e => setFormData({...formData, contact_number: e.target.value})}
              placeholder="e.g. 9876543210"
            />
          </div>

          <div className="space-y-2">
            <Label>Address (Optional)</Label>
            <textarea
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              placeholder="Full address details"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || updateMutation.isPending}>
              {mutation.isPending || updateMutation.isPending ? 'Saving...' : (editId ? 'Update Vendor' : 'Save Vendor')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
