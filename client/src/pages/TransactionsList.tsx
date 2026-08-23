import React, { useState } from 'react';
import { api } from '../api';
import { FileText, Eye, Search, ChevronLeft, ChevronRight, Building, Calendar, CreditCard } from 'lucide-react';
import { Receipt } from '../components/Receipt';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
};

export const TransactionsList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [entityId, setEntityId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const limit = 10;
  
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: api.getEntities
  });

  const { data: stats } = useQuery({
    queryKey: ['transactionStats', entityId, startDate, endDate, paymentMode, searchTerm],
    queryFn: () => api.getTransactionStats(entityId, startDate, endDate, paymentMode, searchTerm)
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions', page, limit, searchTerm, entityId, startDate, endDate, paymentMode],
    queryFn: () => api.getTransactions(page, limit, searchTerm, entityId, startDate, endDate, paymentMode),
  });

  const transactions = data?.data || [];
  const totalPages = data?.totalPages || 0;
  const count = data?.count || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  if (selectedReceipt) {
    return (
      <Receipt 
        receipt={selectedReceipt} 
        onClose={() => setSelectedReceipt(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start gap-4">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground mt-1">View all recorded fee payments and download receipts.</p>
        </header>

        {/* Smart Stats Summary */}
        {stats && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 overflow-x-auto pb-2 max-w-full xl:max-w-[70%]"
          >
            <Card className="bg-primary/5 border-primary/20 shrink-0">
              <CardContent className="p-3 flex flex-col justify-center min-w-[140px]">
                <p className="text-xs text-primary/80 font-medium mb-1 uppercase tracking-wider">Total Collected</p>
                <h3 className="text-2xl font-bold text-primary">₹{Number(stats.totalAmount || 0).toLocaleString()}</h3>
              </CardContent>
            </Card>
            
            {stats.entityBreakdown?.map((eb: any, idx: number) => (
              <Card key={idx} className="shrink-0">
                <CardContent className="p-3 flex flex-col justify-center min-w-[140px]">
                  <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">{eb.entityName}</p>
                  <h3 className="text-xl font-semibold">₹{Number(eb.amount || 0).toLocaleString()}</h3>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <form onSubmit={handleSearch} className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  type="text" 
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search transactions by student name..." 
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            
            {/* Filters Row */}
            <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Building size={16} className="text-muted-foreground" />
                <select 
                  className="flex h-9 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={entityId}
                  onChange={(e) => { setEntityId(e.target.value); setPage(1); }}
                >
                  <option value="">All Entities</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-auto h-9" 
                  title="Start Date"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-auto h-9" 
                  title="End Date"
                />
              </div>

              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-muted-foreground" />
                <select 
                  className="flex h-9 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={paymentMode}
                  onChange={(e) => { setPaymentMode(e.target.value); setPage(1); }}
                >
                  <option value="">All Modes</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading transactions...</div>
          ) : isError ? (
            <div className="p-12 text-center text-destructive">Error loading transactions.</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <FileText className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">{searchTerm ? 'No transactions found matching your search.' : 'No transactions have been recorded yet.'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium">Receipt #</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Student</th>
                      <th className="px-6 py-4 font-medium">Mode</th>
                      <th className="px-6 py-4 font-medium">Amount</th>
                      <th className="px-6 py-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    className="divide-y divide-border"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                  >
                    {transactions.map((tx: any) => (
                      <motion.tr variants={itemVariants} key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium">{tx.receipt_number}</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground">{tx.students?.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{tx.students?.entities?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground border border-border rounded-md font-medium">
                            {tx.payment_mode}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-primary">
                          ₹{Number(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => setSelectedReceipt(tx)}
                          >
                            <Eye size={14} /> View
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-muted/20">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, count)} of {count} transactions
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
