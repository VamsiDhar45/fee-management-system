import { useState, useEffect } from 'react';
import { api, type Batch } from '../../api';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '../ui/button';

interface StudentBalanceData {
  student_id: string;
  student_name: string;
  batch_name: string;
  contact_number: string;
  enrollment_date: string;
  total_fee: number;
  paid_cash: number;
  paid_bank: number;
  total_paid: number;
  balance: number;
}

interface StudentBalancesReportProps {
  description?: string;
}

export const StudentBalancesReport: React.FC<StudentBalancesReportProps> = ({ description }) => {
  const [data, setData] = useState<StudentBalanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch]);

  const loadBatches = async () => {
    try {
      const data = await api.getBatches();
      setBatches(data);
    } catch (error) {
      console.error('Failed to load batches:', error);
      toast.error('Failed to load batches');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const reportData = await api.getStudentBalancesReport(selectedBatch === 'all' ? undefined : selectedBatch);
      setData(reportData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch student balances');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      const headers = ['Student Name', 'Batch', 'Phone Number', 'Enrollment Date', 'Total Fee', 'Paid (Cash)', 'Paid (Bank)', 'Total Paid', 'Balance'];
      const csvRows = [headers.join(',')];

      data.forEach(row => {
        csvRows.push(`${row.student_name},${row.batch_name},${row.contact_number || 'N/A'},${row.enrollment_date},${row.total_fee},${row.paid_cash},${row.paid_bank},${row.total_paid},${row.balance}`);
      });

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `Student_Balances_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const formatCurrencyForPDF = (amount: number) => {
    return `Rs ${Number(amount || 0).toLocaleString('en-IN')}`;
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Student Fee Summary', 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      if (description) {
        doc.text(description, 14, 22);
      }
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total Fee: ${formatCurrencyForPDF(totalFeeAll)} | Collected: ${formatCurrencyForPDF(totalPaidAll)} | Balance: ${formatCurrencyForPDF(totalBalanceAll)}`, 14, 32);
      
      autoTable(doc, {
        startY: 35,
        head: [['Student Name', 'Batch', 'Total Fee', 'Paid', 'Balance']],
        body: data.map(row => [
          row.student_name,
          row.batch_name,
          formatCurrencyForPDF(row.total_fee),
          formatCurrencyForPDF(row.total_paid),
          formatCurrencyForPDF(row.balance)
        ]),
      });
      
      doc.save(`Student_Balances_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF export failed', error);
      toast.error('Failed to generate PDF');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const totalFeeAll = data.reduce((sum, row) => sum + row.total_fee, 0);
  const totalPaidAll = data.reduce((sum, row) => sum + row.total_paid, 0);
  const totalBalanceAll = data.reduce((sum, row) => sum + row.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h3 className="text-lg font-medium">Student Fee Summary</h3>
          <p className="text-sm text-muted-foreground">{description || 'Detailed view of student balances and payment modes'}</p>
        </div>
        <div className="flex gap-4">
          <div className="w-[200px]">
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="gap-2"
              disabled={loading || data.length === 0}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={exportToPDF}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
              disabled={loading || data.length === 0}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
          <p className="text-sm font-medium text-indigo-900 mb-1">Total Fee (All Students)</p>
          <p className="text-2xl font-bold text-indigo-700">{formatCurrency(totalFeeAll)}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
          <p className="text-sm font-medium text-emerald-900 mb-1">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPaidAll)}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-lg border border-rose-100">
          <p className="text-sm font-medium text-rose-900 mb-1">Total Balance</p>
          <p className="text-2xl font-bold text-rose-700">{formatCurrency(totalBalanceAll)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Student Name</th>
                <th className="px-6 py-4 font-medium">Batch</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium text-right">Total Fee</th>
                <th className="px-6 py-4 font-medium text-right">Paid (Cash)</th>
                <th className="px-6 py-4 font-medium text-right">Paid (Bank)</th>
                <th className="px-6 py-4 font-medium text-right">Total Paid</th>
                <th className="px-6 py-4 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    Loading report data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                    No data found for the selected criteria.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium">{row.student_name}</td>
                    <td className="px-6 py-3">{row.batch_name}</td>
                    <td className="px-6 py-3">{row.contact_number || 'N/A'}</td>
                    <td className="px-6 py-3 text-right">{formatCurrency(row.total_fee)}</td>
                    <td className="px-6 py-3 text-right text-muted-foreground">{formatCurrency(row.paid_cash)}</td>
                    <td className="px-6 py-3 text-right text-muted-foreground">{formatCurrency(row.paid_bank)}</td>
                    <td className="px-6 py-3 text-right font-medium text-emerald-600">{formatCurrency(row.total_paid)}</td>
                    <td className="px-6 py-3 text-right font-medium text-rose-600">{formatCurrency(row.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
