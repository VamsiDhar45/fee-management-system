import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { api } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const entitySchema = z.object({
  name: z.string().min(2, "Entity name must be at least 2 characters"),
  description: z.string().optional(),
  has_gst: z.boolean()
});

type EntityFormValues = z.infer<typeof entitySchema>;

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddEntityModal: React.FC<AddEntityModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EntityFormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: { name: '', description: '', has_gst: false }
  });

  const onSubmit = async (data: EntityFormValues) => {
    setIsSubmitting(true);
    try {
      await api.createEntity(data.name, data.description || '', data.has_gst);
      toast.success('Entity created successfully');
      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating entity:', error);
      toast.error(error.message || 'Failed to create entity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Add New Entity">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Entity Name (e.g. Gurukul North)</Label>
          <Input
            type="text"
            {...register("name")}
            autoFocus
            placeholder="Enter entity name"
          />
          {errors.name && <span className="text-destructive text-xs">{errors.name.message}</span>}
        </div>
        <div className="space-y-2">
          <Label>Description (Optional)</Label>
          <textarea
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            {...register("description")}
            rows={3}
            placeholder="Enter entity description"
          />
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <input 
            type="checkbox" 
            id="has_gst" 
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            {...register("has_gst")} 
          />
          <Label htmlFor="has_gst" className="cursor-pointer font-medium text-sm">
            Enable GST Tax Invoices
          </Label>
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Entity'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
