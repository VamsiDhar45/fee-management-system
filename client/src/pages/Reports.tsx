import { useState, useEffect } from 'react';
import { api, type Entity } from '../api';
import { Card, CardContent } from '../components/ui/card';
import { DailyCollectionReport } from '../components/reports/DailyCollectionReport';
import { ComponentRevenueReport } from '../components/reports/ComponentRevenueReport';
import { ExpenseSummaryReport } from '../components/reports/ExpenseSummaryReport';
import { TransactionsReport } from '../components/reports/TransactionsReport';
import { StudentBalancesReport } from '../components/reports/StudentBalancesReport';
import toast from 'react-hot-toast';

const Reports = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  
  const [dateRange, setDateRange] = useState('thisMonth');
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('dcr');

  useEffect(() => {
    loadEntities();
    updateDateRange(dateRange);
  }, []);

  const loadEntities = async () => {
    try {
      const data = await api.getEntities();
      setEntities(data);
    } catch (error) {
      console.error('Failed to load entities', error);
      toast.error('Failed to load entities');
    }
  };

  const getLocalDateString = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const updateDateRange = (range: string) => {
    if (range === 'custom') {
      setDateRange('custom');
      return;
    }

    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        start.setDate(today.getDate() - today.getDay());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'allTime':
        start = new Date(1970, 0, 1);
        end = new Date();
        break;
    }

    setDateRange(range);
    setStartDate(start.toISOString());
    setEndDate(end.toISOString());
  };

  const reportDescription = (() => {
    const entityName = selectedEntity === 'all' ? 'All Entities' : entities.find(e => e.id === selectedEntity)?.name || 'Unknown Entity';
    const modeStr = paymentMode === 'all' ? 'All Modes' : paymentMode;
    const sDate = startDate ? new Date(startDate).toLocaleDateString() : 'Start';
    const eDate = endDate ? new Date(endDate).toLocaleDateString() : 'Today';
    return `Data for ${entityName} | ${sDate} - ${eDate} | Mode: ${modeStr}`;
  })();

  return (
    <div className="flex flex-col gap-6 h-full max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Generate and view financial reports</p>
        </div>
        
        <div className="flex gap-4">
          <div className="w-[200px]">
            <select 
              value={selectedEntity} 
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Entities</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-[200px]">
            <select 
              value={dateRange} 
              onChange={(e) => updateDateRange(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
              <option value="allTime">All Time</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>
          
          <div className="w-[150px]">
            <select 
              value={paymentMode} 
              onChange={(e) => setPaymentMode(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex gap-2 items-center bg-background border border-input rounded-md px-3 h-10 shadow-sm">
              <input
                type="date"
                className="bg-transparent text-sm focus:outline-none w-[120px]"
                value={getLocalDateString(startDate)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [y, m, d] = e.target.value.split('-');
                  const date = new Date(Number(y), Number(m)-1, Number(d));
                  date.setHours(0, 0, 0, 0);
                  setStartDate(date.toISOString());
                }}
              />
              <span className="text-muted-foreground text-sm">to</span>
              <input
                type="date"
                className="bg-transparent text-sm focus:outline-none w-[120px]"
                value={getLocalDateString(endDate)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [y, m, d] = e.target.value.split('-');
                  const date = new Date(Number(y), Number(m)-1, Number(d));
                  date.setHours(23, 59, 59, 999);
                  setEndDate(date.toISOString());
                }}
              />
            </div>
          )}
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b flex gap-2 overflow-x-auto bg-muted/10">
              <button 
                onClick={() => setActiveTab('dcr')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'dcr' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                Daily Summary
              </button>
              <button 
                onClick={() => setActiveTab('revenue')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'revenue' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                Component Revenue
              </button>
              <button 
                onClick={() => setActiveTab('expenses')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'expenses' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                Expenses Summary
              </button>
              <button 
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'transactions' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                Receipt Summary
              </button>
              <button 
                onClick={() => setActiveTab('balances')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'balances' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                Student Balances
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
              {activeTab === 'dcr' && (
                <DailyCollectionReport 
                  startDate={startDate} 
                  endDate={endDate} 
                  entityId={selectedEntity === 'all' ? undefined : selectedEntity} 
                  paymentMode={paymentMode === 'all' ? undefined : paymentMode}
                  description={reportDescription}
                />
              )}
              {activeTab === 'revenue' && (
                <ComponentRevenueReport 
                  startDate={startDate} 
                  endDate={endDate} 
                  entityId={selectedEntity === 'all' ? undefined : selectedEntity} 
                  paymentMode={paymentMode === 'all' ? undefined : paymentMode}
                  description={reportDescription}
                />
              )}
              {activeTab === 'expenses' && (
                <ExpenseSummaryReport 
                  startDate={startDate} 
                  endDate={endDate} 
                  entityId={selectedEntity === 'all' ? undefined : selectedEntity} 
                  paymentMode={paymentMode === 'all' ? undefined : paymentMode}
                  description={reportDescription}
                />
              )}
              {activeTab === 'transactions' && (
                <TransactionsReport 
                  startDate={startDate} 
                  endDate={endDate} 
                  entityId={selectedEntity === 'all' ? undefined : selectedEntity} 
                  paymentMode={paymentMode === 'all' ? undefined : paymentMode}
                  description={reportDescription}
                />
              )}
              {activeTab === 'balances' && (
                <StudentBalancesReport description={reportDescription} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
