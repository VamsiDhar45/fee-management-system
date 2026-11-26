export type Gender = 'male' | 'female' | 'other';
export type PaymentMode = 'cash' | 'bank';
export type SalaryPlanType = 'monthly' | 'hourly';
export type EmployeeStatus = 'active' | 'inactive';
export type AdvanceStatus = 'active' | 'completed' | 'cancelled';
export type InstallmentStatus = 'pending' | 'recovered' | 'skipped' | 'cancelled';

export interface PayrollEmployee {
  id: string;
  name: string;
  gender: Gender;
  phone?: string;
  address?: string;
  nature_of_work?: string;
  entity_id?: string | null;
  entity?: {
    id: string;
    name: string;
  };
  date_of_joining: string;
  payment_mode: PaymentMode;
  salary_plan_type: SalaryPlanType;
  base_salary: number;
  status: EmployeeStatus;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePayrollEmployeeInput {
  name: string;
  gender: Gender;
  phone?: string;
  address?: string;
  nature_of_work?: string;
  entity_id?: string | null;
  date_of_joining: string;
  payment_mode: PaymentMode;
  salary_plan_type: SalaryPlanType;
  base_salary: number;
  status?: EmployeeStatus;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc?: string;
  bank_branch?: string;
}

export type UpdatePayrollEmployeeInput = Partial<CreatePayrollEmployeeInput>;

export interface PayrollAdvanceInstallment {
  id: string;
  advance_id: string;
  installment_number: number;
  month_year: string; // e.g. '2026-12'
  amount: number;
  status: InstallmentStatus;
  recovered_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface PayrollAdvance {
  id: string;
  employee_id: string;
  employee?: PayrollEmployee;
  advance_amount: number;
  advance_date: string;
  deduction_start_month: string; // 'YYYY-MM'
  installments_count: number;
  installment_amount: number;
  payment_mode: PaymentMode;
  notes?: string | null;
  status: AdvanceStatus;
  recovered_amount: number;
  installments?: PayrollAdvanceInstallment[];
  created_at: string;
  updated_at: string;
}

export interface CreatePayrollAdvanceInput {
  employee_id: string;
  advance_amount: number;
  advance_date: string;
  deduction_start_month: string;
  installments_count: number;
  installment_amount: number;
  payment_mode: PaymentMode;
  notes?: string;
}


export type PayrollRecordStatus = 'draft' | 'finalized' | 'paid';

export interface PayrollMonthlyRecord {
  id: string;
  employee_id: string;
  employee?: PayrollEmployee;
  month_year: string; // 'YYYY-MM'
  base_salary: number;
  salary_plan_type: SalaryPlanType;
  hours_worked: number;
  hourly_rate: number;
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
  payment_mode: PaymentMode;
  status: PayrollRecordStatus;
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveMonthlyPayrollRecordInput {
  id?: string;
  employee_id: string;
  month_year: string;
  base_salary: number;
  salary_plan_type: SalaryPlanType;
  hours_worked: number;
  hourly_rate: number;
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
  payment_mode: PaymentMode;
  status?: PayrollRecordStatus;
  paid_at?: string | null;
  notes?: string | null;
}


export interface PayrollTaxSettings {
  id: string;
  tds_threshold: number;
  tds_rate_percent: number;
  pt_threshold: number;
  pt_flat_amount: number;
  free_leaves_per_month: number;
  created_at?: string;
  updated_at?: string;
}


export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'holiday' | 'leave';

export interface PayrollAttendance {
  id: string;
  employee_id: string;
  employee?: PayrollEmployee;
  attendance_date: string; // 'YYYY-MM-DD'
  status: AttendanceStatus;
  hours_worked: number;
  overtime_hours: number;
  check_in_time?: string | null;
  check_out_time?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveAttendanceInput {
  id?: string;
  employee_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  hours_worked: number;
  overtime_hours?: number;
  notes?: string | null;
}
