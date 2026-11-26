import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { api } from '../../api';
import type { PayrollEmployee, CreatePayrollAdvanceInput } from '../../types/payroll';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, Calendar, User, Clock, CreditCard, Layers } from 'lucide-react';

interface AdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePayrollAdvanceInput) => void;
  isLoading: boolean;
}

export const AdvanceModal: React.FC<AdvanceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Keep string states for inputs so user can directly type without forced parsing or NaN/0 lock
  const [employeeId, setEmployeeId] = useState('');
  const [advanceAmountStr, setAdvanceAmountStr] = useState('');
  const [advanceDate, setAdvanceDate] = useState(now.toISOString().split('T')[0]);
  const [deductionStartMonth, setDeductionStartMonth] = useState(currentMonthStr);
  const [installmentsCountStr, setInstallmentsCountStr] = useState('1');
  const [installmentAmountStr, setInstallmentAmountStr] = useState('');
  const [isManualInstallment, setIsManualInstallment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'bank'>('cash');
  const [notes, setNotes] = useState('');

  const { data: employees = [] } = useQuery<PayrollEmployee[]>({
    queryKey: ['payroll_employees', 'active'],
    queryFn: () => api.getPayrollEmployees({ status: 'active' }),
  });

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(employees.length > 0 ? employees[0].id : '');
      setAdvanceAmountStr('');
      setAdvanceDate(new Date().toISOString().split('T')[0]);
      setDeductionStartMonth(currentMonthStr);
      setInstallmentsCountStr('1');
      setInstallmentAmountStr('');
      setIsManualInstallment(false);
      setPaymentMode('cash');
      setNotes('');
    }
  }, [isOpen, employees]);

  // Recalculate monthly installment when total advance or count changes (unless user manually entered installment)
  const recalcInstallment = (totalStr: string, countStr: string) => {
    const total = parseFloat(totalStr);
    const count = parseInt(countStr, 10);
    if (!isNaN(total) && total > 0 && !isNaN(count) && count > 0) {
      const perMonth = Math.round((total / count) * 100) / 100;
      setInstallmentAmountStr(String(perMonth));
    } else {
      setInstallmentAmountStr('');
    }
  };

  const handleAdvanceAmountChange = (val: string) => {
    setAdvanceAmountStr(val);
    if (!isManualInstallment) {
      recalcInstallment(val, installmentsCountStr);
    }
  };

  const handleInstallmentsCountChange = (val: string) => {
    setInstallmentsCountStr(val);
    if (!isManualInstallment) {
      recalcInstallment(advanceAmountStr, val);
    }
  };

  const handleInstallmentAmountChange = (val: string) => {
    setInstallmentAmountStr(val);
    setIsManualInstallment(true);
  };

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  // Generate live schedule preview
  const numAdvance = parseFloat(advanceAmountStr) || 0;
  const numCount = Math.max(1, parseInt(installmentsCountStr, 10) || 1);
  const numInstallment = parseFloat(installmentAmountStr) || 0;

  const generatePreview = () => {
    if (numAdvance <= 0 || !deductionStartMonth) {
      return [];
    }
    const [startYear, startMonth] = deductionStartMonth.split('-').map(Number);
    const previewList = [];
    let remaining = numAdvance;

    for (let i = 0; i < numCount; i++) {
      const monthOffset = startMonth - 1 + i;
      const year = startYear + Math.floor(monthOffset / 12);
      const month = (monthOffset % 12) + 1;
      const dateObj = new Date(year, month - 1, 1);
      const monthLabel = dateObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      const isLast = i === numCount - 1;
      const amount = isLast ? remaining : Math.min(remaining, numInstallment || Math.round((numAdvance / numCount) * 100) / 100);
      remaining = Math.max(0, remaining - amount);

      previewList.push({
        installmentNumber: i + 1,
        monthLabel,
        amount,
      });
    }
    return previewList;
  };

  const schedulePreview = generatePreview();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFloat(advanceAmountStr) || 0;
    const finalCount = Math.max(1, parseInt(installmentsCountStr, 10) || 1);
    const finalInstallment = parseFloat(installmentAmountStr) || (finalAmount > 0 ? Math.round((finalAmount / finalCount) * 100) / 100 : 0);

    onSubmit({
      employee_id: employeeId,
      advance_amount: finalAmount,
      advance_date: advanceDate,
      deduction_start_month: deductionStartMonth,
      installments_count: finalCount,
      installment_amount: finalInstallment,
      payment_mode: paymentMode,
      notes: notes.trim(),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Employee Salary Advance">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Employee Selection */}
        <div className="space-y-1.5">
          <Label htmlFor="employee_id" className="text-sm font-medium flex items-center gap-1.5">
            <User size={15} className="text-primary" /> Select Employee *
          </Label>
          <select
            id="employee_id"
            name="employee_id"
            required
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>-- Select Active Employee --</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.nature_of_work ? `(${emp.nature_of_work})` : ''} - ₹{Number(emp.base_salary).toLocaleString('en-IN')}/{emp.salary_plan_type}
              </option>
            ))}
          </select>
          {selectedEmployee && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Salary: <strong>₹{Number(selectedEmployee.base_salary).toLocaleString('en-IN')}</strong> ({selectedEmployee.salary_plan_type})</span>
              <span>•</span>
              <span>Payment Mode: <strong>{selectedEmployee.payment_mode}</strong></span>
            </p>
          )}
        </div>

        {/* Advance Amount & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="advance_amount" className="text-sm font-medium flex items-center gap-1.5">
              <IndianRupee size={15} className="text-primary" /> Advance Amount (₹) *
            </Label>
            <Input
              id="advance_amount"
              name="advance_amount"
              type="number"
              min="1"
              step="any"
              required
              placeholder="e.g. 25000"
              value={advanceAmountStr}
              onChange={(e) => handleAdvanceAmountChange(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="advance_date" className="text-sm font-medium flex items-center gap-1.5">
              <Calendar size={15} className="text-primary" /> Disbursement Date *
            </Label>
            <Input
              id="advance_date"
              name="advance_date"
              type="date"
              required
              value={advanceDate}
              onChange={(e) => setAdvanceDate(e.target.value)}
            />
          </div>
        </div>

        {/* Deduction & Installments Plan */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers size={14} className="text-primary" /> Repayment & Installment Terms
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deduction_start_month" className="text-xs font-medium">
                Deduction Starts In *
              </Label>
              <Input
                id="deduction_start_month"
                name="deduction_start_month"
                type="month"
                required
                value={deductionStartMonth}
                onChange={(e) => setDeductionStartMonth(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="installments_count" className="text-xs font-medium">
                No. of Installments *
              </Label>
              <Input
                id="installments_count"
                name="installments_count"
                type="number"
                min="1"
                max="60"
                required
                placeholder="1"
                value={installmentsCountStr}
                onChange={(e) => handleInstallmentsCountChange(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="installment_amount" className="text-xs font-medium">
                Installment / Month (₹) *
              </Label>
              <Input
                id="installment_amount"
                name="installment_amount"
                type="number"
                min="1"
                step="any"
                required
                placeholder="Auto-calculated or enter"
                value={installmentAmountStr}
                onChange={(e) => handleInstallmentAmountChange(e.target.value)}
              />
            </div>
          </div>

          {/* Schedule Breakdown Preview */}
          {schedulePreview.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                <Clock size={13} className="text-primary" /> Projected Deduction Schedule:
              </p>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto modern-scrollbar pr-1">
                {schedulePreview.map((item) => (
                  <div
                    key={item.installmentNumber}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md bg-background border border-border shadow-xs"
                  >
                    <span className="font-semibold text-primary">#{item.installmentNumber}</span>
                    <span className="text-muted-foreground">{item.monthLabel}:</span>
                    <span className="font-mono font-medium text-foreground">₹{item.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Mode & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="payment_mode" className="text-sm font-medium flex items-center gap-1.5">
              <CreditCard size={15} className="text-primary" /> Advance Paid By *
            </Label>
            <select
              id="payment_mode"
              name="payment_mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium">Notes / Reason *</Label>
            <Input
              id="notes"
              name="notes"
              required
              placeholder="e.g. Medical emergency, festival advance"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? 'Issuing Advance...' : 'Issue Advance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
