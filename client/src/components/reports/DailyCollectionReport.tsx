import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Loader2, Download } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DCRData {
  collection_date: string;
  payment_mode: string;
  total_amount: number;
}

interface ChartData {
  date: string;
  CASH: number;
  BANK: number;
  Total: number;
}

export const DailyCollectionReport = ({ startDate, endDate, entityId, paymentMode, description }: { startDate: string, endDate: string, entityId?: string, paymentMode?: string, description?: string }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [rawData, setRawData] = useState<DCRData[]>([]);
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
      const result = await api.getDCRReport(startDate, endDate, entityId);
      
      let filteredResult = result || [];
      if (paymentMode) {
        filteredResult = filteredResult.filter((d: DCRData) => d.payment_mode === paymentMode);
      }
      
      setRawData(filteredResult);
      
      // Transform data for chart
      const grouped = filteredResult.reduce((acc: any, curr: DCRData) => {
        const date = curr.collection_date;
        if (!acc[date]) {
          acc[date] = { date, CASH: 0, BANK: 0, Total: 0 };
        }
        acc[date][curr.payment_mode] += Number(curr.total_amount);
        acc[date].Total += Number(curr.total_amount);
        return acc;
      }, {});
      
      setChartData(Object.values(grouped));
    } catch (error) {
      console.error('Failed to load DCR data', error);
      toast.error('Failed to load collection report');
    } finally {
      setIsLoading(false);
    }
  };

  const totalCollected = chartData.reduce((sum, item) => sum + item.Total, 0);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  const handleExport = () => {
    setIsExporting(true);
    try {
      const headers = ['Collection Date', 'Payment Mode', 'Total Amount'];
      const csvRows = [headers.join(',')];
      
      rawData.forEach(row => {
        csvRows.push(`${row.collection_date},${row.payment_mode},${row.total_amount}`);
      });
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Daily_Collection_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
      doc.text('Daily Collection Report', 14, 15);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      if (description) {
        doc.text(description, 14, 22);
      }
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Collections', 14, 32);
      autoTable(doc, {
        startY: 35,
        head: [['Collection Date', 'Payment Mode', 'Total Amount']],
        body: rawData.map(r => [
          new Date(r.collection_date).toLocaleDateString(),
          r.payment_mode,
          `Rs ${r.total_amount}`
        ]),
        foot: [['Total', '', `Rs ${totalCollected}`]],
      });
      
      doc.save(`Daily_Collection_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
          <h2 className="text-lg font-semibold">Daily Collection</h2>
          <p className="text-sm text-muted-foreground">{description || 'Overview of collections grouped by date and payment mode'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} disabled={isExporting || rawData.length === 0} variant="outline" className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            CSV
          </Button>
          <Button onClick={handleExportPDF} disabled={rawData.length === 0} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-primary">Total Collected</p>
            <h3 className="text-3xl font-bold mt-2 text-primary">₹ {totalCollected.toLocaleString()}</h3>
          </CardContent>
        </Card>
        {['CASH', 'BANK'].map(mode => {
          const amount = chartData.reduce((sum, item) => sum + (item[mode as keyof ChartData] as number || 0), 0);
          return (
            <Card key={mode}>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">{mode.replace('_', ' ')}</p>
                <h3 className="text-2xl font-bold mt-2">₹ {amount.toLocaleString()}</h3>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Collection Trend</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="Total" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Payment Modes Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `₹ ${Number(value).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="CASH" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="BANK" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
