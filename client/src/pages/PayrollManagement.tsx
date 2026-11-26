import { useState } from 'react';
import { UserCheck, HandCoins, CalendarCheck, Calculator, FileText } from 'lucide-react';
import EmployeesList from '../components/payroll/EmployeesList';
import AdvancesList from '../components/payroll/AdvancesList';
import MonthlySalaryFinalization from '../components/payroll/MonthlySalaryFinalization';
import AttendanceManagement from '../components/payroll/AttendanceManagement';
import PayslipsManagement from '../components/payroll/PayslipsManagement';

export function PayrollManagement() {
  const [activeTab, setActiveTab] = useState<'employees' | 'advances' | 'attendance' | 'salary_finalization' | 'payslips'>('employees');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Payroll Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage staff onboarding, salary advances & installment deductions, daily attendance & timesheets, monthly payroll finalization, and payslips.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border overflow-x-auto modern-scrollbar">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'employees'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <UserCheck size={18} />
            Employee Onboarding
          </button>

          <button
            onClick={() => setActiveTab('advances')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'advances'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <HandCoins size={18} />
            Advance Management
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <CalendarCheck size={18} />
            Attendance Management
          </button>

          <button
            onClick={() => setActiveTab('salary_finalization')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'salary_finalization'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Calculator size={18} />
            Finalization of Salary Month & Report
          </button>

          <button
            onClick={() => setActiveTab('payslips')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'payslips'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <FileText size={18} />
            Payslips
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'employees' && <EmployeesList />}

          {activeTab === 'advances' && <AdvancesList />}

          {activeTab === 'attendance' && <AttendanceManagement />}

          {activeTab === 'salary_finalization' && <MonthlySalaryFinalization />}

          {activeTab === 'payslips' && (
            <PayslipsManagement onNavigateToFinalization={() => setActiveTab('salary_finalization')} />
          )}
        </div>
      </div>
    </div>
  );
}

export default PayrollManagement;
