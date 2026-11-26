import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { api, type Entity } from '../../api';
import type { PayrollEmployee, CreatePayrollEmployeeInput } from '../../types/payroll';
import { useQuery } from '@tanstack/react-query';
import { Building2, IndianRupee, CreditCard, User, Phone, MapPin, Calendar, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePayrollEmployeeInput) => void;
  isLoading: boolean;
  initialData?: PayrollEmployee | null;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialData,
}) => {
  const [formData, setFormData] = useState<CreatePayrollEmployeeInput>({
    name: '',
    gender: 'male',
    phone: '',
    address: '',
    nature_of_work: '',
    entity_id: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    payment_mode: 'cash',
    salary_plan_type: 'monthly',
    base_salary: 0,
    status: 'active',
    bank_account_number: '',
    bank_name: '',
    bank_ifsc: '',
    bank_branch: '',
  });

  const { data: entities = [] } = useQuery<Entity[]>({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        gender: initialData.gender || 'male',
        phone: initialData.phone || '',
        address: initialData.address || '',
        nature_of_work: initialData.nature_of_work || '',
        entity_id: initialData.entity_id || '',
        date_of_joining: initialData.date_of_joining ? initialData.date_of_joining.split('T')[0] : new Date().toISOString().split('T')[0],
        payment_mode: initialData.payment_mode || 'cash',
        salary_plan_type: initialData.salary_plan_type || 'monthly',
        base_salary: initialData.base_salary || 0,
        status: initialData.status || 'active',
        bank_account_number: initialData.bank_account_number || '',
        bank_name: initialData.bank_name || '',
        bank_ifsc: initialData.bank_ifsc || '',
        bank_branch: initialData.bank_branch || '',
      });
    } else {
      setFormData({
        name: '',
        gender: 'male',
        phone: '',
        address: '',
        nature_of_work: '',
        entity_id: entities.length > 0 ? entities[0].id : '',
        date_of_joining: new Date().toISOString().split('T')[0],
        payment_mode: 'cash',
        salary_plan_type: 'monthly',
        base_salary: 0,
        status: 'active',
        bank_account_number: '',
        bank_name: '',
        bank_ifsc: '',
        bank_branch: '',
      });
    }
  }, [initialData, isOpen, entities]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === 'phone') {
      // Keep only numeric digits and max 10 digits
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: digitsOnly }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    onSubmit({
      ...formData,
      entity_id: formData.entity_id || null,
      base_salary: Number(formData.base_salary) || 0,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Employee Details' : 'Onboard New Employee'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1.5">
              <User size={15} className="text-primary" /> Full Name *
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. Ramesh Sharma"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gender" className="text-sm font-medium">Gender *</Label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
              <Phone size={15} className="text-primary" /> Phone Number (10 digits) *
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              maxLength={10}
              pattern="[0-9]{10}"
              title="Please enter a valid 10-digit mobile number"
              placeholder="e.g. 9876543210"
              value={formData.phone || ''}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nature_of_work" className="text-sm font-medium flex items-center gap-1.5">
              <Briefcase size={15} className="text-primary" /> Nature of Work / Role *
            </Label>
            <Input
              id="nature_of_work"
              name="nature_of_work"
              required
              placeholder="e.g. Cook, Warden, Faculty, Cleaner"
              value={formData.nature_of_work || ''}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entity_id" className="text-sm font-medium flex items-center gap-1.5">
              <Building2 size={15} className="text-primary" /> Organization / Entity *
            </Label>
            <select
              id="entity_id"
              name="entity_id"
              required
              value={formData.entity_id || ''}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="" disabled>-- Select Organization --</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date_of_joining" className="text-sm font-medium flex items-center gap-1.5">
              <Calendar size={15} className="text-primary" /> Date of Joining *
            </Label>
            <Input
              id="date_of_joining"
              name="date_of_joining"
              type="date"
              required
              value={formData.date_of_joining}
              onChange={handleChange}
            />
          </div>

          {initialData && (
            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-sm font-medium">Employment Status</Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive / Resigned</option>
              </select>
            </div>
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-sm font-medium flex items-center gap-1.5">
            <MapPin size={15} className="text-primary" /> Address *
          </Label>
          <textarea
            id="address"
            name="address"
            required
            rows={2}
            placeholder="Complete residential address"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={formData.address || ''}
            onChange={handleChange}
          />
        </div>

        {/* Salary & Payment Configuration */}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <IndianRupee size={16} className="text-primary" /> Compensation & Payment Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="salary_plan_type" className="text-sm font-medium">Salary Plan *</Label>
              <select
                id="salary_plan_type"
                name="salary_plan_type"
                value={formData.salary_plan_type}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="monthly">Monthly Fixed</option>
                <option value="hourly">Hourly Basis</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="base_salary" className="text-sm font-medium">
                {formData.salary_plan_type === 'monthly' ? 'Monthly Salary (₹) *' : 'Hourly Rate (₹) *'}
              </Label>
              <Input
                id="base_salary"
                name="base_salary"
                type="number"
                min="0"
                step="any"
                required
                placeholder="0.00"
                value={formData.base_salary}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment_mode" className="text-sm font-medium">Payment Mode *</Label>
              <select
                id="payment_mode"
                name="payment_mode"
                value={formData.payment_mode}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conditional Bank Details */}
        {formData.payment_mode === 'bank' && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard size={14} className="text-primary" /> Bank Account Information *
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bank_name" className="text-xs">Bank Name *</Label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  required
                  placeholder="e.g. State Bank of India"
                  value={formData.bank_name || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bank_account_number" className="text-xs">Account Number *</Label>
                <Input
                  id="bank_account_number"
                  name="bank_account_number"
                  required
                  placeholder="e.g. 123456789012"
                  value={formData.bank_account_number || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bank_ifsc" className="text-xs">IFSC Code *</Label>
                <Input
                  id="bank_ifsc"
                  name="bank_ifsc"
                  required
                  placeholder="e.g. SBIN0001234"
                  value={formData.bank_ifsc || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bank_branch" className="text-xs">Branch Name *</Label>
                <Input
                  id="bank_branch"
                  name="bank_branch"
                  required
                  placeholder="e.g. Main Branch"
                  value={formData.bank_branch || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? 'Saving...' : initialData ? 'Update Employee' : 'Onboard Employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
