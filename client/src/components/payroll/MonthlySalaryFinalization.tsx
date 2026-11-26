import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Entity } from '../../api';
import type {
  PayrollEmployee,
  PayrollMonthlyRecord,
  SaveMonthlyPayrollRecordInput,
  PayrollTaxSettings,
} from '../../types/payroll';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TaxSettingsModal } from './TaxSettingsModal';
import { PayslipModal } from './PayslipModal';
import type { PayslipData } from '../../utils/payslipPdfGenerator';
import {
  Building2,
  Calendar,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Save,
  AlertTriangle,
  Search,
  Printer,
  Sparkles,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EditableRowState {
  id?: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  entity_id: string;
  entity_name: string;
  gender: string;
  phone: string;
  salary_plan_type: 'monthly' | 'hourly';
  base_salary: number;
  hourly_rate: number;
  hours_worked: number;
  advances_deduction: number;
  advance_installment_id?: string | null;
  tds_deduction: number;
  statutory_deduction: number;
  bonus: number;
  leaves_taken: number;
  unpaid_leaves: number;
  leave_deduction: number;
  other_deductions: number;
  net_salary: number;
  payment_mode: 'cash' | 'bank';
  status: 'draft' | 'finalized' | 'paid';
  notes: string;
  isModified?: boolean;
}

export default function MonthlySalaryFinalization() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableData, setTableData] = useState<EditableRowState[]>([]);
  const [isTaxSettingsOpen, setIsTaxSettingsOpen] = useState<boolean>(false);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  // Load organizations
  const { data: entities = [] } = useQuery<Entity[]>({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  // Load active employees
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<PayrollEmployee[]>({
    queryKey: ['payroll_employees'],
    queryFn: () => api.getPayrollEmployees(),
  });

  // Load existing finalized/draft records for this month
  const {
    data: savedRecords = [],
    isLoading: isLoadingRecords,
    refetch: refetchRecords,
  } = useQuery<PayrollMonthlyRecord[]>({
    queryKey: ['payroll_monthly_records', selectedMonth],
    queryFn: () => api.getMonthlyPayrollRecords(selectedMonth),
  });

  // Load advance installments scheduled for this month
  const { data: scheduledInstallments = [] } = useQuery<any[]>({
    queryKey: ['payroll_scheduled_installments', selectedMonth],
    queryFn: () => api.getScheduledInstallmentsForMonth(selectedMonth),
  });

  // Load attendance records for the selected month to auto-populate hours worked & leaves taken
  const { data: monthlyAttendance = [] } = useQuery<any[]>({
    queryKey: ['payroll_attendance_month', selectedMonth],
    queryFn: () => api.getAttendanceByMonth(selectedMonth),
  });

  // Load custom Tax Slabs & Rules
  const { data: taxSettings = {
    id: 'default',
    tds_threshold: 50000,
    tds_rate_percent: 10,
    pt_threshold: 15000,
    pt_flat_amount: 200,
    free_leaves_per_month: 2,
  } } = useQuery<PayrollTaxSettings>({
    queryKey: ['payroll_tax_settings'],
    queryFn: () => api.getPayrollTaxSettings(),
  });

  // Compute TDS & Statutory based on configurable settings
  const computeTds = (gross: number) => {
    const threshold = Number(taxSettings.tds_threshold) || 50000;
    const rate = Number(taxSettings.tds_rate_percent) || 10;
    if (gross > threshold) {
      return Math.round((gross - threshold) * (rate / 100));
    }
    return 0;
  };

  const computeStatutory = (gross: number) => {
    const threshold = Number(taxSettings.pt_threshold) || 15000;
    const flat = Number(taxSettings.pt_flat_amount) || 200;
    if (gross >= threshold) {
      return flat;
    }
    return 0;
  };

  // Helper: compute deductions and net salary for a row
  const calculateRowValues = (row: Partial<EditableRowState>): {
    unpaid_leaves: number;
    leave_deduction: number;
    net_salary: number;
  } => {
    const leavesTaken = Math.max(0, Number(row.leaves_taken) || 0);
    const freeAllowance = Number(taxSettings.free_leaves_per_month) || 2;
    const unpaidLeaves = Math.max(0, leavesTaken - freeAllowance);

    let basePay = Number(row.base_salary) || 0;
    if (row.salary_plan_type === 'hourly') {
      basePay = (Number(row.hours_worked) || 0) * (Number(row.hourly_rate) || 0);
    }

    // Leave deduction formula: (basePay / 30 days) * unpaidLeaves (for monthly staff)
    let leaveDeduction = Number(row.leave_deduction) || 0;
    if (unpaidLeaves > 0) {
      if (row.salary_plan_type === 'monthly' && (row.leave_deduction === undefined || row.leave_deduction === 0)) {
        leaveDeduction = Math.round((basePay / 30) * unpaidLeaves * 100) / 100;
      }
    } else {
      leaveDeduction = 0;
    }

    const bonus = Number(row.bonus) || 0;
    const advances = Number(row.advances_deduction) || 0;
    const tds = Number(row.tds_deduction) || 0;
    const statutory = Number(row.statutory_deduction) || 0;
    const other = Number(row.other_deductions) || 0;

    const totalDeductions = advances + tds + statutory + leaveDeduction + other;
    const netSalary = Math.max(0, Math.round((basePay + bonus - totalDeductions) * 100) / 100);

    return {
      unpaid_leaves: unpaidLeaves,
      leave_deduction: leaveDeduction,
      net_salary: netSalary,
    };
  };

  // Check if ANY employee has taken > free_leaves
  const hasAnyExcessLeaves = useMemo(() => {
    const freeAllowance = Number(taxSettings.free_leaves_per_month) || 2;
    return tableData.some((row) => (Number(row.leaves_taken) || 0) > freeAllowance);
  }, [tableData, taxSettings]);

  // Aggregate monthly attendance for each employee: total hours worked & total leaves/absences
  const attendanceSummaryMap = useMemo(() => {
    const map = new Map<string, { totalHours: number; leavesCount: number }>();
    monthlyAttendance.forEach((att: any) => {
      const empId = att.employee_id;
      const prev = map.get(empId) || { totalHours: 0, leavesCount: 0 };
      const hours = Number(att.hours_worked) || 0;
      const ot = Number(att.overtime_hours) || 0;
      const isLeaveOrAbsent = att.status === 'leave' || att.status === 'absent';
      const isHalfDay = att.status === 'half_day';

      map.set(empId, {
        totalHours: prev.totalHours + hours + ot,
        leavesCount: prev.leavesCount + (isLeaveOrAbsent ? 1 : isHalfDay ? 0.5 : 0),
      });
    });
    return map;
  }, [monthlyAttendance]);

  // Synchronize or auto-populate grid when month, employees, or savedRecords change
  useEffect(() => {
    if (!employees.length) {
      setTableData([]);
      return;
    }

    const savedMap = new Map<string, PayrollMonthlyRecord>();
    savedRecords.forEach((rec) => {
      savedMap.set(rec.employee_id, rec);
    });

    const advMap = new Map<string, { installmentId: string; amount: number }>();
    scheduledInstallments.forEach((inst: any) => {
      const empId = inst.advance?.employee_id;
      if (empId) {
        advMap.set(empId, {
          installmentId: inst.id,
          amount: Number(inst.amount) || 0,
        });
      }
    });

    const populated: EditableRowState[] = employees.map((emp) => {
      const existing = savedMap.get(emp.id);
      const advInfo = advMap.get(emp.id);
      const attInfo = attendanceSummaryMap.get(emp.id);

      if (existing) {
        // If hours_worked or leaves_taken were 0 in saved draft but attendance was logged, auto-fill from attendance
        const hoursWorked =
          Number(existing.hours_worked) > 0
            ? Number(existing.hours_worked)
            : attInfo && attInfo.totalHours > 0
            ? attInfo.totalHours
            : 0;

        const leavesTaken =
          Number(existing.leaves_taken) > 0
            ? Number(existing.leaves_taken)
            : attInfo && attInfo.leavesCount > 0
            ? Math.ceil(attInfo.leavesCount)
            : 0;

        const hourlyRate = Number(existing.hourly_rate) || (emp.salary_plan_type === 'hourly' ? Number(emp.base_salary) : 0);
        const baseSal =
          existing.salary_plan_type === 'hourly'
            ? hoursWorked * hourlyRate
            : Number(existing.base_salary);

        const calc = calculateRowValues({
          base_salary: baseSal,
          salary_plan_type: existing.salary_plan_type,
          hourly_rate: hourlyRate,
          hours_worked: hoursWorked,
          advances_deduction: Number(existing.advances_deduction) || 0,
          tds_deduction: Number(existing.tds_deduction) || 0,
          statutory_deduction: Number(existing.statutory_deduction) || 0,
          bonus: Number(existing.bonus) || 0,
          leaves_taken: leavesTaken,
          leave_deduction: Number(existing.leave_deduction) || 0,
          other_deductions: Number(existing.other_deductions) || 0,
        });

        return {
          id: existing.id,
          employee_id: emp.id,
          employee_name: emp.name,
          employee_role: emp.nature_of_work || '',
          entity_id: emp.entity_id || '',
          entity_name: emp.entity?.name || 'General',
          gender: emp.gender,
          phone: emp.phone || '',
          salary_plan_type: existing.salary_plan_type || emp.salary_plan_type,
          base_salary: baseSal,
          hourly_rate: hourlyRate,
          hours_worked: hoursWorked,
          advances_deduction: Number(existing.advances_deduction) || 0,
          advance_installment_id: existing.advance_installment_id || advInfo?.installmentId || null,
          tds_deduction: Number(existing.tds_deduction) || 0,
          statutory_deduction: Number(existing.statutory_deduction) || 0,
          bonus: Number(existing.bonus) || 0,
          leaves_taken: leavesTaken,
          unpaid_leaves: calc.unpaid_leaves,
          leave_deduction: calc.leave_deduction,
          other_deductions: Number(existing.other_deductions) || 0,
          net_salary: calc.net_salary,
          payment_mode: existing.payment_mode || emp.payment_mode,
          status: existing.status || 'draft',
          notes: existing.notes || '',
          isModified: false,
        };
      }

      // Initialize default row for employee with auto-calculated TDS, Statutory deductions & attendance
      const plan = emp.salary_plan_type;
      const hourlyRate = plan === 'hourly' ? Number(emp.base_salary) || 0 : 0;
      const hoursWorked = attInfo ? attInfo.totalHours : 0;
      const baseSal = plan === 'hourly' ? hoursWorked * hourlyRate : Number(emp.base_salary) || 0;
      const advDeduction = advInfo ? advInfo.amount : 0;
      const leavesTaken = attInfo ? Math.ceil(attInfo.leavesCount) : 0;

      const autoTds = computeTds(baseSal);
      const autoStatutory = computeStatutory(baseSal);

      const calc = calculateRowValues({
        base_salary: baseSal,
        salary_plan_type: plan,
        hourly_rate: hourlyRate,
        hours_worked: hoursWorked,
        advances_deduction: advDeduction,
        tds_deduction: autoTds,
        statutory_deduction: autoStatutory,
        bonus: 0,
        leaves_taken: leavesTaken,
        leave_deduction: 0,
        other_deductions: 0,
      });

      return {
        employee_id: emp.id,
        employee_name: emp.name,
        employee_role: emp.nature_of_work || '',
        entity_id: emp.entity_id || '',
        entity_name: emp.entity?.name || 'General',
        gender: emp.gender,
        phone: emp.phone || '',
        salary_plan_type: plan,
        base_salary: baseSal,
        hourly_rate: hourlyRate,
        hours_worked: hoursWorked,
        advances_deduction: advDeduction,
        advance_installment_id: advInfo?.installmentId || null,
        tds_deduction: autoTds,
        statutory_deduction: autoStatutory,
        bonus: 0,
        leaves_taken: leavesTaken,
        unpaid_leaves: calc.unpaid_leaves,
        leave_deduction: calc.leave_deduction,
        other_deductions: 0,
        net_salary: calc.net_salary,
        payment_mode: emp.payment_mode,
        status: 'draft',
        notes: '',
        isModified: true,
      };
    });

    setTableData(populated);
  }, [employees, savedRecords, scheduledInstallments, monthlyAttendance, selectedMonth, taxSettings]);

  // Handle cell edit
  const handleCellChange = (index: number, field: keyof EditableRowState, value: any) => {
    setTableData((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value, isModified: true };

      // If hours or hourly rate changed on hourly plan, recompute base and re-auto-calc
      if (target.salary_plan_type === 'hourly' && (field === 'hours_worked' || field === 'hourly_rate')) {
        target.base_salary = (Number(target.hours_worked) || 0) * (Number(target.hourly_rate) || 0);
        target.tds_deduction = computeTds(target.base_salary);
        target.statutory_deduction = computeStatutory(target.base_salary);
      }

      // If base_salary changed on monthly plan, recalculate auto-TDS & Statutory
      if (target.salary_plan_type === 'monthly' && field === 'base_salary') {
        target.tds_deduction = computeTds(Number(value) || 0);
        target.statutory_deduction = computeStatutory(Number(value) || 0);
      }

      // If leaves_taken changed, dynamically update unpaid leaves alert & leave deduction
      if (field === 'leaves_taken') {
        const leavesTaken = Math.max(0, Number(value) || 0);
        const freeAllowance = Number(taxSettings.free_leaves_per_month) || 2;
        target.unpaid_leaves = Math.max(0, leavesTaken - freeAllowance);
        if (target.salary_plan_type === 'monthly') {
          target.leave_deduction =
            target.unpaid_leaves > 0 ? Math.round((Number(target.base_salary) / 30) * target.unpaid_leaves * 100) / 100 : 0;
        }
      }

      // Recalculate Net
      const calc = calculateRowValues(target);
      target.unpaid_leaves = calc.unpaid_leaves;
      target.net_salary = calc.net_salary;

      updated[index] = target;
      return updated;
    });
  };

  // Open individual payslip preview modal
  const handleOpenPayslip = (row: EditableRowState) => {
    const emp = employees.find((e) => e.id === row.employee_id);
    setPayslipData({
      record: row,
      employee: emp,
      entityName: row.entity_name,
      monthYear: selectedMonth,
    });
    setIsPayslipOpen(true);
  };

  // Revert/Reset a single row to original saved database state or default employee profile state
  const handleResetRow = (index: number) => {
    const row = tableData[index];
    const savedRec = savedRecords.find((r) => r.employee_id === row.employee_id);
    const emp = employees.find((e) => e.id === row.employee_id);
    const advInst = scheduledInstallments.find((i: any) => i.advance?.employee_id === row.employee_id);

    const attInfo = attendanceSummaryMap.get(row.employee_id);
    const attHours = attInfo ? attInfo.totalHours : 0;
    const attLeaves = attInfo ? Math.ceil(attInfo.leavesCount) : 0;

    if (savedRec) {
      setTableData((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          base_salary: Number(savedRec.base_salary),
          hours_worked: Number(savedRec.hours_worked) || 0,
          hourly_rate: Number(savedRec.hourly_rate) || 0,
          advances_deduction: Number(savedRec.advances_deduction) || 0,
          tds_deduction: Number(savedRec.tds_deduction) || 0,
          statutory_deduction: Number(savedRec.statutory_deduction) || 0,
          bonus: Number(savedRec.bonus) || 0,
          leaves_taken: Number(savedRec.leaves_taken) || 0,
          unpaid_leaves: Number(savedRec.unpaid_leaves) || 0,
          leave_deduction: Number(savedRec.leave_deduction) || 0,
          net_salary: Number(savedRec.net_salary),
          payment_mode: savedRec.payment_mode,
          status: savedRec.status,
          notes: savedRec.notes || '',
          isModified: false,
        };
        return updated;
      });
      toast.success(`Reset ${row.employee_name} to previously saved record.`);
    } else if (emp) {
      const plan = emp.salary_plan_type;
      const hourlyRate = plan === 'hourly' ? Number(emp.base_salary) || 0 : 0;
      const hoursWorked = attHours;
      const baseSal = plan === 'hourly' ? hoursWorked * hourlyRate : Number(emp.base_salary) || 0;
      const autoTds = computeTds(baseSal);
      const autoStat = computeStatutory(baseSal);
      const advAmt = advInst ? Number(advInst.amount) : 0;

      const calc = calculateRowValues({
        base_salary: baseSal,
        salary_plan_type: plan,
        hourly_rate: hourlyRate,
        hours_worked: hoursWorked,
        advances_deduction: advAmt,
        tds_deduction: autoTds,
        statutory_deduction: autoStat,
        bonus: 0,
        leaves_taken: attLeaves,
        leave_deduction: 0,
        other_deductions: 0,
      });

      setTableData((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          base_salary: baseSal,
          hourly_rate: hourlyRate,
          hours_worked: hoursWorked,
          advances_deduction: advAmt,
          tds_deduction: autoTds,
          statutory_deduction: autoStat,
          bonus: 0,
          leaves_taken: attLeaves,
          unpaid_leaves: calc.unpaid_leaves,
          leave_deduction: 0,
          net_salary: calc.net_salary,
          payment_mode: emp.payment_mode,
          status: 'draft',
          notes: '',
          isModified: false,
        };
        return updated;
      });
      toast.success(`Reset ${row.employee_name} to live attendance data (${hoursWorked} hrs).`);
    }
  };

  // Sync attendance hours & leaves to grid
  const handleSyncAttendance = () => {
    setTableData((prev) =>
      prev.map((row) => {
        const attInfo = attendanceSummaryMap.get(row.employee_id);
        const hours = attInfo ? attInfo.totalHours : 0;
        const leaves = attInfo ? Math.ceil(attInfo.leavesCount) : 0;
        const hourlyRate = row.hourly_rate || (row.salary_plan_type === 'hourly' ? row.base_salary : 0);
        const baseSal = row.salary_plan_type === 'hourly' ? hours * hourlyRate : row.base_salary;

        const autoTds = computeTds(baseSal);
        const autoStat = computeStatutory(baseSal);

        const calc = calculateRowValues({
          ...row,
          hours_worked: hours,
          leaves_taken: leaves,
          base_salary: baseSal,
          tds_deduction: autoTds,
          statutory_deduction: autoStat,
        });

        return {
          ...row,
          hours_worked: hours,
          leaves_taken: leaves,
          base_salary: baseSal,
          tds_deduction: autoTds,
          statutory_deduction: autoStat,
          unpaid_leaves: calc.unpaid_leaves,
          leave_deduction: calc.leave_deduction,
          net_salary: calc.net_salary,
          isModified: true,
        };
      })
    );
    toast.success('Hours & leaves synced from Attendance Management!');
  };

  // Re-run Auto-calculate TDS & Statutory for all rows button
  const handleRecalculateTdsStatutory = () => {
    setTableData((prev) =>
      prev.map((row) => {
        const gross = Number(row.base_salary) || 0;
        const autoTds = computeTds(gross);
        const autoStat = computeStatutory(gross);
        const calc = calculateRowValues({
          ...row,
          tds_deduction: autoTds,
          statutory_deduction: autoStat,
        });

        return {
          ...row,
          tds_deduction: autoTds,
          statutory_deduction: autoStat,
          net_salary: calc.net_salary,
          isModified: true,
        };
      })
    );
    toast.success('Auto-calculated TDS and Statutory deductions based on configured slabs!');
  };

  // Filtered rows for display
  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      const matchesSearch =
        row.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employee_role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.phone.includes(searchTerm);

      const matchesEntity = selectedEntity === 'all' || row.entity_id === selectedEntity;
      const matchesPaymentMode = selectedPaymentMode === 'all' || row.payment_mode === selectedPaymentMode;

      return matchesSearch && matchesEntity && matchesPaymentMode;
    });
  }, [tableData, searchTerm, selectedEntity, selectedPaymentMode]);

  // Totals & KPI Metrics
  const summaryMetrics = useMemo(() => {
    let totalBase = 0;
    let totalBonus = 0;
    let totalAdvances = 0;
    let totalTds = 0;
    let totalStatutory = 0;
    let totalLeaveDeduction = 0;
    let totalNet = 0;
    let totalCashPayout = 0;
    let totalBankPayout = 0;
    let leaveAlertCount = 0;

    const freeAllowance = Number(taxSettings.free_leaves_per_month) || 2;

    filteredData.forEach((r) => {
      totalBase += Number(r.base_salary) || 0;
      totalBonus += Number(r.bonus) || 0;
      totalAdvances += Number(r.advances_deduction) || 0;
      totalTds += Number(r.tds_deduction) || 0;
      totalStatutory += Number(r.statutory_deduction) || 0;
      totalLeaveDeduction += Number(r.leave_deduction) || 0;
      totalNet += Number(r.net_salary) || 0;

      if (r.payment_mode === 'bank') totalBankPayout += Number(r.net_salary) || 0;
      else totalCashPayout += Number(r.net_salary) || 0;

      if (r.leaves_taken > freeAllowance) leaveAlertCount += 1;
    });

    return {
      totalBase,
      totalBonus,
      totalAdvances,
      totalTds,
      totalStatutory,
      totalLeaveDeduction,
      totalNet,
      totalCashPayout,
      totalBankPayout,
      leaveAlertCount,
      count: filteredData.length,
    };
  }, [filteredData, taxSettings]);

  // Save changes mutation
  const saveAllMutation = useMutation({
    mutationFn: async (rowsToSave: EditableRowState[]) => {
      const payload: SaveMonthlyPayrollRecordInput[] = rowsToSave.map((r) => {
        const record: any = {
          employee_id: r.employee_id,
          month_year: selectedMonth,
          base_salary: Number(r.base_salary) || 0,
          salary_plan_type: r.salary_plan_type,
          hours_worked: Number(r.hours_worked) || 0,
          hourly_rate: Number(r.hourly_rate) || 0,
          advances_deduction: Number(r.advances_deduction) || 0,
          advance_installment_id: r.advance_installment_id || null,
          tds_deduction: Number(r.tds_deduction) || 0,
          statutory_deduction: Number(r.statutory_deduction) || 0,
          bonus: Number(r.bonus) || 0,
          leaves_taken: Number(r.leaves_taken) || 0,
          unpaid_leaves: Number(r.unpaid_leaves) || 0,
          leave_deduction: Number(r.leave_deduction) || 0,
          other_deductions: Number(r.other_deductions) || 0,
          net_salary: Number(r.net_salary) || 0,
          payment_mode: r.payment_mode,
          status: r.status,
          notes: r.notes || null,
        };

        // Only include id if it exists (is not undefined/null)
        if (r.id) {
          record.id = r.id;
        }

        return record;
      });

      return api.saveBatchMonthlyPayrollRecords(payload);
    },
    onSuccess: () => {
      toast.success(`Payroll report for ${selectedMonth} saved successfully!`);
      queryClient.invalidateQueries({ queryKey: ['payroll_monthly_records', selectedMonth] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save payroll changes');
    },
  });

  const handleSaveAll = () => {
    saveAllMutation.mutate(tableData);
  };

  const handleMarkAllStatus = (newStatus: 'draft' | 'finalized' | 'paid') => {
    setTableData((prev) =>
      prev.map((row) => ({
        ...row,
        status: newStatus,
        isModified: true,
      }))
    );
    toast.success(`All records marked as ${newStatus}. Click "Save Payroll" to commit.`);
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      const headers = [
        'Employee Name',
        'Role',
        'Organization',
        'Plan Type',
        'Hours Worked',
        'Base/Hourly Salary',
        'Bonus (+)',
        'Leaves Taken',
        ...(hasAnyExcessLeaves ? ['Unpaid Leaves', 'Leave Deduction (-)'] : []),
        'Advances (-)',
        'TDS Deduction (-)',
        'Statutory Deduction (-)',
        'Net Payable (INR)',
        'Payment Mode',
        'Status',
        'Notes',
      ];

      const csvRows = [headers.join(',')];

      filteredData.forEach((r) => {
        const row = [
          `"${r.employee_name}"`,
          `"${r.employee_role}"`,
          `"${r.entity_name}"`,
          r.salary_plan_type,
          r.hours_worked,
          r.base_salary,
          r.bonus,
          r.leaves_taken,
          ...(hasAnyExcessLeaves ? [r.unpaid_leaves, r.leave_deduction] : []),
          r.advances_deduction,
          r.tds_deduction,
          r.statutory_deduction,
          r.net_salary,
          r.payment_mode,
          r.status,
          `"${r.notes || ''}"`,
        ];
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Payroll_Report_${selectedMonth}.csv`);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Payroll CSV exported successfully!');
    } catch (e) {
      toast.error('Failed to export CSV');
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.text(`Monthly Salary Finalization Report - ${selectedMonth}`, 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Total Employees: ${summaryMetrics.count} | Net Salary Disbursal: INR ${summaryMetrics.totalNet.toLocaleString(
          'en-IN'
        )} | Bank: INR ${summaryMetrics.totalBankPayout.toLocaleString(
          'en-IN'
        )} | Cash: INR ${summaryMetrics.totalCashPayout.toLocaleString('en-IN')}`,
        14,
        22
      );

      const tableColumn = [
        'Employee',
        'Role',
        'Org',
        'Base/Hours',
        'Bonus',
        'Leaves',
        ...(hasAnyExcessLeaves ? ['Leave Ded.'] : []),
        'Advances',
        'TDS',
        'Statutory',
        'Net Salary',
        'Mode',
        'Status',
      ];

      const freeAllowance = Number(taxSettings.free_leaves_per_month) || 2;

      const tableRows = filteredData.map((r) => [
        r.employee_name,
        r.employee_role,
        r.entity_name,
        r.salary_plan_type === 'hourly'
          ? `${r.hours_worked} hrs @ Rs.${r.hourly_rate}`
          : `Rs.${Number(r.base_salary).toLocaleString('en-IN')}`,
        `Rs.${Number(r.bonus).toLocaleString('en-IN')}`,
        r.leaves_taken > freeAllowance ? `${r.leaves_taken} (${r.unpaid_leaves} unpaid)` : `${r.leaves_taken}`,
        ...(hasAnyExcessLeaves ? [`Rs.${Number(r.leave_deduction).toLocaleString('en-IN')}`] : []),
        `Rs.${Number(r.advances_deduction).toLocaleString('en-IN')}`,
        `Rs.${Number(r.tds_deduction).toLocaleString('en-IN')}`,
        `Rs.${Number(r.statutory_deduction).toLocaleString('en-IN')}`,
        `Rs.${Number(r.net_salary).toLocaleString('en-IN')}`,
        r.payment_mode.toUpperCase(),
        r.status.toUpperCase(),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8, cellPadding: 2 },
      });

      doc.save(`Salary_Finalization_${selectedMonth}.pdf`);
      toast.success('Payroll PDF report generated!');
    } catch (e) {
      toast.error('Failed to export PDF');
    }
  };

  const isLoading = isLoadingEmployees || isLoadingRecords;

  return (
    <div className="space-y-6">
      {/* Top Filter & Month Selector Bar */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="text-primary" size={22} />
              Monthly Salary Finalization & Report
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select month, review pre-filled base salaries, advances, auto-calculated TDS & statutory deductions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAttendance}
              className="gap-1.5 text-xs h-9 text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-500/10"
              title="Sync hours and leaves directly from Attendance Management tab"
            >
              <RotateCcw size={14} /> Sync Attendance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTaxSettingsOpen(true)}
              className="gap-1.5 text-xs h-9 font-medium"
              title="Configure Tax Slabs, Statutory deductions & Free leaves"
            >
              <Sliders size={14} className="text-primary" /> Tax Slabs & Rules
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculateTdsStatutory}
              className="gap-1.5 text-xs h-9 text-primary border-primary/30 hover:bg-primary/5"
              title="Auto-calculate TDS & Statutory deductions across all rows"
            >
              <Sparkles size={14} /> Auto-calc TDS & Statutory
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 text-xs h-9"
              disabled={filteredData.length === 0}
            >
              <Download size={14} /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-1.5 text-xs h-9"
              disabled={filteredData.length === 0}
            >
              <Printer size={14} /> PDF
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={saveAllMutation.isPending || isLoading}
              className="gap-2 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              <Save size={15} />
              {saveAllMutation.isPending ? 'Saving Report...' : 'Save Payroll'}
            </Button>
          </div>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border">
          {/* Month Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar size={13} className="text-primary" /> Salary Month
            </label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 text-sm font-medium"
            />
          </div>

          {/* Organization Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Building2 size={13} className="text-primary" /> Organization
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Organizations</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <CreditCard size={13} className="text-primary" /> Mode of Payment
            </label>
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Modes (Bank + Cash)</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash Payment</option>
            </select>
          </div>

          {/* Quick Search */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Search size={13} className="text-primary" /> Search Staff
            </label>
            <div className="relative">
              <Input
                placeholder="Search name, phone, role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Gross Base</p>
            <h4 className="text-lg font-bold text-foreground mt-0.5">₹{summaryMetrics.totalBase.toLocaleString('en-IN')}</h4>
            <span className="text-[10px] text-muted-foreground">+{summaryMetrics.totalBonus.toLocaleString('en-IN')} Bonus</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Advances Cut</p>
            <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              -₹{summaryMetrics.totalAdvances.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-muted-foreground">Loan recoveries</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">TDS & Statutory</p>
            <h4 className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              -₹{(summaryMetrics.totalTds + summaryMetrics.totalStatutory).toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-muted-foreground">
              TDS: ₹{summaryMetrics.totalTds.toLocaleString('en-IN')} • Stat: ₹{summaryMetrics.totalStatutory.toLocaleString('en-IN')}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Leave Penalties</p>
            <h4 className="text-lg font-bold text-rose-500 mt-0.5">
              -₹{summaryMetrics.totalLeaveDeduction.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              {summaryMetrics.leaveAlertCount} staff with &gt;{taxSettings.free_leaves_per_month} leaves
            </span>
          </CardContent>
        </Card>

        <Card className="border-border bg-emerald-500/5">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Net Payable</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{summaryMetrics.totalNet.toLocaleString('en-IN')}
            </h4>
            <span className="text-[10px] text-muted-foreground">For {summaryMetrics.count} staff</span>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Disbursement Split</p>
            <div className="text-xs space-y-0.5 mt-1 font-medium">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank:</span>
                <span className="font-semibold text-blue-600">₹{summaryMetrics.totalBankPayout.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash:</span>
                <span className="font-semibold text-emerald-600">₹{summaryMetrics.totalCashPayout.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Workflow Actions */}
      <div className="flex items-center justify-between gap-3 text-xs bg-muted/30 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Batch Status:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAllStatus('finalized')}
            className="h-7 text-xs px-2.5"
          >
            Mark All Finalized
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAllStatus('paid')}
            className="h-7 text-xs px-2.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
          >
            Mark All Paid
          </Button>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>
            {taxSettings.free_leaves_per_month} leaves/month are free. Leave penalty column automatically reveals only when an employee takes &gt;{taxSettings.free_leaves_per_month} leaves.
          </span>
        </div>
      </div>

      {/* Editable Salary Finalization Spreadsheet Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-muted-foreground">Loading salary data for {selectedMonth}...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            No employees found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto modern-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-2">Org</th>
                  <th className="py-3 px-2">Plan</th>
                  <th className="py-3 px-2 text-right">Base / Hours (₹)</th>
                  <th className="py-3 px-2 text-right">Bonus (₹)</th>
                  <th className="py-3 px-2 text-center">Leaves (Free: {taxSettings.free_leaves_per_month})</th>
                  
                  {/* Leave Deduction Column: conditionally shown when someone takes > free allowance */}
                  {hasAnyExcessLeaves && (
                    <th className="py-3 px-2 text-right text-rose-600 bg-rose-500/5">
                      Leave Ded. (₹)
                    </th>
                  )}

                  <th className="py-3 px-2 text-right">Advance Cut (₹)</th>
                  <th className="py-3 px-2 text-right">TDS (₹)</th>
                  <th className="py-3 px-2 text-right">Statutory (₹)</th>
                  <th className="py-3 px-3 text-right bg-primary/5 font-bold text-primary">Net Salary (₹)</th>
                  <th className="py-3 px-2">Mode</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-center">Slip / Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((row, idx) => {
                  const freeAllowance = Number(taxSettings.free_leaves_per_month) || 2;
                  const hasExcessLeaves = (Number(row.leaves_taken) || 0) > freeAllowance;
                  const isHourly = row.salary_plan_type === 'hourly';

                  return (
                    <tr
                      key={row.employee_id}
                      className={`hover:bg-muted/30 transition-colors ${
                        hasExcessLeaves ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Employee Info */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{row.employee_name}</div>
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {row.employee_role || 'Staff'} {row.phone ? `• ${row.phone}` : ''}
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className="inline-block max-w-[100px] truncate text-muted-foreground font-medium">
                          {row.entity_name}
                        </span>
                      </td>

                      {/* Salary Plan */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
                            isHourly
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {row.salary_plan_type}
                        </span>
                      </td>

                      {/* Base Salary / Hours Worked */}
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        {isHourly ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                title="Hours worked"
                                value={row.hours_worked || ''}
                                onChange={(e) => handleCellChange(idx, 'hours_worked', parseFloat(e.target.value) || 0)}
                                placeholder="Hours"
                                className="w-14 h-7 text-right px-1.5 rounded border border-input bg-background font-mono text-xs focus:ring-1 focus:ring-primary"
                              />
                              <span className="text-[10px] text-muted-foreground">hrs @ ₹{row.hourly_rate}</span>
                            </div>
                            {(() => {
                              const attInfo = attendanceSummaryMap.get(row.employee_id);
                              const attHours = attInfo ? attInfo.totalHours : 0;
                              if (attInfo && attHours !== Number(row.hours_worked)) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleCellChange(idx, 'hours_worked', attHours)}
                                    className="text-[10px] text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer"
                                    title={`Attendance logged: ${attHours} hrs. Click to sync.`}
                                  >
                                    Att: {attHours} hrs (sync)
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={row.base_salary || ''}
                            onChange={(e) => handleCellChange(idx, 'base_salary', parseFloat(e.target.value) || 0)}
                            className="w-20 h-7 text-right px-1.5 rounded border border-input bg-background font-mono text-xs font-semibold focus:ring-1 focus:ring-primary"
                          />
                        )}
                      </td>

                      {/* Bonus */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          value={row.bonus || ''}
                          placeholder="0"
                          onChange={(e) => handleCellChange(idx, 'bonus', parseFloat(e.target.value) || 0)}
                          className="w-16 h-7 text-right px-1.5 rounded border border-input bg-background font-mono text-xs focus:ring-1 focus:ring-primary text-emerald-600 font-medium"
                        />
                      </td>

                      {/* Leaves Taken (Alert if > freeAllowance) */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="31"
                              value={row.leaves_taken || ''}
                              placeholder="0"
                              onChange={(e) => handleCellChange(idx, 'leaves_taken', parseInt(e.target.value) || 0)}
                              className={`w-12 h-7 text-center rounded border font-mono text-xs font-semibold focus:ring-1 ${
                                hasExcessLeaves
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                  : 'border-input bg-background'
                              }`}
                            />
                            {hasExcessLeaves && (
                              <span
                                title={`Alert: ${row.leaves_taken} leaves taken! Exceeds the ${freeAllowance} free leaves allowed (${row.unpaid_leaves} unpaid).`}
                                className="text-amber-500 cursor-help"
                              >
                                <AlertTriangle size={14} />
                              </span>
                            )}
                          </div>
                          {(() => {
                            const attInfo = attendanceSummaryMap.get(row.employee_id);
                            const attLeaves = attInfo ? Math.ceil(attInfo.leavesCount) : 0;
                            if (attInfo && attLeaves !== Number(row.leaves_taken)) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleCellChange(idx, 'leaves_taken', attLeaves)}
                                  className="text-[10px] text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer"
                                  title={`Attendance logged: ${attLeaves} leaves. Click to sync.`}
                                >
                                  Att: {attLeaves}d (sync)
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* Leave Deduction Column (Visible when someone has > free allowance) */}
                      {hasAnyExcessLeaves && (
                        <td className="py-2.5 px-2 text-right bg-rose-500/5">
                          {hasExcessLeaves ? (
                            <input
                              type="number"
                              value={row.leave_deduction || ''}
                              placeholder="0"
                              onChange={(e) => handleCellChange(idx, 'leave_deduction', parseFloat(e.target.value) || 0)}
                              className="w-16 h-7 text-right px-1.5 rounded border border-rose-400 bg-rose-500/10 text-rose-600 font-mono text-xs font-semibold focus:ring-1"
                            />
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">₹0</span>
                          )}
                        </td>
                      )}

                      {/* Advance Deduction */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          value={row.advances_deduction || ''}
                          placeholder="0"
                          onChange={(e) => handleCellChange(idx, 'advances_deduction', parseFloat(e.target.value) || 0)}
                          className="w-18 h-7 text-right px-1.5 rounded border border-input bg-background font-mono text-xs text-amber-600 font-medium focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* TDS (Auto-calculated & Editable) */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          value={row.tds_deduction || ''}
                          placeholder="0"
                          onChange={(e) => handleCellChange(idx, 'tds_deduction', parseFloat(e.target.value) || 0)}
                          className="w-16 h-7 text-right px-1.5 rounded border border-input bg-background font-mono text-xs text-rose-600 focus:ring-1 focus:ring-primary font-medium"
                          title="TDS Deduction (Auto-calculated, click to edit)"
                        />
                      </td>

                      {/* Statutory Deduction (Auto-calculated & Editable) */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          value={row.statutory_deduction || ''}
                          placeholder="0"
                          onChange={(e) => handleCellChange(idx, 'statutory_deduction', parseFloat(e.target.value) || 0)}
                          className="w-16 h-7 text-right px-1.5 rounded border border-input bg-background font-mono text-xs text-rose-600 focus:ring-1 focus:ring-primary font-medium"
                          title="Statutory / PT Deduction (Auto-calculated, click to edit)"
                        />
                      </td>

                      {/* Net Salary */}
                      <td className="py-2.5 px-3 text-right bg-primary/5 whitespace-nowrap">
                        <div className="font-bold text-sm text-foreground">
                          ₹{Number(row.net_salary).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Mode of Payment */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <select
                          value={row.payment_mode}
                          onChange={(e) => handleCellChange(idx, 'payment_mode', e.target.value as any)}
                          className="h-7 rounded border border-input bg-background px-1.5 text-[11px] font-medium"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <select
                          value={row.status}
                          onChange={(e) => handleCellChange(idx, 'status', e.target.value as any)}
                          className={`h-7 rounded border px-1.5 text-[11px] font-semibold capitalize ${
                            row.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800'
                              : row.status === 'finalized'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800'
                              : 'bg-zinc-500/10 text-zinc-600 border-zinc-300 dark:border-zinc-800'
                          }`}
                        >
                          <option value="draft">Draft</option>
                          <option value="finalized">Finalized</option>
                          <option value="paid">Paid</option>
                        </select>
                      </td>

                      {/* Payslip & Undo / Reset row */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenPayslip(row)}
                            title="Preview & Download Payslip"
                            className="p-1 rounded text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetRow(idx)}
                            title="Revert edits for this employee back to original saved/default state"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <RotateCcw size={14} />
                          </button>
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

      {/* Tax Slabs & Rules Modal */}
      <TaxSettingsModal
        isOpen={isTaxSettingsOpen}
        onClose={() => setIsTaxSettingsOpen(false)}
        onSaved={() => {
          refetchRecords();
          handleRecalculateTdsStatutory();
        }}
      />

      {/* Individual Payslip Preview Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        data={payslipData}
      />
    </div>
  );
}
