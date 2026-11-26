import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToIndianWords } from './numberToWords';

export interface PayslipData {
  record: any;
  employee: any;
  entityName?: string;
  monthYear: string; // 'YYYY-MM'
}

export function formatMonthName(monthYear: string): string {
  try {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthYear;
  }
}

export function generateSinglePayslipPdf(data: PayslipData, existingDoc?: jsPDF): jsPDF {
  const doc = existingDoc || new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { record, employee, entityName, monthYear } = data;

  const orgName = entityName || employee?.entity?.name || 'GURUKUL FINANCE';
  const monthTitle = formatMonthName(monthYear).toUpperCase();
  const empName = employee?.name || record?.employee_name || 'Staff Member';
  const role = employee?.nature_of_work || record?.employee_role || 'Staff';
  const phone = employee?.phone || record?.phone || 'N/A';
  const doj = employee?.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString('en-IN') : 'N/A';
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

  // Page border
  doc.setDrawColor(200, 205, 215);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, 194, 281);

  // Top decorative bar
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(8, 8, 194, 4, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(orgName, 105, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Gurukul Campus • Payroll & Accounts Department', 105, 27, { align: 'center' });

  // Banner: SALARY SLIP
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 32, 182, 9, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229);
  doc.text(`SALARY SLIP FOR THE MONTH OF ${monthTitle}`, 105, 38, { align: 'center' });

  // Reference Details bar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payslip No: ${payslipNo}`, 16, 47);
  doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN')}`, 105, 47, { align: 'center' });
  doc.text(`Status: ${(record?.status || 'Finalized').toUpperCase()}`, 192, 47, { align: 'right' });

  // Horizontal line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 50, 196, 50);

  // Employee Information Box
  autoTable(doc, {
    startY: 53,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 32 },
      1: { cellWidth: 58 },
      2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 32 },
      3: { cellWidth: 60 },
    },
    body: [
      ['Employee Name:', empName, 'Designation / Role:', role],
      ['Employee Phone:', phone, 'Entity / Unit:', orgName],
      ['Date of Joining:', doj, 'Salary Plan:', isHourly ? `Hourly (${hoursWorked} hrs @ Rs.${hourlyRate})` : 'Monthly Fixed'],
      [
        'Payment Mode:',
        paymentMode,
        'Leaves / Absent:',
        `${record?.leaves_taken || 0} days (${record?.unpaid_leaves || 0} unpaid)`,
      ],
      ...(paymentMode === 'BANK' && employee?.bank_account_number
        ? [
            [
              'Bank Name:',
              employee?.bank_name || 'Bank Transfer',
              'Bank A/C No:',
              employee?.bank_account_number + (employee?.bank_ifsc ? ` (IFSC: ${employee.bank_ifsc})` : ''),
            ],
          ]
        : []),
    ],
  });

  const currentY = (doc as any).lastAutoTable.finalY + 6;

  // Earnings & Deductions Table
  const earningsList: { name: string; amount: number }[] = [
    { name: isHourly ? `Basic Hourly Pay (${hoursWorked} hrs @ Rs.${hourlyRate})` : 'Basic Monthly Salary', amount: baseSalary },
  ];
  if (bonus > 0) earningsList.push({ name: 'Performance Bonus / Incentives', amount: bonus });

  const deductionsList: { name: string; amount: number }[] = [];
  if (advances > 0) deductionsList.push({ name: 'Salary Advance Recovery', amount: advances });
  if (tds > 0) deductionsList.push({ name: 'Tax Deducted at Source (TDS)', amount: tds });
  if (statutory > 0) deductionsList.push({ name: 'Professional Tax / Statutory', amount: statutory });
  if (leaveDeduction > 0) deductionsList.push({ name: 'Unpaid Leave Deduction', amount: leaveDeduction });
  if (other > 0) deductionsList.push({ name: 'Other Deductions', amount: other });
  if (deductionsList.length === 0) deductionsList.push({ name: 'Nil Deductions', amount: 0 });

  const maxRows = Math.max(earningsList.length, deductionsList.length);
  const tableRows: any[] = [];

  for (let i = 0; i < maxRows; i++) {
    const earn = earningsList[i] || { name: '', amount: null };
    const ded = deductionsList[i] || { name: '', amount: null };

    tableRows.push([
      earn.name,
      earn.amount !== null ? `Rs. ${earn.amount.toLocaleString('en-IN')}` : '',
      ded.name,
      ded.amount !== null ? `Rs. ${ded.amount.toLocaleString('en-IN')}` : '',
    ]);
  }

  // Summary row
  tableRows.push([
    'TOTAL GROSS EARNINGS',
    `Rs. ${grossEarnings.toLocaleString('en-IN')}`,
    'TOTAL DEDUCTIONS',
    `Rs. ${totalDeductions.toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 55, fontSize: 8.5 },
      1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', fontSize: 8.5 },
      2: { cellWidth: 57, fontSize: 8.5 },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold', fontSize: 8.5 },
    },
    head: [['EARNINGS', 'AMOUNT', 'DEDUCTIONS', 'AMOUNT']],
    body: tableRows,
    didParseCell: (hookData) => {
      // Highlight the total summary row
      if (hookData.section === 'body' && hookData.row.index === tableRows.length - 1) {
        hookData.cell.styles.fillColor = [241, 245, 249];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.textColor = [15, 23, 42];
      }
    },
  });

  const netPayY = (doc as any).lastAutoTable.finalY + 8;

  // NET SALARY HIGHLIGHT BOX
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.setDrawColor(199, 210, 254); // Indigo 200
  doc.roundedRect(14, netPayY, 182, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(67, 56, 202); // Indigo 700
  doc.text('NET SALARY PAYABLE:', 20, netPayY + 9);

  doc.setFontSize(16);
  doc.setTextColor(30, 27, 75);
  doc.text(`Rs. ${netSalary.toLocaleString('en-IN')}`, 178, netPayY + 9, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`In Words: ${netInWords}`, 20, netPayY + 17);

  // Signatures & Remarks Box
  const sigY = netPayY + 38;
  doc.setDrawColor(203, 213, 225);
  doc.line(24, sigY, 74, sigY);
  doc.line(134, sigY, 184, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Employee Signature', 49, sigY + 5, { align: 'center' });
  doc.text('Authorized Signatory', 159, sigY + 5, { align: 'center' });

  // Footer Disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Note: This is a system-generated official salary slip issued by Gurukul Finance Payroll System.',
    105,
    275,
    { align: 'center' }
  );

  return doc;
}

export function downloadPayslipPdf(data: PayslipData) {
  const doc = generateSinglePayslipPdf(data);
  const empName = (data.employee?.name || data.record?.employee_name || 'Staff').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Payslip_${empName}_${data.monthYear}.pdf`);
}

export function downloadAllPayslipsPdf(records: PayslipData[], monthYear: string) {
  if (!records.length) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  records.forEach((item, index) => {
    if (index > 0) doc.addPage();
    generateSinglePayslipPdf(item, doc);
  });

  doc.save(`All_Payslips_${monthYear}.pdf`);
}
