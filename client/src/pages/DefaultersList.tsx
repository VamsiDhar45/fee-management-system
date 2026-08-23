import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AlertCircle, Phone, ArrowRight, CheckCircle2, IndianRupee, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
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

export const DefaultersList: React.FC = () => {
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDefaulters()
      .then(setDefaulters)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const exportToCSV = () => {
    if (defaulters.length === 0) return;
    
    const headers = ['Student Name', 'Student ID', 'Contact Number', 'Entity', 'Batch', 'Installment Amount', 'Paid', 'Amount Owed', 'Overdue Date', 'Days Overdue'];
    const csvContent = [
      headers.join(','),
      ...defaulters.map(inst => {
        const student = inst.fee_structures?.students;
        const paid = Number(inst.amount_due) - inst.amountOwed;
        const daysOverdue = Math.floor((new Date().getTime() - new Date(inst.due_date).getTime()) / (1000 * 3600 * 24));
        return [
          `"${student?.name || ''}"`,
          `"${student?.id || ''}"`,
          `"${student?.contact_number || ''}"`,
          `"${student?.entities?.name || ''}"`,
          `"${student?.batches?.name || ''}"`,
          inst.amount_due,
          paid,
          inst.amountOwed,
          `"${new Date(inst.due_date).toLocaleDateString()}"`,
          daysOverdue
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `defaulters_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate summaries
  const totalOwed = defaulters.reduce((sum, inst) => sum + inst.amountOwed, 0);
  const uniqueStudents = new Set(defaulters.map(inst => inst.fee_structures?.students?.id)).size;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertCircle className="text-destructive h-8 w-8" />
            Defaulters & Overdue Fees
          </h1>
          <p className="text-muted-foreground mt-1">Students who have missed their installment due dates.</p>
        </div>
        <Button variant="secondary" onClick={exportToCSV} disabled={defaulters.length === 0}>
          Export CSV
        </Button>
      </header>

      {/* Summary Cards */}
      {!loading && defaulters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-destructive mb-1">Total Amount Overdue</p>
                  <h3 className="text-3xl font-bold text-destructive">₹{totalOwed.toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-destructive/20 rounded-full text-destructive">
                  <IndianRupee size={20} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Defaulter Students</p>
                  <h3 className="text-3xl font-bold">{uniqueStudents}</h3>
                </div>
                <div className="p-2 bg-primary/10 rounded-full text-primary">
                  <Users size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Overdue Installments</p>
                  <h3 className="text-3xl font-bold">{defaulters.length}</h3>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-full text-amber-500">
                  <Clock size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading overdue records...</div>
          ) : defaulters.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 opacity-80" />
              <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
              <p className="text-muted-foreground">No students currently have overdue fees.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Student Info</th>
                    <th className="px-6 py-4 font-medium">Contact</th>
                    <th className="px-6 py-4 font-medium">Installment Detail</th>
                    <th className="px-6 py-4 font-medium">Amount Owed</th>
                    <th className="px-6 py-4 font-medium">Overdue Since</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <motion.tbody 
                  className="divide-y divide-border"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {defaulters.map(inst => {
                    const student = inst.fee_structures?.students;
                    const paid = Number(inst.amount_due) - inst.amountOwed;
                    const daysOverdue = Math.floor((new Date().getTime() - new Date(inst.due_date).getTime()) / (1000 * 3600 * 24));
                    
                    return (
                      <motion.tr variants={itemVariants} key={inst.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/students/${student?.id}`} className="font-semibold text-primary hover:underline block">
                            {student?.name}
                          </Link>
                          <div className="text-xs text-muted-foreground mt-1">{student?.batches?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <a href={`tel:${student?.contact_number}`} className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors">
                            <Phone size={14} className="text-muted-foreground" /> {student?.contact_number}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium">₹{Number(inst.amount_due).toLocaleString()}</div>
                          {paid > 0 && <div className="text-xs text-green-600 dark:text-green-500 mt-1">Paid: ₹{paid.toLocaleString()}</div>}
                        </td>
                        <td className="px-6 py-4 font-bold text-destructive text-base">
                          ₹{inst.amountOwed.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-amber-600 dark:text-amber-500 font-medium">
                            {new Date(inst.due_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs font-semibold bg-destructive/10 text-destructive inline-block px-2 py-0.5 rounded-full mt-1">
                            {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} late
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link to={`/students/${student?.id}`}>
                            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto justify-center">
                              Collect <ArrowRight size={14} />
                            </Button>
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
