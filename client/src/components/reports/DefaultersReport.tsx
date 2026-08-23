import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const DefaultersReport = ({ entityId }: { entityId?: string }) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [entityId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getDefaulters(entityId);
      setData(result || []);
    } catch (error) {
      console.error('Failed to load defaulters', error);
      toast.error('Failed to load defaulters list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Fetching all defaulter records...');
    try {
      const allData = await api.exportAllDefaulters(entityId);
      
      // Convert to CSV
      const headers = ['Student Name', 'Contact Number', 'Batch', 'Due Date', 'Total Amount Due', 'Amount Owed'];
      const csvRows = [headers.join(',')];
      
      allData.forEach(row => {
        const student = row.fee_structures?.students;
        const csvRow = [
          `"${student?.name || ''}"`,
          `"${student?.contact_number || ''}"`,
          `"${student?.batches?.name || ''}"`,
          row.due_date,
          row.amount_due,
          row.amountOwed
        ];
        csvRows.push(csvRow.join(','));
      });
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Defaulters_Report_${new Date().toISOString().split('T')[0]}.csv`);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Export failed', error);
      toast.error('Failed to export data', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Defaulters List</h2>
          <p className="text-sm text-muted-foreground">Students with pending overdue installments</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting} className="gap-2">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isExporting ? 'Exporting...' : 'Export to CSV'}
        </Button>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {data.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No defaulters found for the selected criteria.</div>
          ) : (
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b bg-muted/50 sticky top-0">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Student Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Batch</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Due Date</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount Owed</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {data.map((row, index) => {
                    const student = row.fee_structures?.students;
                    return (
                      <tr key={row.id || index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <td className="p-4 align-middle font-medium">{student?.name}</td>
                        <td className="p-4 align-middle">{student?.contact_number || 'N/A'}</td>
                        <td className="p-4 align-middle">{student?.batches?.name}</td>
                        <td className="p-4 align-middle">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                            {new Date(row.due_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-right font-bold text-destructive">
                          ₹ {Number(row.amountOwed).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
