import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Search, IndianRupee, ArrowRight, CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from '../components/Receipt';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';

export const FeeCollection: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [reference, setReference] = useState('');
  
  // Allocations: component_id -> amount
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReceipts, setSuccessReceipts] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  const { data: defaulters = [] } = useQuery({
    queryKey: ['defaulters'],
    queryFn: () => api.getDefaulters()
  });

  const { data: recentTransactionsRes } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: () => api.getTransactions(1, 5)
  });
  const recentTransactions = recentTransactionsRes?.data || [];

  // Fetch all students for search
  useEffect(() => {
    api.getStudents(1, 1000)
      .then(res => setStudents(res.data || []))
      .catch(console.error);
  }, []);

  // Fetch details when student selected
  useEffect(() => {
    if (selectedStudentId) {
      setLoadingDetails(true);
      api.getStudentFeeDetails(selectedStudentId)
        .then(data => {
          setStudentDetails(data);
          setSelectedInstallmentId('');
          setAmount('');
          setAllocations({});
          setSuccessReceipts(null);
        })
        .catch(console.error)
        .finally(() => setLoadingDetails(false));
    } else {
      setStudentDetails(null);
    }
  }, [selectedStudentId]);

  const filteredStudents = Array.isArray(students) ? students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.contact_number && s.contact_number.includes(searchTerm))
  ) : [];

  const handleAmountChange = (val: string) => {
    const numVal: number | '' = val ? Number(val) : '';
    
    let maxAllowed = 0;
    if (selectedInstallmentId && studentDetails) {
      const inst = studentDetails.fee_structures[0].fee_installments.find((i: any) => i.id === selectedInstallmentId);
      if (inst) {
        const paid = studentDetails.incomes?.filter((inc: any) => inc.installment_id === selectedInstallmentId).reduce((s: number, i: any) => s + Number(i.amount), 0) || 0;
        maxAllowed = Number(inst.amount_due) - paid;
      }
    }

    let finalVal: number | '' = numVal;
    if (typeof finalVal === 'number' && maxAllowed > 0 && finalVal > maxAllowed) {
      finalVal = maxAllowed;
    }

    setAmount(finalVal);

    // Auto-allocate across unpaid components
    if (typeof finalVal === 'number' && finalVal > 0 && studentDetails?.fee_structures?.[0]?.fee_components) {
      const newAllocations: Record<string, number> = {};
      let remaining = finalVal;

      for (const comp of studentDetails.fee_structures[0].fee_components) {
        if (remaining <= 0) break;
        
        const paid = studentDetails.incomes?.flatMap((inc: any) => inc.income_allocations || [])
          .filter((alloc: any) => alloc.fee_component_id === comp.id)
          .reduce((sum: number, alloc: any) => sum + Number(alloc.amount), 0) || 0;
        
        const compBalance = Number(comp.amount) - paid;
        
        if (compBalance > 0) {
          const allocateToComp = Math.min(compBalance, remaining);
          newAllocations[comp.id] = allocateToComp;
          remaining -= allocateToComp;
        }
      }
      setAllocations(newAllocations);
    } else {
      setAllocations({});
    }
  };

  const handleAllocationChange = (compId: string, val: string, maxBalance: number) => {
    let numVal = Number(val);
    if (numVal > maxBalance) {
      numVal = maxBalance; // Cap it to the max balance
    }
    
    setAllocations(prev => ({
      ...prev,
      [compId]: numVal
    }));
  };

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  const parsedAmount = typeof amount === 'number' ? amount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedInstallmentId) {
      setError('Please select an installment to pay against.');
      return;
    }
    if (parsedAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    const hasComponents = studentDetails.fee_structures?.[0]?.fee_components?.length > 0;
    if (hasComponents && totalAllocated !== parsedAmount) {
      setError(`Allocated amount (₹${totalAllocated}) must equal Received amount (₹${parsedAmount}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      
      const allocData = Object.entries(allocations)
        .filter(([_, amt]) => amt > 0)
        .map(([id, amt]) => {
          const comp = studentDetails.fee_structures?.[0]?.fee_components?.find((c: any) => c.id === id);
          return { 
            fee_component_id: id, 
            amount: amt,
            entity_id: comp?.entity_id || studentDetails.entity_id,
            entity_name: comp?.entities?.name || studentDetails.entities?.name || ''
          };
        });

      const incomes = await api.recordPayment({
        student_id: studentDetails.id,
        installment_id: selectedInstallmentId,
        payment_mode: paymentMode,
        reference_number: reference,
        allocations: allocData
      });
      
      setSuccessReceipts(incomes);
      // Refresh details
      const updatedDetails = await api.getStudentFeeDetails(selectedStudentId);
      setStudentDetails(updatedDetails);
      
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successReceipts && successReceipts.length > 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="text-center mb-8">
          <CheckCircle2 size={64} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-3xl font-bold tracking-tight mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground">Generated {successReceipts.length} receipt(s) for this payment.</p>
        </div>
        
        <div className="flex flex-col gap-12 receipt-area-container">
          {successReceipts.map((receipt, idx) => (
            <div key={receipt.id} className={idx > 0 ? "pt-12 border-t-2 border-dashed border-border" : ""}>
              <Receipt 
                receipt={receipt} 
                studentDetails={studentDetails} 
                onClose={() => {}} 
                showSuccessIcon={false} 
              />
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8 no-print">
          <Button size="lg" onClick={() => setSuccessReceipts(null)}>
            Record Another Payment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Fee Collection</h1>
        <p className="text-muted-foreground mt-1">Record payments and generate receipts.</p>
      </header>

      {/* Step 1: Student Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center border-b border-border pb-4 mb-4">
            <Search className="text-muted-foreground" size={20} />
            <input 
              type="text" 
              placeholder="Search student by name or contact number..." 
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setSelectedStudentId(''); }}
              className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          <AnimatePresence>
            {!selectedStudentId && searchTerm && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="max-h-64 overflow-y-auto"
              >
                {filteredStudents.length === 0 ? (
                  <div className="text-muted-foreground p-4 text-center">No students found.</div>
                ) : (
                  <div className="space-y-1">
                    {filteredStudents.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => { setSelectedStudentId(s.id); setSearchTerm(s.name); }}
                        className="flex justify-between items-center p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-sm text-muted-foreground">{s.entities?.name} • {s.batches?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Mini Dashboard for Quick Actions (Hidden when a student is selected) */}
      {!selectedStudentId && !searchTerm && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming & Overdue */}
          <Card className="border-destructive/20 shadow-sm overflow-hidden">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-4">
              <CardTitle className="flex items-center gap-2 text-destructive text-lg">
                <AlertCircle size={20} />
                Upcoming & Overdue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {defaulters && defaulters.length > 0 ? (
                <div className="divide-y divide-border">
                  {defaulters.slice(0, 5).map((defaulter: any) => (
                    <div 
                      key={defaulter.id} 
                      className="p-4 flex justify-between items-center hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedStudentId(defaulter.fee_structures?.students?.id)}
                    >
                      <div>
                        <div className="font-medium text-sm">{defaulter.fee_structures?.students?.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {defaulter.fee_structures?.students?.batches?.name} • Due: {new Date(defaulter.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-destructive">₹{defaulter.amountOwed.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                  {defaulters.length > 5 && (
                    <div className="p-3 text-center text-xs font-medium text-muted-foreground bg-muted/20">
                      + {defaulters.length - 5} more overdue installments
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <CheckCircle2 size={32} className="opacity-20 mb-3 text-green-500" />
                  <p>No overdue payments right now!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock size={20} className="text-muted-foreground" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentTransactions.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {tx.students?.name}
                          {tx.receipt_number && <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{tx.receipt_number}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                          <span>{tx.payment_mode}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">₹{Number(tx.amount).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <FileText size={32} className="opacity-20 mb-3" />
                  <p>No recent transactions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {loadingDetails && <div className="py-12 text-center text-muted-foreground">Loading details...</div>}

      {/* Step 2: Student Fee Details & Payment Form */}
      {studentDetails && !loadingDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Left Column: Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Student Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{studentDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Branch</span>
                  <span>{studentDetails.entities?.name}</span>
                </div>
                
                {studentDetails.fee_structures?.[0] && (
                  <div className="pt-4 mt-2 border-t border-border space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Fee</span>
                      <span className="font-semibold">₹{studentDetails.fee_structures[0].total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-semibold text-green-500">
                        ₹{(studentDetails.incomes?.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0) || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {studentDetails.fee_structures?.[0]?.fee_installments && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Installments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentDetails.fee_structures[0].fee_installments.map((inst: any, idx: number) => {
                    // Calculate paid for this installment
                    const paid = studentDetails.incomes
                      ?.filter((inc: any) => inc.installment_id === inst.id)
                      .reduce((sum: number, inc: any) => sum + Number(inc.amount), 0) || 0;
                    
                    const balance = Number(inst.amount_due) - paid;
                    const isFullyPaid = inst.status === 'PAID' || balance <= 0;

                    return (
                      <div 
                        key={inst.id}
                        onClick={() => {
                          if (!isFullyPaid) {
                            setSelectedInstallmentId(inst.id);
                            setAmount('');
                            setAllocations({});
                          }
                        }}
                        className={`p-4 rounded-lg border flex justify-between items-center transition-all ${
                          selectedInstallmentId === inst.id 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-border'
                        } ${isFullyPaid ? 'opacity-60 cursor-default bg-muted/20' : 'cursor-pointer hover:border-primary/50'}`}
                      >
                        <div>
                          <div className="font-semibold">Term {idx + 1}</div>
                          <div className="text-xs text-muted-foreground mt-1">Due: {new Date(inst.due_date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">₹{Number(inst.amount_due).toLocaleString()}</div>
                          {isFullyPaid ? (
                            <span className="text-xs font-bold text-green-500 flex items-center justify-end gap-1 mt-1">
                              <CheckCircle2 size={12} /> PAID
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-destructive mt-1 inline-block">Bal: ₹{balance.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Payment Form */}
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="text-primary h-5 w-5" /> 
                  Record Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {!selectedInstallmentId ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-12 text-muted-foreground flex flex-col items-center"
                    >
                      <ArrowRight size={32} className="opacity-30 mb-4" />
                      <p>Select a pending installment from the left to record a payment.</p>
                    </motion.div>
                  ) : (
                    <motion.form 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      onSubmit={handleSubmit} 
                      className="space-y-5"
                    >
                      {error && (
                        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
                          {error}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Amount Received (₹)</Label>
                        <Input 
                          type="number" 
                          required 
                          min="1"
                          value={amount} 
                          onChange={e => handleAmountChange(e.target.value)} 
                          className="text-lg font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Payment Mode</Label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={paymentMode} 
                            onChange={e => setPaymentMode(e.target.value)}
                          >
                            <option value="CASH">Cash</option>
                            <option value="BANK">Bank</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Reference ID (Optional)</Label>
                          <Input 
                            type="text" 
                            value={reference} 
                            onChange={e => setReference(e.target.value)} 
                            placeholder={paymentMode === 'CASH' ? 'N/A' : 'Transaction ID'}
                            disabled={paymentMode === 'CASH'}
                          />
                        </div>
                      </div>

                      {/* Component Allocation */}
                      {studentDetails.fee_structures?.[0]?.fee_components && (
                        <div className="mt-6 p-5 bg-muted/30 rounded-xl border border-border">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
                            Allocate Payment (Required)
                          </h4>
                          
                          <div className="space-y-4">
                            {studentDetails.fee_structures[0].fee_components.map((comp: any) => {
                              // Calculate how much has been paid for this specific component
                              const paid = studentDetails.incomes?.flatMap((inc: any) => inc.income_allocations || [])
                                .filter((alloc: any) => alloc.fee_component_id === comp.id)
                                .reduce((sum: number, alloc: any) => sum + Number(alloc.amount), 0) || 0;
                              
                              const balance = Number(comp.amount) - paid;

                              return (
                                <div key={comp.id} className="flex justify-between items-center gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <Label className="text-sm block">{comp.category_name}</Label>
                                      {comp.entities?.name && (
                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                          {comp.entities.name}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-xs mt-1 inline-block font-medium ${balance <= 0 ? 'text-green-500' : 'text-destructive'}`}>
                                      {balance <= 0 ? 'Fully Paid' : `Bal: ₹${balance.toLocaleString()}`}
                                    </span>
                                  </div>
                                  <Input 
                                    type="number"
                                    min="0"
                                    max={balance > 0 ? balance : undefined}
                                    placeholder="0"
                                    value={allocations[comp.id] === 0 ? '' : (allocations[comp.id] || '')}
                                    onChange={e => handleAllocationChange(comp.id, e.target.value, balance)}
                                    disabled={balance <= 0}
                                    className="w-28 text-right"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="flex justify-between items-center mt-5 pt-4 border-t border-border">
                            <span className="text-sm font-medium text-muted-foreground">Total Allocated:</span>
                            <span className={`text-sm font-bold ${
                              totalAllocated === parsedAmount && parsedAmount > 0 
                                ? 'text-green-500' 
                                : (totalAllocated > parsedAmount ? 'text-destructive' : 'text-foreground')
                            }`}>
                              ₹{totalAllocated.toLocaleString()} / ₹{parsedAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full"
                        size="lg"
                        disabled={
                          isSubmitting || 
                          parsedAmount <= 0 || 
                          ((studentDetails.fee_structures?.[0]?.fee_components?.length > 0) && totalAllocated !== parsedAmount)
                        }
                      >
                        {isSubmitting ? 'Recording...' : 'Record Payment & Generate Receipt'}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
