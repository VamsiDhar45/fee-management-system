import { useState } from 'react';
import { Plus, Search, Calendar, IndianRupee, CreditCard, User, Layers, CheckCircle2, Clock, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { api } from '../../api';
import type { PayrollAdvance, CreatePayrollAdvanceInput } from '../../types/payroll';
import { AdvanceModal } from './AdvanceModal';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function AdvancesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedAdvanceId, setExpandedAdvanceId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: advances = [], isLoading } = useQuery<PayrollAdvance[]>({
    queryKey: ['payroll_advances'],
    queryFn: () => api.getPayrollAdvances(),
  });

  const createMutation = useMutation({
    mutationFn: (newAdvance: CreatePayrollAdvanceInput) => api.createPayrollAdvance(newAdvance),
    onSuccess: () => {
      toast.success('Advance issued and schedule generated!');
      queryClient.invalidateQueries({ queryKey: ['payroll_advances'] });
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to issue advance');
    },
  });

  const installmentMutation = useMutation({
    mutationFn: ({
      installmentId,
      status,
      advanceId,
    }: {
      installmentId: string;
      status: 'pending' | 'recovered' | 'skipped' | 'cancelled';
      advanceId: string;
    }) => api.updateInstallmentStatus(installmentId, status, advanceId),
    onSuccess: () => {
      toast.success('Installment status updated');
      queryClient.invalidateQueries({ queryKey: ['payroll_advances'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update installment');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (advanceId: string) => api.cancelPayrollAdvance(advanceId),
    onSuccess: () => {
      toast.success('Advance record cancelled');
      queryClient.invalidateQueries({ queryKey: ['payroll_advances'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel advance');
    },
  });

  const handleCreateSubmit = (data: CreatePayrollAdvanceInput) => {
    createMutation.mutate(data);
  };

  const toggleExpand = (id: string) => {
    setExpandedAdvanceId((prev) => (prev === id ? null : id));
  };

  const filteredAdvances = advances.filter((adv) => {
    const empName = adv.employee?.name || '';
    const notes = adv.notes || '';
    const matchesSearch =
      empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || adv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary Metrics
  const totalAdvancesIssued = advances.reduce((sum, a) => sum + (Number(a.advance_amount) || 0), 0);
  const totalRecovered = advances.reduce((sum, a) => sum + (Number(a.recovered_amount) || 0), 0);
  const pendingRecovery = advances
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + ((Number(a.advance_amount) || 0) - (Number(a.recovered_amount) || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Advances Issued</p>
              <h3 className="text-2xl font-bold text-foreground">₹{totalAdvancesIssued.toLocaleString('en-IN')}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding Recovery</p>
              <h3 className="text-2xl font-bold text-foreground">₹{pendingRecovery.toLocaleString('en-IN')}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Recovered</p>
              <h3 className="text-2xl font-bold text-foreground">₹{totalRecovered.toLocaleString('en-IN')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search by employee name or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (Ongoing)</option>
            <option value="completed">Completed (Fully Recovered)</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shrink-0">
          <Plus size={18} />
          Issue Advance
        </Button>
      </div>

      {/* Advances Cards / Table */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            Loading employee advances...
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
            No advance records found. Click "Issue Advance" to grant an employee advance.
          </div>
        ) : (
          filteredAdvances.map((adv) => {
            const isExpanded = expandedAdvanceId === adv.id;
            const remaining = Number(adv.advance_amount) - Number(adv.recovered_amount);
            const progressPercent = Math.min(
              100,
              Math.round((Number(adv.recovered_amount) / Number(adv.advance_amount)) * 100) || 0
            );

            return (
              <div
                key={adv.id}
                className="bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all"
              >
                {/* Header Summary */}
                <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-secondary rounded-xl text-primary shrink-0">
                      <User size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-foreground">
                          {adv.employee?.name || 'Unknown Employee'}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            adv.status === 'active'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : adv.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          {adv.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          Issued: {new Date(adv.advance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          Deduction Starts: {adv.deduction_start_month}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CreditCard size={13} />
                          Paid by: <span className="capitalize font-medium text-foreground">{adv.payment_mode}</span>
                        </span>
                      </div>

                      {adv.notes && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic">
                          "{adv.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Financial Metrics & Actions */}
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">
                        ₹{Number(adv.advance_amount).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {adv.installments_count} monthly {adv.installments_count === 1 ? 'cut' : 'cuts'} of ₹{Number(adv.installment_amount).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="w-28 text-right hidden sm:block">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Recovered</span>
                        <span className="font-semibold text-foreground">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Bal: ₹{remaining.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(adv.id)}
                        className="gap-1.5 text-xs h-9"
                      >
                        <Layers size={14} />
                        Installments ({adv.installments?.length || 0})
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>

                      {adv.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel the remaining installments for this advance?')) {
                              cancelMutation.mutate(adv.id);
                            }
                          }}
                          className="text-destructive hover:bg-destructive/10 h-9 px-2"
                          title="Cancel remaining advance"
                        >
                          <XCircle size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Installments Breakdown */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Layers size={14} className="text-primary" /> Monthly Salary Deduction Schedule
                      </h5>
                      <span className="text-xs text-muted-foreground">
                        Mark recovered when deducted from monthly payout
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {(adv.installments || []).map((ins) => {
                        const isRecovered = ins.status === 'recovered';
                        return (
                          <div
                            key={ins.id}
                            className={`p-3.5 rounded-lg border text-xs transition-colors flex flex-col justify-between gap-2.5 ${
                              isRecovered
                                ? 'bg-emerald-500/5 border-emerald-500/30'
                                : ins.status === 'cancelled'
                                ? 'bg-zinc-500/5 border-zinc-500/30 opacity-60'
                                : 'bg-card border-border'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-semibold text-primary">#{ins.installment_number}</span>
                                <div className="text-xs font-semibold text-foreground mt-0.5">
                                  {ins.month_year}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                  isRecovered
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : ins.status === 'cancelled'
                                    ? 'bg-zinc-500/10 text-zinc-500'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {ins.status}
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-border/50">
                              <div className="font-bold text-foreground">
                                ₹{Number(ins.amount).toLocaleString('en-IN')}
                              </div>

                              {ins.status !== 'cancelled' && (
                                <button
                                  disabled={installmentMutation.isPending}
                                  onClick={() =>
                                    installmentMutation.mutate({
                                      installmentId: ins.id,
                                      status: isRecovered ? 'pending' : 'recovered',
                                      advanceId: adv.id,
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                    isRecovered
                                      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                  }`}
                                >
                                  {isRecovered ? 'Undo' : 'Mark Deducted'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Advance Modal */}
      <AdvanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
