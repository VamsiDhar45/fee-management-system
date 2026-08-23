import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, Download } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ComponentData {
  category_name: string;
  total_amount: number;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export const ComponentRevenueReport = ({ startDate, endDate, entityId, paymentMode, description }: { startDate: string, endDate: string, entityId?: string, paymentMode?: string, description?: string }) => {
  const [data, setData] = useState<ComponentData[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
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
      const result = await api.getComponentRevenueReport(startDate, endDate, entityId, paymentMode);
      setData(result?.summary || []);
      setRawData(result?.rawData || []);
    } catch (error) {
      console.error('Failed to load component revenue data', error);
      toast.error('Failed to load revenue report');
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = data.reduce((sum, item) => sum + Number(item.total_amount), 0);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  const handleExport = () => {
    setIsExporting(true);
    try {
      const headers = ['Category Name', 'Total Revenue'];
      const csvRows = [headers.join(',')];
      
      data.forEach(row => {
        csvRows.push(`"${row.category_name}",${row.total_amount}`);
      });
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Component_Revenue_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
      doc.text('Component Revenue Report', 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      if (description) {
        doc.text(description, 14, 22);
      }
      
      // Summary Table
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Summary by Component', 14, 32);
      autoTable(doc, {
        startY: 35,
        head: [['Category Name', 'Total Revenue']],
        body: data.map(row => [row.category_name, `Rs ${row.total_amount}`]),
        foot: [['Total', `Rs ${totalRevenue}`]],
      });
      
      // Details Table
      doc.text('Transaction Details', 14, (doc as any).lastAutoTable.finalY + 10);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Date', 'Category', 'Mode', 'Amount']],
        body: rawData.map(r => [
          new Date(r.incomes?.created_at).toLocaleDateString(),
          r.fee_components?.category_name || 'N/A',
          r.incomes?.payment_mode || 'N/A',
          `Rs ${r.amount}`
        ]),
      });
      
      doc.save(`Component_Revenue_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF export failed', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Component Revenue</h2>
          <p className="text-sm text-muted-foreground">{description || 'Detailed breakdown of revenue by fee component'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} disabled={isExporting || data.length === 0} variant="outline" className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            CSV
          </Button>
          <Button onClick={handleExportPDF} disabled={data.length === 0} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20 shrink-0">
        <CardContent className="p-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Component Revenue</p>
            <h3 className="text-3xl font-bold mt-1">₹ {totalRevenue.toLocaleString()}</h3>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Share by Component</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="total_amount"
                  nameKey="category_name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Component Comparison</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="category_name" type="category" width={100} />
                <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                <Bar dataKey="total_amount" radius={[0, 4, 4, 0]}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card className="flex-1 overflow-hidden flex flex-col mt-4">
        <CardHeader className="bg-muted/20 pb-4 border-b">
          <CardTitle className="text-lg">Underlying Transactions (Showing First 50)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          {rawData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No transactions found for the selected period.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Category</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">Mode</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rawData.slice(0, 50).map((t, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-4 py-3">{new Date(t.incomes?.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">{t.fee_components?.category_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-md">
                        {t.incomes?.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-green-500 text-right">₹{Number(t.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rawData.length > 50 && (
            <div className="p-4 text-center text-xs text-muted-foreground border-t bg-muted/10">
              Showing first 50 of {rawData.length} transactions. Please export to PDF to view all.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
