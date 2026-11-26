import React from 'react';
import { X, Download, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { numberToIndianWords } from '../../utils/numberToWords';
import { downloadPayslipPdf, formatMonthName, type PayslipData } from '../../utils/payslipPdfGenerator';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PayslipData | null;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const { record, employee, entityName, monthYear } = data;
  const orgName = entityName || employee?.entity?.name || 'GURUKUL FINANCE';
  const monthTitle = formatMonthName(monthYear);
  const empName = employee?.name || record?.employee_name || 'Staff Member';
  const role = employee?.nature_of_work || record?.employee_role || 'Staff';
  const phone = employee?.phone || record?.phone || 'N/A';
  const doj = employee?.date_of_joining
    ? new Date(employee.date_of_joining).toLocaleDateString('en-IN')
    : 'N/A';
  const paymentMode = (record?.payment_mode || employee?.payment_mode || 'cash').toUpperCase();
  const isHourly = record?.salary_plan_type === 'hourly' || employee?.salary_plan_type === 'hourly';
  const hoursWorked = Number(record?.hours_worked) || 0;
  const hourlyRate = Number(record?.hourly_rate) || Number(employee?.base_salary) || 0;

  const baseSalary = Number(record?.base_salary) || 0;
  const bonus = Number(record?.bonus) || 0;
  const grossEarnings = baseSalary + bonus;

  const advances = Number(record?.advances_deduction) || 0;
  const tds = Number(record?.tds_deduction) || 0;
  const statutory = Number(record?.statutory_deduction) || 0;
  const leaveDeduction = Number(record?.leave_deduction) || 0;
  const other = Number(record?.other_deductions) || 0;
  const totalDeductions = advances + tds + statutory + leaveDeduction + other;

  const netSalary = Number(record?.net_salary) || Math.max(0, grossEarnings - totalDeductions);
  const netInWords = numberToIndianWords(netSalary);

  const payslipNo = `PS-${monthYear.replace('-', '')}-${(employee?.id || record?.id || '0000').slice(0, 6).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    downloadPayslipPdf(data);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="bg-card text-card-foreground border border-border shadow-2xl rounded-2xl w-full max-w-3xl z-50 overflow-hidden my-auto max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Action Bar */}
          <div className="flex justify-between items-center px-6 py-3.5 border-b border-border bg-muted/30 no-print">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Payslip Preview</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {monthTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs h-8"
              >
                <Printer size={14} /> Print
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <Download size={14} /> Download PDF
              </Button>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors ml-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Payslip Body */}
          <div className="overflow-y-auto modern-scrollbar p-6 bg-slate-50/50 dark:bg-background/50 flex-1">
            <div className="payslip-printable bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm p-7 max-w-2xl mx-auto font-sans relative">
              {/* Top Accent line */}
              <div className="h-1.5 bg-indigo-600 rounded-t-lg -mx-7 -mt-7 mb-6" />

              {/* Institution Header */}
              <div className="text-center pb-4 border-b border-slate-200">
                <h1 className="text-2xl font-black tracking-wide uppercase text-slate-900">{orgName}</h1>
                <p className="text-xs text-slate-500 mt-0.5">Gurukul Campus • Payroll & Accounts Department</p>
                <div className="inline-block mt-3 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-md">
                  <span className="text-xs font-bold tracking-wider text-indigo-700 uppercase">
                    SALARY SLIP FOR THE MONTH OF {monthTitle}
                  </span>
                </div>
              </div>

              {/* Meta details bar */}
              <div className="flex justify-between items-center py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 my-4">
                <div>
                  <span className="font-semibold text-slate-500">Payslip No: </span>
                  <span className="font-mono font-bold text-slate-800">{payslipNo}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Issue Date: </span>
                  <span className="font-medium text-slate-800">{new Date().toLocaleDateString('en-IN')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Status: </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    {record?.status || 'Finalized'}
                  </span>
                </div>
              </div>

              {/* Employee Information Card */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs py-3 px-3.5 bg-slate-50/80 rounded-lg border border-slate-100 mb-6">
                <div>
                  <span className="text-slate-400 font-medium">Employee Name: </span>
                  <span className="font-bold text-slate-900">{empName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Designation: </span>
                  <span className="font-semibold text-slate-800">{role}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Phone: </span>
                  <span className="font-medium text-slate-800">{phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Entity / Unit: </span>
                  <span className="font-medium text-slate-800">{orgName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Date of Joining: </span>
                  <span className="font-medium text-slate-800">{doj}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Salary Plan: </span>
                  <span className="font-semibold text-indigo-700">
                    {isHourly ? `Hourly (${hoursWorked} hrs @ ₹${hourlyRate})` : 'Monthly Fixed'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Payment Mode: </span>
                  <span className="font-semibold uppercase text-slate-800">{paymentMode}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Leaves / Absent: </span>
                  <span className="font-medium text-slate-800">
                    {record?.leaves_taken || 0} days ({record?.unpaid_leaves || 0} unpaid)
                  </span>
                </div>

                {paymentMode === 'BANK' && employee?.bank_account_number && (
                  <>
                    <div>
                      <span className="text-slate-400 font-medium">Bank Name: </span>
                      <span className="font-medium text-slate-800">{employee?.bank_name || 'Bank Transfer'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Bank A/C: </span>
                      <span className="font-mono font-medium text-slate-800">
                        {employee.bank_account_number} {employee?.bank_ifsc ? `(${employee.bank_ifsc})` : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-2 border border-slate-200 rounded-lg overflow-hidden mb-6 text-xs">
                {/* Earnings column */}
                <div className="border-r border-slate-200">
                  <div className="bg-indigo-600 text-white font-bold px-3 py-2 text-center uppercase tracking-wider text-[11px]">
                    Earnings
                  </div>
                  <div className="divide-y divide-slate-100 min-h-[140px] flex flex-col justify-between">
                    <div className="divide-y divide-slate-100">
                      <div className="flex justify-between py-2 px-3">
                        <span className="text-slate-600">
                          {isHourly ? `Hourly Wages (${hoursWorked} hrs)` : 'Basic Salary'}
                        </span>
                        <span className="font-semibold font-mono text-slate-900">
                          ₹{baseSalary.toLocaleString('en-IN')}
                        </span>
                      </div>
                      {bonus > 0 && (
                        <div className="flex justify-between py-2 px-3 bg-emerald-50/50">
                          <span className="text-emerald-700">Bonus / Incentives</span>
                          <span className="font-semibold font-mono text-emerald-700">
                            +₹{bonus.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between py-2.5 px-3 bg-slate-100/80 font-bold border-t border-slate-200 text-slate-900">
                      <span>Total Earnings</span>
                      <span className="font-mono">₹{grossEarnings.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions column */}
                <div>
                  <div className="bg-slate-800 text-white font-bold px-3 py-2 text-center uppercase tracking-wider text-[11px]">
                    Deductions
                  </div>
                  <div className="divide-y divide-slate-100 min-h-[140px] flex flex-col justify-between">
                    <div className="divide-y divide-slate-100">
                      {advances > 0 && (
                        <div className="flex justify-between py-2 px-3">
                          <span className="text-slate-600">Salary Advance Cut</span>
                          <span className="font-mono text-slate-800">₹{advances.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {tds > 0 && (
                        <div className="flex justify-between py-2 px-3">
                          <span className="text-slate-600">TDS (Income Tax)</span>
                          <span className="font-mono text-slate-800">₹{tds.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {statutory > 0 && (
                        <div className="flex justify-between py-2 px-3">
                          <span className="text-slate-600">Professional Tax (PT)</span>
                          <span className="font-mono text-slate-800">₹{statutory.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {leaveDeduction > 0 && (
                        <div className="flex justify-between py-2 px-3">
                          <span className="text-slate-600">Unpaid Leaves</span>
                          <span className="font-mono text-rose-600">₹{leaveDeduction.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {other > 0 && (
                        <div className="flex justify-between py-2 px-3">
                          <span className="text-slate-600">Other Deductions</span>
                          <span className="font-mono text-slate-800">₹{other.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {totalDeductions === 0 && (
                        <div className="flex justify-between py-2 px-3 text-slate-400 italic">
                          <span>Nil Deductions</span>
                          <span>₹0</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between py-2.5 px-3 bg-slate-100/80 font-bold border-t border-slate-200 text-slate-900">
                      <span>Total Deductions</span>
                      <span className="font-mono">₹{totalDeductions.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary Highlight Box */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-8">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Net Salary Payable
                    </span>
                    <p className="text-[11px] text-slate-600 italic mt-0.5">
                      Amount in words: <span className="font-semibold text-slate-800">{netInWords}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-indigo-900">
                      ₹{netSalary.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-end pt-10 text-xs">
                <div className="text-center w-40">
                  <div className="border-b border-slate-300 pb-1 mb-1" />
                  <span className="text-slate-500 font-medium">Employee Signature</span>
                </div>
                <div className="text-center w-48">
                  <div className="border-b border-slate-300 pb-1 mb-1" />
                  <span className="text-slate-500 font-medium">Authorized Signatory</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-8 pt-4 border-t border-slate-100">
                This is a system-generated official salary slip issued by Gurukul Finance Payroll Management System.
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 border-t border-border bg-card flex justify-end gap-2 no-print">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={handleDownload} className="gap-1.5">
              <Download size={14} /> Download PDF
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Print-specific style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .payslip-printable, .payslip-printable * { visibility: visible !important; }
          .payslip-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .no-print { display: none !important; }
        }
      `}} />
    </AnimatePresence>
  );
};

export default PayslipModal;
