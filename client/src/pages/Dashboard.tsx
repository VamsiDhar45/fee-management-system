import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Clock, ArrowRight, Calendar, IndianRupee, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6'];

const statusStyle = (status: string) => {
  switch (status) {
    case 'APPROVED': return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
    case 'PAID':     return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
    case 'REJECTED': return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
    default:         return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
  }
};

type DateRangeOption = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const Dashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalCollectionsToday: 0,
    pendingFees: 0,
    totalOverdue: 0,
    categoryData: [] as any[],
    monthlyData: [] as any[],
    entityBreakdown: [] as any[],
    batches: [] as any[],
    totalExpensesThisMonth: 0,
    pendingExpensesCount: 0,
    netProfit: 0,
    expenseCategoryData: [] as any[],
    collectionStatusData: [] as any[],
  });
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [rpcError, setRpcError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingStats(true);
    setRpcError(null);
    
    let end = new Date();
    let start = new Date('1970-01-01');
    
    if (dateRange === 'today') {
      start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    } else if (dateRange === 'this_week') {
      start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - end.getDay());
    } else if (dateRange === 'this_month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (dateRange === 'this_year') {
      start = new Date(end.getFullYear(), 0, 1);
    } else if (dateRange === 'custom') {
      if (customStart) start = new Date(customStart);
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      }
    }

    api.getDashboardStats(start, end)
      .then(({ recentExpenses: _unused, ...rest }) => {
        setStats(rest as any);
        setRpcError(null);
      })
      .catch((err) => {
        console.error(err);
        setRpcError(err.message || 'Failed to load stats.');
      })
      .finally(() => setLoadingStats(false));

    api.getRecentExpenses()
      .then(setRecentExpenses)
      .catch(console.error)
      .finally(() => setLoadingExpenses(false));
  }, [dateRange, customStart, customEnd]);

  const exportToCSV = () => {
    if (stats.entityBreakdown.length === 0) return;
    
    const headers = ['Branch', 'Expected Revenue', 'Collected', 'Expenses', 'Pending', 'Overdue'];
    const rows: any[] = [];
    
    stats.entityBreakdown.forEach(entity => {
      rows.push([
        `"${entity.name}"`,
        entity.expected,
        entity.collected,
        entity.expenses || 0,
        entity.pending,
        entity.overdue
      ].join(','));
    });

    if (stats.batches && stats.batches.length > 0) {
      rows.push(['"--- Batches / Courses ---"', '', '', '', '', ''].join(','));
      stats.batches.forEach((batch: any) => {
        rows.push([
          `"${batch.name}"`,
          batch.expected,
          batch.collected,
          batch.expenses || 0,
          batch.pending,
          batch.overdue
        ].join(','));
      });
    }
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `branch_performance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="capitalize">{entry.name}:</span> 
              <span className="font-medium">₹{Number(entry.value).toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {rpcError && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <strong>Configuration Error:</strong> {rpcError}. Please run the <code>20260704000000_dashboard_rpc.sql</code> migration in your Supabase SQL editor.
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Gurukul Fee Management</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg border border-border">
            <Calendar size={16} className="text-muted-foreground" />
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              className="bg-transparent border-none text-foreground outline-none cursor-pointer text-sm font-medium"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-secondary px-3 py-2 rounded-lg border border-border text-foreground outline-none text-sm font-medium"
              />
              <span className="text-muted-foreground">to</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-secondary px-3 py-2 rounded-lg border border-border text-foreground outline-none text-sm font-medium"
              />
            </div>
          )}
          <Button variant="secondary" onClick={exportToCSV} disabled={stats.entityBreakdown.length === 0}>
            Export Performance
          </Button>
          <Link to="/fees">
            <Button>Collect Fee</Button>
          </Link>
        </div>
      </div>

      {loadingStats ? (
        <div className="py-12 text-center text-muted-foreground">Loading metrics...</div>
      ) : (
        <>
          {/* Income Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Collections (Today)</CardTitle>
                  <IndianRupee className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{stats.totalCollectionsToday.toLocaleString()}</div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Overdue</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">₹{stats.totalOverdue.toLocaleString()}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Fees</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">₹{stats.pendingFees.toLocaleString()}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Students</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeStudents.toLocaleString()}</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Expense Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div variants={itemVariants}>
              <Card className="border-l-4 border-l-destructive">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Expenses (Month)</CardTitle>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">₹{stats.totalExpensesThisMonth.toLocaleString()}</div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Approvals Pending</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{stats.pendingExpensesCount}</div>
                  <Link to="/expenses" className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline">
                    Review <ArrowRight size={12} />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className={`border-l-4 ${stats.netProfit >= 0 ? 'border-l-green-500' : 'border-l-destructive'}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Net Profit (Month)</CardTitle>
                  <TrendingUp className={`h-4 w-4 ${stats.netProfit >= 0 ? 'text-green-500' : 'text-destructive'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {stats.netProfit < 0 ? '-' : ''}₹{Math.abs(stats.netProfit).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Collections − Expenses</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="xl:col-span-2">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Recent Expenses</CardTitle>
                  <Link to="/expenses" className="text-sm text-primary flex items-center gap-1 font-medium hover:underline">
                    View All <ArrowRight size={14} />
                  </Link>
                </CardHeader>
                <CardContent>
                  {loadingExpenses ? (
                    <p className="text-muted-foreground text-sm text-center py-4">Loading...</p>
                  ) : recentExpenses.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No expenses recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Entity</th>
                            <th className="px-4 py-3 font-medium">Category</th>
                            <th className="px-4 py-3 font-medium">Description</th>
                            <th className="px-4 py-3 font-medium">Amount</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {recentExpenses.slice(0, 5).map(exp => (
                            <tr key={exp.id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">{new Date(exp.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 font-medium">{exp.entity}</td>
                              <td className="px-4 py-3">{exp.category}</td>
                              <td className="px-4 py-3 max-w-[150px] truncate">{exp.description}</td>
                              <td className="px-4 py-3 font-semibold text-destructive">₹{exp.amount.toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle(exp.status)}`}>
                                  {exp.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branch Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {stats.entityBreakdown.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">No branch data available.</p>
                    ) : (
                      stats.entityBreakdown.map((entity, idx) => {
                        const isProfitable = entity.collected >= (entity.expenses || 0);
                        return (
                          <div key={idx} className="border border-border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  {entity.name}
                                  {isProfitable ? (
                                    <span className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                      <TrendingUp size={10} /> Profit
                                    </span>
                                  ) : (
                                    <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                      <TrendingDown size={10} /> Loss
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">Expected: ₹{entity.expected.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-500">₹{entity.collected.toLocaleString()}</p>
                                <p className="text-xs text-red-500 font-medium">Exp: ₹{(entity.expenses || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Batch Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {!stats.batches || stats.batches.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">No batch data available.</p>
                    ) : (
                      stats.batches.map((batch, idx) => {
                        const isProfitable = batch.collected >= (batch.expenses || 0);
                        return (
                          <div key={idx} className="border border-border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                  {batch.name}
                                  {isProfitable ? (
                                    <span className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                      <TrendingUp size={10} /> Profit
                                    </span>
                                  ) : (
                                    <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                      <TrendingDown size={10} /> Loss
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">Expected: ₹{batch.expected.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-500">₹{batch.collected.toLocaleString()}</p>
                                <p className="text-xs text-red-500 font-medium">Exp: ₹{(batch.expenses || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.monthlyData}>
                        <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.2 }} />
                        <Legend verticalAlign="bottom" height={36} />
                        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Collection Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.collectionStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                          <Cell fill="#22c55e" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.categoryData} cx="50%" cy="50%" innerRadius={0} outerRadius={100} paddingAngle={2} dataKey="value">
                          {stats.categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.expenseCategoryData} cx="50%" cy="50%" innerRadius={0} outerRadius={100} paddingAngle={2} dataKey="value">
                          {stats.expenseCategoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
};
