import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Utility for Amount in Words (Indian System)
function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  };

  const wholePart = Math.floor(num);
  let words = convert(wholePart) + ' Rupees';
  
  const decimalPart = Math.round((num - wholePart) * 100);
  if (decimalPart > 0) {
    words += ' and ' + convert(decimalPart) + ' Paise';
  }
  
  return words + ' Only';
}

export const generatePaymentVoucher = (expense: any) => {
  const doc = new jsPDF();
  const entityName = expense.entities?.name || 'ORGANIZATION';
  const upperEntityName = entityName.toUpperCase();
  
  // Use the description field from the database if available, otherwise fallback
  const address = expense.entities?.description || 'Address not configured';

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const pageWidth = doc.internal.pageSize.width;
  doc.text(upperEntityName, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(address, pageWidth / 2, 26, { align: 'center' });

  // Divider
  doc.setLineWidth(0.5);
  doc.line(14, 38, pageWidth - 14, 38);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT VOUCHER', pageWidth / 2, 48, { align: 'center' });

  // S.no and Date
  doc.setFontSize(11);
  const sno = expense.voucher_number || 'N/A';
  doc.text(`S.no: ${sno}`, 14, 60);
  
  const dateStr = expense.expense_date ? new Date(expense.expense_date).toLocaleDateString('en-GB') : '......./........./.............';
  doc.text(`Date: ${dateStr}`, pageWidth - 14, 60, { align: 'right' });

  // Paid to
  // For expenses, 'Paid to' can be derived from the description or category if no payee exists. We will use description or empty line.
  doc.text(`Paid to: ____________________________________________________`, 14, 75);

  // Table
  autoTable(doc, {
    startY: 85,
    head: [['Description', 'Amount']],
    body: [
      [expense.description || (expense.expense_categories?.name || 'Expense'), `${Number(expense.amount).toFixed(2)}`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    bodyStyles: { minCellHeight: 30, valign: 'top' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 50, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Amount in words
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words: ', 14, finalY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${numberToWords(Number(expense.amount))}`, 48, finalY);
  
  // Dotted line under amount in words
  doc.text('........................................................................................................................................', 45, finalY + 1);

  // Payment Mode details box
  const boxY = finalY + 10;
  
  autoTable(doc, {
    startY: boxY,
    theme: 'grid',
    styles: { minCellHeight: 10, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 20 },
      2: { cellWidth: 10 },
      3: { cellWidth: 20 },
      4: { cellWidth: 10 },
      5: { cellWidth: 30 },
      6: { cellWidth: 10 }
    },
    body: [
      ['Payment Mode:', 'Cash', expense.payment_mode === 'CASH' ? 'X' : '', 'Cheque', expense.payment_mode === 'BANK' || expense.payment_mode === 'CHEQUE' ? 'X' : '', 'Online\nTransfer', ['UPI', 'BANK_TRANSFER', 'ONLINE'].includes(expense.payment_mode) ? 'X' : ''],
      ['Cheque No:', { content: (expense.payment_mode === 'BANK' || expense.payment_mode === 'CHEQUE') && expense.reference_number ? expense.reference_number : '', colSpan: 6 }],
      ['Transaction No:', { content: ['UPI', 'BANK_TRANSFER', 'ONLINE'].includes(expense.payment_mode) && expense.reference_number ? expense.reference_number : '', colSpan: 6 }]
    ]
  });

  const sigY = (doc as any).lastAutoTable.finalY + 30;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.text('Signature of the Receiver', 30, sigY);
  doc.text('Authorized Signature', pageWidth - 70, sigY);

  doc.setFont('helvetica', 'normal');
  doc.text('...................................................', 25, sigY + 20);
  doc.text('...................................................', pageWidth - 75, sigY + 20);

  doc.save(`Voucher_${sno.replace(/\//g, '-')}.pdf`);
};
