import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Download } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const TransactionsReport = ({ startDate, endDate, entityId, paymentMode, description }: { startDate: string, endDate: string, entityId?: string, paymentMode?: string, description?: string }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, entityId, paymentMode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await api.exportAllTransactions(entityId, startDate, endDate, paymentMode);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions', error);
      toast.error('Failed to load transactions report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const headers = ['Date', 'Receipt Number', 'Student Name', 'Batch', 'Payment Mode', 'Entity', 'Amount'];
      const csvRows = [headers.join(',')];
      
      transactions.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString();
        const receipt = t.receipt_number || '-';
        const studentName = `"${t.students?.name || ''}"`;
        const batchName = `"${t.students?.batches?.name || ''}"`;
        const mode = t.payment_mode;
        const entity = `"${t.entities?.name || ''}"`;
        const amount = t.amount;
        
        csvRows.push(`${date},${receipt},${studentName},${batchName},${mode},${entity},${amount}`);
      });
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Transactions_Report_${new Date().toISOString().split('T')[0]}.csv`);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export downloaded successfully!');
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Transactions Report', 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      if (description) {
        doc.text(description, 14, 22);
      }
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total Transactions: ${transactions.length} | Total Amount: Rs ${totalAmount.toLocaleString()}`, 14, 32);
      autoTable(doc, {
        startY: 35,
        head: [['Date', 'Receipt', 'Student', 'Batch', 'Mode', 'Entity', 'Amount']],
        body: transactions.map(t => [
          new Date(t.created_at).toLocaleDateString(),
          t.receipt_number || '-',
          t.students?.name || '',
          t.students?.batches?.name || '',
          t.payment_mode,
          t.entities?.name || '',
          `Rs ${t.amount}`
        ]),
      });
      
      doc.save(`Transactions_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF export failed', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Transactions Report</h2>
          <p className="text-sm text-muted-foreground">{description || 'Detailed view of all transactions for the selected period'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} disabled={isExporting || transactions.length === 0} variant="outline" className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            CSV
          </Button>
          <Button onClick={handleExportPDF} disabled={transactions.length === 0} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-primary">Total Transactions</p>
            <h3 className="text-3xl font-bold mt-2 text-primary">{transactions.length}</h3>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20 md:col-span-2">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-green-600 dark:text-green-500">Total Amount</p>
            <h3 className="text-3xl font-bold mt-2 text-green-600 dark:text-green-500">₹ {totalAmount.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/20 pb-4 border-b">
          <CardTitle className="text-lg">Transactions List (Showing First 50)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No transactions found for the selected period.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Receipt</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Student</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Batch</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Mode</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Entity</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.slice(0, 50).map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.receipt_number || '-'}</td>
                    <td className="px-4 py-3 font-medium">{t.students?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.students?.batches?.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-md">
                        {t.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.entities?.name}</td>
                    <td className="px-4 py-3 font-bold text-green-500 text-right">₹{Number(t.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {transactions.length > 50 && (
            <div className="p-4 text-center text-xs text-muted-foreground border-t bg-muted/10">
              Showing first 50 of {transactions.length} transactions. Please export to view all.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
