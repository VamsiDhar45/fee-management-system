import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileCheck,
} from 'lucide-react';
import { api } from '../../api';
import type { PayrollEmployee, PayrollMonthlyRecord } from '../../types/payroll';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { PayslipModal } from './PayslipModal';
import {
  downloadPayslipPdf,
  downloadAllPayslipsPdf,
  formatMonthName,
  type PayslipData,
} from '../../utils/payslipPdfGenerator';
import toast from 'react-hot-toast';

interface PayslipsManagementProps {
  onNavigateToFinalization?: () => void;
}

export const PayslipsManagement: React.FC<PayslipsManagementProps> = ({
  onNavigateToFinalization,
}) => {
  // Current Month State (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Preview Modal State
  const [selectedPayslipData, setSelectedPayslipData] = useState<PayslipData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Month Navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    );
  };

  // Queries
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<PayrollEmployee[]>({
    queryKey: ['payroll_employees'],
    queryFn: () => api.getPayrollEmployees(),
  });

  const { data: entities = [] } = useQuery<any[]>({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const {
    data: savedRecords = [],
    isLoading: isLoadingRecords,
  } = useQuery<PayrollMonthlyRecord[]>({
    queryKey: ['payroll_monthly_records', selectedMonth],
    queryFn: () => api.getMonthlyPayrollRecords(selectedMonth),
  });

  // Combine records with employee profiles
  const employeeMap = useMemo(() => {
    const map = new Map<string, PayrollEmployee>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Transform records into PayslipData items
  const payslipItems: PayslipData[] = useMemo(() => {
    return savedRecords.map((rec) => {
      const emp = employeeMap.get(rec.employee_id) || rec.employee;
      const entityName = emp?.entity?.name || 'General';
      return {
        record: rec,
        employee: emp,
        entityName,
        monthYear: selectedMonth,
      };
    });
  }, [savedRecords, employeeMap, selectedMonth]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return payslipItems.filter((item) => {
      const empName = (item.employee?.name || item.record?.employee_name || '').toLowerCase();
      const role = (item.employee?.nature_of_work || item.record?.employee_role || '').toLowerCase();
      const phone = item.employee?.phone || item.record?.phone || '';
      const entityId = item.employee?.entity_id;
      const mode = item.record?.payment_mode || item.employee?.payment_mode || 'cash';
      const status = item.record?.status || 'draft';

      const matchesSearch =
        empName.includes(searchTerm.toLowerCase()) ||
        role.includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm);

      const matchesEntity = selectedEntity === 'all' || entityId === selectedEntity;
      const matchesMode = selectedPaymentMode === 'all' || mode === selectedPaymentMode;
      const matchesStatus = selectedStatus === 'all' || status === selectedStatus;

      return matchesSearch && matchesEntity && matchesMode && matchesStatus;
    });
  }, [payslipItems, searchTerm, selectedEntity, selectedPaymentMode, selectedStatus]);

  // Metrics
  const metrics = useMemo(() => {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let bankNet = 0;
    let cashNet = 0;

    filteredItems.forEach((item) => {
      const gross = (Number(item.record?.base_salary) || 0) + (Number(item.record?.bonus) || 0);
      const ded =
        (Number(item.record?.advances_deduction) || 0) +
        (Number(item.record?.tds_deduction) || 0) +
        (Number(item.record?.statutory_deduction) || 0) +
        (Number(item.record?.leave_deduction) || 0) +
        (Number(item.record?.other_deductions) || 0);
      const net = Number(item.record?.net_salary) || Math.max(0, gross - ded);
      const mode = item.record?.payment_mode || item.employee?.payment_mode || 'cash';

      totalGross += gross;
      totalDeductions += ded;
      totalNet += net;
      if (mode === 'bank') bankNet += net;
      else cashNet += net;
    });

    return {
      count: filteredItems.length,
      totalGross,
      totalDeductions,
      totalNet,
      bankNet,
      cashNet,
    };
  }, [filteredItems]);

  const handleOpenPreview = (item: PayslipData) => {
    setSelectedPayslipData(item);
    setIsPreviewOpen(true);
  };

  const handleDownloadSingle = (item: PayslipData) => {
    try {
      downloadPayslipPdf(item);
      toast.success(`Payslip for ${item.employee?.name || 'employee'} downloaded!`);
    } catch (e) {
      toast.error('Failed to generate payslip PDF');
    }
  };

  const handleDownloadAll = () => {
    if (!filteredItems.length) {
      toast.error('No payslips available to download for this selection.');
      return;
    }
    try {
      downloadAllPayslipsPdf(filteredItems, selectedMonth);
      toast.success(`Downloaded combined PDF with ${filteredItems.length} payslips!`);
    } catch (e) {
      toast.error('Failed to generate bulk payslips PDF');
    }
  };

  const isLoading = isLoadingEmployees || isLoadingRecords;

  return (
    <div className="space-y-6">
      {/* Month Selection & Actions Toolbar */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="text-primary" size={22} />
              Employee Payslips & Salary Slips
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate, preview, print, and download official monthly salary slips for employees.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={filteredItems.length === 0}
              className="gap-1.5 text-xs h-9 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
              title="Download all payslips as a multi-page PDF"
            >
              <Download size={14} /> Download All Payslips ({filteredItems.length})
            </Button>
          </div>
        </div>

        {/* Month Selector Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-muted/40 rounded-lg p-1 border border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-7 w-7 p-0"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </Button>

              <div className="flex items-center gap-2 px-2">
                <Calendar size={14} className="text-primary" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-7 w-7 p-0"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCurrentMonth}
              className="h-9 text-xs"
            >
              Current Month
            </Button>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {formatMonthName(selectedMonth)}
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 md:flex-none">
              <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Entity Filter */}
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Organizations</option>
              {entities.map((ent: any) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>

            {/* Payment Mode Filter */}
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Modes</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-lg border border-input bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="finalized">Finalized</option>
              <option value="paid">Paid</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Payslips Available
            </p>
            <h4 className="text-xl font-bold text-foreground mt-0.5">{metrics.count}</h4>
            <span className="text-[10px] text-muted-foreground">For {formatMonthName(selectedMonth)}</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Gross Earnings
            </p>
            <h4 className="text-lg font-bold text-foreground mt-0.5">
              ₹{metrics.totalGross.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-muted-foreground">Base + Bonus</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Deductions
            </p>
            <h4 className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              -₹{metrics.totalDeductions.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-muted-foreground">Advances, TDS, Stat, Leaves</span>
          </CardContent>
        </Card>

        <Card className="border-border bg-emerald-500/5">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Net Payout
            </p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{metrics.totalNet.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-muted-foreground">Disbursable amount</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Disbursement Split
            </p>
            <div className="text-xs space-y-0.5 mt-1 font-medium">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank:</span>
                <span className="font-semibold text-blue-600">
                  ₹{metrics.bankNet.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash:</span>
                <span className="font-semibold text-emerald-600">
                  ₹{metrics.cashNet.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Payslips Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-muted-foreground">
            Loading payslips for {formatMonthName(selectedMonth)}...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-14 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <FileCheck size={28} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                No Payslips Found for {formatMonthName(selectedMonth)}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                {savedRecords.length === 0
                  ? `Salaries for ${formatMonthName(selectedMonth)} have not been saved or finalized yet. You can finalize them in the Salary Finalization tab.`
                  : 'No records match the current search or filters.'}
              </p>
            </div>

            {savedRecords.length === 0 && onNavigateToFinalization && (
              <Button
                onClick={onNavigateToFinalization}
                className="gap-2 text-xs"
                size="sm"
              >
                Go to Finalization of Salary Month & Report
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto modern-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-2">Organization</th>
                  <th className="py-3 px-2">Salary Plan</th>
                  <th className="py-3 px-2 text-right">Gross Pay (₹)</th>
                  <th className="py-3 px-2 text-right">Deductions (₹)</th>
                  <th className="py-3 px-3 text-right bg-primary/5 font-bold text-primary">
                    Net Salary (₹)
                  </th>
                  <th className="py-3 px-2 text-center">Payment Mode</th>
                  <th className="py-3 px-2 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Download & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const emp = item.employee;
                  const rec = item.record;
                  const isHourly = rec?.salary_plan_type === 'hourly' || emp?.salary_plan_type === 'hourly';
                  const hoursWorked = Number(rec?.hours_worked) || 0;
                  const hourlyRate = Number(rec?.hourly_rate) || Number(emp?.base_salary) || 0;
                  const basePay = Number(rec?.base_salary) || 0;
                  const bonus = Number(rec?.bonus) || 0;
                  const gross = basePay + bonus;

                  const deductions =
                    (Number(rec?.advances_deduction) || 0) +
                    (Number(rec?.tds_deduction) || 0) +
                    (Number(rec?.statutory_deduction) || 0) +
                    (Number(rec?.leave_deduction) || 0) +
                    (Number(rec?.other_deductions) || 0);

                  const net = Number(rec?.net_salary) || Math.max(0, gross - deductions);
                  const mode = rec?.payment_mode || emp?.payment_mode || 'cash';
                  const status = rec?.status || 'draft';

                  return (
                    <tr
                      key={rec?.id || emp?.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Employee Info */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-foreground">
                          {emp?.name || rec?.employee_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {emp?.nature_of_work || rec?.employee_role || 'Staff'}{' '}
                          {emp?.phone ? `• ${emp.phone}` : ''}
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="inline-block max-w-[120px] truncate text-muted-foreground font-medium">
                          {item.entityName}
                        </span>
                      </td>

                      {/* Salary Plan */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize w-fit ${
                              isHourly
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {isHourly ? 'Hourly' : 'Monthly'}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {isHourly ? `${hoursWorked} hrs @ ₹${hourlyRate}` : `Fixed ₹${basePay.toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      </td>

                      {/* Gross Earnings */}
                      <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono">
                        <div className="font-semibold text-foreground">
                          ₹{gross.toLocaleString('en-IN')}
                        </div>
                        {bonus > 0 && (
                          <div className="text-[10px] text-emerald-600 font-sans">
                            +₹{bonus.toLocaleString('en-IN')} bonus
                          </div>
                        )}
                      </td>

                      {/* Total Deductions */}
                      <td className="py-2.5 px-2 text-right whitespace-nowrap font-mono text-rose-600 dark:text-rose-400">
                        <div className="font-medium">
                          {deductions > 0 ? `-₹${deductions.toLocaleString('en-IN')}` : '₹0'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          {rec?.advances_deduction > 0 ? `Adv: ₹${rec.advances_deduction} ` : ''}
                          {rec?.tds_deduction > 0 ? `TDS: ₹${rec.tds_deduction} ` : ''}
                          {rec?.statutory_deduction > 0 ? `PT: ₹${rec.statutory_deduction}` : ''}
                        </div>
                      </td>

                      {/* Net Salary */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-sm bg-primary/5 text-primary">
                        ₹{net.toLocaleString('en-IN')}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            mode === 'bank'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {mode}
                        </span>
                        {mode === 'bank' && emp?.bank_account_number && (
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            ••••{emp.bank_account_number.slice(-4)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : status === 'finalized'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPreview(item)}
                            className="h-7 px-2 text-xs gap-1 text-slate-600 hover:text-slate-900"
                            title="Preview Payslip"
                          >
                            <Eye size={13} /> View
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadSingle(item)}
                            className="h-7 px-2.5 text-xs gap-1 text-primary border-primary/20 hover:bg-primary/10"
                            title="Download PDF"
                          >
                            <Download size={13} /> PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip Interactive Preview & Print Modal */}
      <PayslipModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={selectedPayslipData}
      />
    </div>
  );
};

export default PayslipsManagement;
