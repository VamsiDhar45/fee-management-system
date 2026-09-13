import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from './Modal';
import { api } from '../api';
import type { Batch } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const batchSchema = z.object({
  name: z.string().min(2, "Batch name must be at least 2 characters")
});

type BatchFormValues = z.infer<typeof batchSchema>;

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Batch | null;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: { name: '' }
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({ name: initialData.name });
      } else {
        reset({ name: '' });
      }
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: BatchFormValues) => {
    setIsSubmitting(true);
    try {
      if (initialData) {
        await api.updateBatch(initialData.id, data.name);
        toast.success('Batch updated successfully');
      } else {
        await api.createBatch(data.name);
        toast.success('Batch created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving batch:', error);
      toast.error(error.message || 'Failed to save batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title={initialData ? "Edit Batch" : "Add New Batch"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>Batch Name (e.g. Class 10A)</Label>
          <Input
            type="text"
            {...register("name")}
            placeholder="Enter batch name"
          />
          {errors.name && <span className="text-destructive text-xs">{errors.name.message}</span>}
        </div>
        <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-border">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialData ? 'Update Batch' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
