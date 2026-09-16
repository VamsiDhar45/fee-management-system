import React, { useState } from 'react';
import { Plus, Search, Package, Layers, Edit2 } from 'lucide-react';
import { api } from '../../api';
import { Modal } from '../Modal';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function ItemsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    default_unit: ''
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['hostel_items'],
    queryFn: () => api.getItems()
  });

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.category && i.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const mutation = useMutation({
    mutationFn: (newItem: any) => api.createItem(newItem),
    onSuccess: () => {
      toast.success('Item added successfully');
      queryClient.invalidateQueries({ queryKey: ['hostel_items'] });
      setIsModalOpen(false);
      setFormData({ name: '', category: '', default_unit: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add item');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; item: any }) => api.updateItem(data.id, data.item),
    onSuccess: () => {
      toast.success('Item updated successfully');
      queryClient.invalidateQueries({ queryKey: ['hostel_items'] });
      setIsModalOpen(false);
      setEditId(null);
      setFormData({ name: '', category: '', default_unit: '' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update item');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateMutation.mutate({ id: editId, item: formData });
    } else {
      mutation.mutate(formData);
    }
  };

  const openEditModal = (item: any) => {
    setEditId(item.id);
    setFormData({
      name: item.name,
      category: item.category || '',
      default_unit: item.default_unit || ''
    });
    setIsModalOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading items...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search items by name or category..." 
            className="pl-10"
          />
        </div>
        <Button onClick={() => {
          setEditId(null);
          setFormData({ name: '', category: '', default_unit: '' });
          setIsModalOpen(true);
        }} className="gap-2">
          <Plus size={18} /> Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            No items found. Add a new item to get started.
          </div>
        ) : (
          filteredItems.map(item => (
            <Card key={item.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center">
                    <div className="p-1.5 bg-primary/10 rounded-md">
                      <Package size={16} className="text-primary" />
                    </div>
                    <h3 className="font-semibold">{item.name}</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(item)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Edit2 size={16} />
                  </Button>
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  {item.category && (
                    <div className="flex items-center gap-2">
                      <Layers size={14} />
                      <span>{item.category}</span>
                    </div>
                  )}
                  {item.default_unit && (
                    <div className="inline-block mt-2 px-2 py-0.5 bg-muted rounded text-xs font-medium">
                      Unit: {item.default_unit}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Item" : "Add New Item"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item Name</Label>
            <Input
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Sona Masuri Rice"
            />
          </div>

          <div className="space-y-2">
            <Label>Category (Optional)</Label>
            <Input
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              placeholder="e.g. Groceries, Vegetables"
            />
          </div>

          <div className="space-y-2">
            <Label>Default Unit <span className="text-destructive">*</span></Label>
            <select
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.default_unit}
              onChange={e => setFormData({...formData, default_unit: e.target.value})}
            >
              <option value="">Select Unit</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="ml">ml</option>
              <option value="pcs">pcs</option>
              <option value="pkts">pkts</option>
              <option value="boxes">boxes</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || updateMutation.isPending}>
              {mutation.isPending || updateMutation.isPending ? 'Saving...' : (editId ? 'Update Item' : 'Save Item')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
