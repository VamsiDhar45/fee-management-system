import React, { useState, useEffect } from 'react';
import { Plus, Check, X, CreditCard, Clock, Image as ImageIcon, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { api } from '../api';
import { Modal } from '../components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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

export default function Expenses({ userRole }: { userRole: 'admin' | 'manager' | 'accountant' }) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  const [entityFilter, setEntityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const limit = 10;
  
  const queryClient = useQueryClient();

  const [categories, setCategories] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  


  // Form State
  const [formData, setFormData] = useState({
    entity_id: '',
    batch_id: '',
    category_id: '',
    amount: '',
    description: '',
    payment_mode: 'CASH',
    expense_date: new Date().toISOString().split('T')[0]
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Fetch dropdown data once
    Promise.all([
      api.getExpenseCategories(),
      api.getEntities(),
      api.getBatches()
    ]).then(([catData, entData, batchData]) => {
      setCategories(catData || []);
      setEntities(entData || []);
      setBatches(batchData || []);
    }).catch(console.error);
  }, []);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['expenses', page, limit, searchTerm, entityFilter, categoryFilter, statusFilter, startDate, endDate],
    queryFn: () => api.getExpenses(page, limit, searchTerm, entityFilter, categoryFilter, statusFilter, startDate, endDate),
  });

  const { data: statsData } = useQuery({
    queryKey: ['expenseStats', entityFilter, categoryFilter, statusFilter, startDate, endDate, searchTerm],
    queryFn: () => api.getExpenseStats(entityFilter, categoryFilter, statusFilter, startDate, endDate, searchTerm),
  });

  const expenses = data?.data || [];
  const totalPages = data?.totalPages || 0;
  const count = data?.count || 0;

  const stats = {
    totalMonthly: statsData?.totalAmount || 0,
    pendingCount: statsData?.pendingCount || 0
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const submitMutation = useMutation({
    mutationFn: (data: any) => api.submitExpense(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      
      const cat = categories.find(c => c.id === variables.category_id);
      const catName = cat ? cat.name : 'Unknown';
      
      // Format date from YYYY-MM-DD to DD/MM/YYYY
      const dateParts = variables.expense_date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : variables.expense_date;

      api.notifyExpenseManager(Number(variables.amount), catName, formattedDate).catch(err => {
        console.error('Failed to send SMS notification', err);
      });

      setIsModalOpen(false);
      setFormData({
        entity_id: '', batch_id: '', category_id: '', amount: '', description: '', payment_mode: 'CASH', expense_date: new Date().toISOString().split('T')[0]
      });
      setReceiptFile(null);
    },
    onError: (error: any) => {
      console.error('Error submitting expense:', error);
      const msg = error?.message || 'Unknown error';
      alert(`Failed to submit expense: ${msg}`);
    },
    onSettled: () => setSubmitting(false)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    let receipt_image_url = null;
    if (receiptFile) {
      try {
        receipt_image_url = await api.uploadReceiptImage(receiptFile);
      } catch (uploadErr: any) {
        console.warn('Receipt upload failed, submitting without receipt:', uploadErr?.message);
      }
    }

    submitMutation.mutate({
      ...formData,
      batch_id: formData.batch_id || null,
      amount: Number(formData.amount),
      receipt_image_url
    });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => api.updateExpenseStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (error) => {
      console.error('Error updating status:', error);
    }
  });

  const handleUpdateStatus = (id: string, status: string) => {
    statusMutation.mutate({ id, status });
  };

  if (loading && expenses.length === 0) return <div className="p-12 text-center text-muted-foreground">Loading expenses...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-muted-foreground mt-1">Record and approve organizational expenses</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} /> Record Expense
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Pending Approvals</h3>
              <div className="p-2 bg-amber-500/10 rounded-full">
                <Clock size={20} className="text-amber-500" />
              </div>
            </div>
            <div className="text-3xl font-bold">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on active filters</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
              <div className="p-2 bg-primary/10 rounded-full">
                <CreditCard size={20} className="text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold">₹{Number(stats.totalMonthly).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on active filters</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input 
                  type="text" 
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search expenses by description..." 
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Entities</option>
                {entities.map(ent => (
                  <option key={ent.id} value={ent.id}>{ent.name}</option>
                ))}
              </select>

              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full text-sm"
                  title="Start Date"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full text-sm"
                  title="End Date"
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Entity & Branch</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Receipt</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <motion.tbody 
                className="divide-y divide-border"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
                        <p className="text-muted-foreground">{searchTerm ? 'No expenses found matching your search.' : 'No expenses recorded yet.'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp: any) => (
                    <motion.tr variants={itemVariants} key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{new Date(exp.expense_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{exp.entities?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground mt-1">{exp.batches?.name || 'All Branches'}</div>
                      </td>
                      <td className="px-6 py-4">{exp.expense_categories?.name || 'N/A'}</td>
                      <td className="px-6 py-4 max-w-[200px] truncate" title={exp.description}>{exp.description}</td>
                      <td className="px-6 py-4 font-bold">₹{Number(exp.amount).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {exp.receipt_image_url ? (
                          <a href={exp.receipt_image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline font-medium">
                            <ImageIcon size={14} /> View
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          exp.status === 'APPROVED' ? 'bg-green-500/10 text-green-600 dark:text-green-500' : 
                          exp.status === 'PAID' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-500' : 
                          exp.status === 'REJECTED' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {(userRole === 'admin' || userRole === 'manager') && exp.status === 'PENDING' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleUpdateStatus(exp.id, 'APPROVED')}
                                disabled={statusMutation.isPending}
                                className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-500 dark:hover:bg-green-500/20"
                                title="Approve"
                              >
                                <Check size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleUpdateStatus(exp.id, 'REJECTED')}
                                disabled={statusMutation.isPending}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Reject"
                              >
                                <X size={16} />
                              </Button>
                            </>
                          )}
                          {(userRole === 'admin' || userRole === 'manager') && exp.status === 'APPROVED' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUpdateStatus(exp.id, 'PAID')}
                              disabled={statusMutation.isPending}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-900/30"
                            >
                              Mark Paid
                            </Button>
                          )}
                          {(userRole !== 'admin' && userRole !== 'manager') && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </motion.tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-muted/20">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, count)} of {count} expenses
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
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => !submitting && setIsModalOpen(false)} title="Record New Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Entity</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.entity_id}
                onChange={e => setFormData({...formData, entity_id: e.target.value})}
              >
                <option value="">Select Entity</option>
                {entities.map(ent => (
                  <option key={ent.id} value={ent.id}>{ent.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Batch / Course (Optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.batch_id}
                onChange={e => setFormData({...formData, batch_id: e.target.value})}
              >
                <option value="">None</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.category_id}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                required
                value={formData.expense_date}
                onChange={e => setFormData({...formData, expense_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.payment_mode}
                onChange={e => setFormData({...formData, payment_mode: e.target.value})}
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              required
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Provide details about this expense..."
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt Image (Optional)</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="cursor-pointer file:text-foreground"
            />
            <p className="text-xs text-muted-foreground">Upload a photo or PDF of the bill/receipt (Max 5MB).</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
