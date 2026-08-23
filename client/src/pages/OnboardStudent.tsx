import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Entity, Batch } from '../api';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface InstallmentInput {
  id: string;
  amount_due: number;
  due_date: string;
}

interface FeeComponentInput {
  id: string;
  category_name: string;
  amount: number;
  entity_id: string;
}

export const OnboardStudent: React.FC = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [isResidential, setIsResidential] = useState(false);
  
  // Fee Breakdown State
  const [feeComponents, setFeeComponents] = useState<FeeComponentInput[]>([
    { id: Math.random().toString(36).substr(2, 9), category_name: 'Tuition Fee', amount: 0, entity_id: '' }
  ]);

  const handleResidentialChange = (val: boolean) => {
    setIsResidential(val);
    if (val) {
      setFeeComponents(prev => {
        if (!prev.some(c => c.category_name.toLowerCase() === 'hostel fee')) {
          return [...prev, { id: Math.random().toString(36).substr(2, 9), category_name: 'Hostel Fee', amount: 0, entity_id: '' }];
        }
        return prev;
      });
    } else {
      setFeeComponents(prev => prev.filter(c => c.category_name.toLowerCase() !== 'hostel fee'));
    }
  };
  const totalFee = feeComponents.reduce((sum, comp) => sum + (Number(comp.amount) || 0), 0);
  
  // Installment State
  const [installments, setInstallments] = useState<InstallmentInput[]>([]);
  const [splitCount, setSplitCount] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial data
  useEffect(() => {
    api.getEntities().then(setEntities).catch(console.error);
    api.getBatches().then(setBatches).catch(console.error);
  }, []);

  // Auto-split logic
  useEffect(() => {
    if (totalFee > 0 && splitCount > 0) {
      const baseAmount = Math.floor(totalFee / splitCount);
      const remainder = totalFee % splitCount;
      
      const newInstallments: InstallmentInput[] = Array.from({ length: splitCount }).map((_, idx) => {
        const date = new Date(enrollmentDate);
        date.setMonth(date.getMonth() + idx); // Add 1 month per installment
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          amount_due: idx === splitCount - 1 ? baseAmount + remainder : baseAmount,
          due_date: date.toISOString().split('T')[0]
        };
      });
      setInstallments(newInstallments);
    } else {
      setInstallments([]);
    }
  }, [totalFee, splitCount, enrollmentDate]);

  const handleInstallmentChange = (id: string, field: 'amount_due' | 'due_date', value: any) => {
    setInstallments(prev => prev.map(inst => 
      inst.id === id ? { ...inst, [field]: field === 'amount_due' ? Number(value) : value } : inst
    ));
  };

  const handleComponentChange = (id: string, field: 'category_name' | 'amount' | 'entity_id', value: any) => {
    setFeeComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, [field]: field === 'amount' ? Number(value) : value } : comp
    ));
  };

  const addFeeComponent = () => {
    setFeeComponents(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), category_name: '', amount: 0, entity_id: '' }
    ]);
  };

  const removeFeeComponent = (id: string) => {
    setFeeComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const addManualInstallment = () => {
    const date = new Date(enrollmentDate);
    date.setMonth(date.getMonth() + installments.length);
    setInstallments(prev => [
      ...prev, 
      { id: Math.random().toString(36).substr(2, 9), amount_due: 0, due_date: date.toISOString().split('T')[0] }
    ]);
  };

  const removeInstallment = (id: string) => {
    setInstallments(prev => prev.filter(inst => inst.id !== id));
  };

  const currentTotal = installments.reduce((sum, inst) => sum + (Number(inst.amount_due) || 0), 0);
  const isBalanced = currentTotal === totalFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isBalanced) {
      setError(`Installment total (₹${currentTotal}) does not match Total Fee (₹${totalFee}).`);
      return;
    }

    if (installments.some(i => !i.due_date)) {
      setError('All installments must have a due date.');
      return;
    }

    if (feeComponents.some(c => !c.category_name.trim())) {
      setError('All fee components must have a category name.');
      return;
    }

    if (feeComponents.some(c => !c.entity_id)) {
      setError('All fee components must be assigned to an entity.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.onboardStudent(
        {
          batch_id: selectedBatch,
          name,
          contact_number: contactNumber,
          enrollment_date: enrollmentDate,
          admission_number: admissionNumber
        },
        totalFee,
        installments,
        feeComponents
      );
      navigate('/students');
    } catch (err: any) {
      setError(err.message || 'Failed to onboard student.');
      setIsSubmitting(false);
    }
  };

  const availableBatches = batches;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/students">
            <ArrowLeft size={24} />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboard New Student</h1>
          <p className="text-muted-foreground mt-1">Register a student and configure their fee structure.</p>
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Student Name" />
            </div>
            <div className="space-y-2">
              <Label>Admission Number</Label>
              <Input type="text" required value={admissionNumber} onChange={e => setAdmissionNumber(e.target.value)} placeholder="e.g. ADM1234" />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input 
                type="tel" 
                required
                maxLength={10}
                pattern="[0-9]{10}"
                title="Please enter a valid 10-digit mobile number"
                value={contactNumber} 
                onChange={e => setContactNumber(e.target.value.replace(/\D/g, ''))} 
                placeholder="e.g. 9876543210" 
              />
            </div>
            <div className="space-y-2">
              <Label>Batch / Class</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50" 
                required 
                value={selectedBatch} 
                onChange={e => setSelectedBatch(e.target.value)} 
              >
                <option value="">Select Batch</option>
                {availableBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Enrollment Date</Label>
              <Input type="date" required value={enrollmentDate} onChange={e => setEnrollmentDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Is Residential?</Label>
              <div className="flex gap-6 items-center h-10 px-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                  <input 
                    type="radio" 
                    name="residential" 
                    className="w-4 h-4 text-primary focus:ring-primary"
                    checked={isResidential} 
                    onChange={() => handleResidentialChange(true)} 
                  /> Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                  <input 
                    type="radio" 
                    name="residential" 
                    className="w-4 h-4 text-primary focus:ring-primary"
                    checked={!isResidential} 
                    onChange={() => handleResidentialChange(false)} 
                  /> No
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Configuration</CardTitle>
            <CardDescription>Define the fee breakdown and configure installments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Fee Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border pb-2">Fee Breakdown</h3>
              <div className="space-y-3">
                {feeComponents.map((comp) => (
                  <div key={comp.id} className="flex gap-4 items-end">
                    <div className="space-y-2 flex-[2]">
                      <Label>Category Name</Label>
                      <Input 
                        type="text" 
                        required 
                        value={comp.category_name} 
                        onChange={e => handleComponentChange(comp.id, 'category_name', e.target.value)} 
                        placeholder="e.g. Tuition Fee"
                      />
                    </div>
                    <div className="space-y-2 flex-[2]">
                      <Label>Entity</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        required 
                        value={comp.entity_id} 
                        onChange={e => handleComponentChange(comp.id, 'entity_id', e.target.value)}
                      >
                        <option value="">Select Entity</option>
                        {entities.map(ent => (
                          <option key={ent.id} value={ent.id}>{ent.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label>Amount (₹)</Label>
                      <Input 
                        type="number" 
                        min="0" 
                        required 
                        value={comp.amount === 0 ? '' : comp.amount} 
                        onChange={e => handleComponentChange(comp.id, 'amount', e.target.value)} 
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => removeFeeComponent(comp.id)} 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 border-destructive/20"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button type="button" variant="outline" className="w-full border-dashed" onClick={addFeeComponent}>
                <Plus size={16} className="mr-2" /> Add Fee Component
              </Button>
              
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border border-border mt-4">
                <span className="text-lg font-bold">Total Calculated Fee:</span>
                <span className="text-xl font-black text-primary">₹{totalFee.toLocaleString()}</span>
              </div>
            </div>

            {/* Installments */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-border pb-2">
                <h3 className="text-lg font-semibold">Installment Planner</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Auto-Split:</span>
                  <select 
                    value={splitCount} 
                    onChange={e => setSplitCount(Number(e.target.value))}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="1">Lump Sum (1)</option>
                    <option value="2">2 Terms</option>
                    <option value="3">3 Terms</option>
                    <option value="4">4 Terms</option>
                  </select>
                </div>
              </div>

              {installments.length > 0 && (
                <div className="space-y-3 mt-4">
                  {installments.map((inst, index) => (
                    <div key={inst.id} className="flex gap-4 items-end">
                      <div className="space-y-2 flex-1">
                        <Label>Term {index + 1} Amount (₹)</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          required 
                          value={inst.amount_due === 0 ? '' : inst.amount_due} 
                          onChange={e => handleInstallmentChange(inst.id, 'amount_due', e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label>Due Date</Label>
                        <Input 
                          type="date" 
                          required 
                          value={inst.due_date} 
                          onChange={e => handleInstallmentChange(inst.id, 'due_date', e.target.value)} 
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        onClick={() => removeInstallment(inst.id)} 
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 border-destructive/20"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button type="button" variant="outline" className="w-full border-dashed mt-4" onClick={addManualInstallment}>
                <Plus size={16} className="mr-2" /> Add Custom Installment
              </Button>

              <div className={`mt-6 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center border ${isBalanced ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
                <div className={`font-semibold flex items-center gap-2 ${isBalanced ? 'text-green-600 dark:text-green-500' : 'text-destructive'}`}>
                  {isBalanced ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  {isBalanced ? 'Installments match Total Fee' : 'Installments do not match Total Fee'}
                </div>
                <div className="text-right mt-2 sm:mt-0">
                  <div className="text-sm font-medium text-muted-foreground">Allocated: ₹{currentTotal.toLocaleString()}</div>
                  <div className="text-sm font-medium text-muted-foreground">Total Fee: ₹{totalFee.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link to="/students">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || !isBalanced} className="min-w-[150px]">
            {isSubmitting ? 'Onboarding...' : 'Onboard Student'}
          </Button>
        </div>
      </form>
    </div>
  );
};
