import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { api } from '../../api';
import type { PayrollTaxSettings } from '../../types/payroll';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Percent, IndianRupee, Calendar, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface TaxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const TaxSettingsModal: React.FC<TaxSettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<PayrollTaxSettings>({
    id: 'default',
    tds_threshold: 50000,
    tds_rate_percent: 10,
    pt_threshold: 15000,
    pt_flat_amount: 200,
    free_leaves_per_month: 2,
  });

  const { data: currentSettings, isLoading } = useQuery<PayrollTaxSettings>({
    queryKey: ['payroll_tax_settings'],
    queryFn: () => api.getPayrollTaxSettings(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (currentSettings) {
      setFormData(currentSettings);
    }
  }, [currentSettings, isOpen]);

  const mutation = useMutation({
    mutationFn: (updated: PayrollTaxSettings) =>
      api.updatePayrollTaxSettings({
        tds_threshold: Number(updated.tds_threshold) || 0,
        tds_rate_percent: Number(updated.tds_rate_percent) || 0,
        pt_threshold: Number(updated.pt_threshold) || 0,
        pt_flat_amount: Number(updated.pt_flat_amount) || 0,
        free_leaves_per_month: Number(updated.free_leaves_per_month) || 2,
      }),
    onSuccess: () => {
      toast.success('Payroll tax slabs & rules saved!');
      queryClient.invalidateQueries({ queryKey: ['payroll_tax_settings'] });
      if (onSaved) onSaved();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save settings');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payroll Tax Slabs & Rules Configuration">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Configure default deduction formulas for automatic TDS, Professional Tax / Statutory deductions, and free monthly leave allowances.
        </p>

        {/* Section 1: TDS Rules */}
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Percent size={14} className="text-primary" /> Tax Deducted at Source (TDS) Rules
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tds_threshold" className="text-xs font-medium">
                TDS Exemption Monthly Limit (₹)
              </Label>
              <Input
                id="tds_threshold"
                name="tds_threshold"
                type="number"
                min="0"
                step="any"
                required
                value={formData.tds_threshold}
                onChange={handleChange}
              />
              <span className="text-[10px] text-muted-foreground">Gross earnings below this have ₹0 TDS</span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tds_rate_percent" className="text-xs font-medium">
                TDS Rate (%)
              </Label>
              <Input
                id="tds_rate_percent"
                name="tds_rate_percent"
                type="number"
                min="0"
                max="100"
                step="any"
                required
                value={formData.tds_rate_percent}
                onChange={handleChange}
              />
              <span className="text-[10px] text-muted-foreground">% deducted on the taxable gross excess</span>
            </div>
          </div>
        </div>

        {/* Section 2: Statutory / Professional Tax */}
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <IndianRupee size={14} className="text-primary" /> Statutory / Professional Tax (PT)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pt_threshold" className="text-xs font-medium">
                PT Applicability Threshold (₹)
              </Label>
              <Input
                id="pt_threshold"
                name="pt_threshold"
                type="number"
                min="0"
                step="any"
                required
                value={formData.pt_threshold}
                onChange={handleChange}
              />
              <span className="text-[10px] text-muted-foreground">Applies when monthly gross is ≥ this amount</span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pt_flat_amount" className="text-xs font-medium">
                Flat PT / Statutory Deduction (₹)
              </Label>
              <Input
                id="pt_flat_amount"
                name="pt_flat_amount"
                type="number"
                min="0"
                step="any"
                required
                value={formData.pt_flat_amount}
                onChange={handleChange}
              />
              <span className="text-[10px] text-muted-foreground">Monthly flat statutory cut (e.g. ₹200)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Leave Rules */}
        <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar size={14} className="text-primary" /> Free Leave Allowance
          </h4>

          <div className="space-y-1 max-w-xs">
            <Label htmlFor="free_leaves_per_month" className="text-xs font-medium">
              Free Leaves Allowed Per Month
            </Label>
            <Input
              id="free_leaves_per_month"
              name="free_leaves_per_month"
              type="number"
              min="0"
              max="31"
              required
              value={formData.free_leaves_per_month}
              onChange={handleChange}
            />
            <span className="text-[10px] text-muted-foreground">
              Leaves exceeding this will trigger the penalty column and per-day deduction
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || isLoading} className="gap-2">
            <Save size={15} />
            {mutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
