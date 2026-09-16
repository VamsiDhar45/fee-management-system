import React, { useState } from 'react';
import { Plus, Search, Home, MapPin, Users } from 'lucide-react';
import { api } from '../../api';
import { Modal } from '../Modal';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function HostelsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    address: ''
  });

  const { data: hostels = [], isLoading } = useQuery({
    queryKey: ['hostels'],
    queryFn: () => api.getHostels()
  });

  const filteredHostels = hostels.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: (newHostel: any) => api.createHostel(newHostel),
    onSuccess: () => {
      toast.success('Hostel added successfully');
      queryClient.invalidateQueries({ queryKey: ['hostels'] });
      setIsModalOpen(false);
      setFormData({ name: '', capacity: '', address: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add hostel');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      capacity: formData.capacity ? parseInt(formData.capacity) : null
    };
    mutation.mutate(payload);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading hostels...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search hostels..." 
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} /> Add Hostel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHostels.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            No hostels found. Add a new hostel to get started.
          </div>
        ) : (
          filteredHostels.map(hostel => (
            <Card key={hostel.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg">{hostel.name}</h3>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Home size={16} className="text-primary" />
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  {hostel.capacity && (
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      <span>Capacity: {hostel.capacity}</span>
                    </div>
                  )}
                  {hostel.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{hostel.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Hostel">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Hostel Name</Label>
            <Input
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Boys Hostel A"
            />
          </div>

          <div className="space-y-2">
            <Label>Capacity (Optional)</Label>
            <Input
              type="number"
              min="0"
              value={formData.capacity}
              onChange={e => setFormData({...formData, capacity: e.target.value})}
              placeholder="e.g. 150"
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Hostel'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
