import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, User, Calendar, Phone, Building, FileText, AlertCircle, Download } from 'lucide-react';
import { Receipt } from '../components/Receipt';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export const StudentProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await api.getStudentFeeDetails(id);
        setStudent(data);
      } catch (err: any) {
        console.error('Failed to fetch student details:', err);
        setError(err.message || 'Failed to load student profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentDetails();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading student profile...</div>;
  }

  if (error || !student) {
    return (
      <div className="py-12 text-center text-destructive flex flex-col items-center">
        <AlertCircle size={48} className="opacity-50 mb-4" />
        <p className="text-lg">{error || 'Student not found.'}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/students">Back to Directory</Link>
        </Button>
      </div>
    );
  }

  const feeStructure = student.fee_structures?.[0];
  const installments = feeStructure?.fee_installments || [];
  const transactions = student.incomes || [];
  const feeComponents = feeStructure?.fee_components || [];

  if (selectedReceipt) {
    return (
      <Receipt 
        receipt={selectedReceipt} 
        studentDetails={student} 
        onClose={() => setSelectedReceipt(null)} 
        showSuccessIcon={false} 
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <header className="space-y-4">
        <Button variant="ghost" asChild className="no-print -ml-4 text-muted-foreground">
          <Link to="/students" className="gap-2">
            <ArrowLeft size={16} /> Back to Students
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <User size={28} />
              </div>
              {student.name}
            </h1>
            <p className="text-muted-foreground mt-1 ml-14">Student ID: <span className="font-mono text-xs">{student.id}</span></p>
          </div>
          <Button onClick={() => window.print()} className="no-print gap-2 shadow-sm">
            <FileText size={16} /> Print Statement
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Details */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="p-1.5 bg-muted rounded-md"><Phone size={16} className="text-foreground" /></div>
              <span className="text-foreground font-medium">{student.contact_number || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="p-1.5 bg-muted rounded-md"><Calendar size={16} className="text-foreground" /></div>
              <span className="text-foreground font-medium">Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="p-1.5 bg-muted rounded-md"><Building size={16} className="text-foreground" /></div>
              <span className="text-foreground font-medium">
                {student.entities?.name} <span className="opacity-50 mx-1">•</span> {student.batches?.name}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Fee Summary */}
        <Card className="md:col-span-2 shadow-sm bg-gradient-to-br from-card to-muted/20">
          <CardHeader>
            <CardTitle>Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Fee</div>
              <div className="text-3xl font-bold text-foreground">
                ₹{feeStructure?.total_amount?.toLocaleString() || '0'}
              </div>
              
              {feeComponents.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Components:</div>
                  <div className="space-y-1.5">
                    {feeComponents.map((comp: any) => (
                      <div key={comp.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{comp.category_name}</span>
                        <span className="font-medium">₹{comp.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="sm:border-l border-t sm:border-t-0 border-border sm:pl-6 pt-6 sm:pt-0 space-y-6">
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Total Paid</div>
                <div className="text-3xl font-bold text-green-500 flex items-center gap-2">
                  ₹{transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0).toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Remaining Balance</div>
                <div className="text-2xl font-bold text-destructive">
                  ₹{Math.max(0, (feeStructure?.total_amount || 0) - transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0)).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Installments Table */}
        <Card className="shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 pb-4">
            <CardTitle>Installments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {installments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No installments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Due Date</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Paid</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Balance</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {installments.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map((inst: any) => {
                      const amountPaid = transactions
                        .filter((t: any) => t.installment_id === inst.id)
                        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
                      const balance = Math.max(0, Number(inst.amount_due) - amountPaid);
                      const isOverdue = inst.status !== 'PAID' && new Date(inst.due_date) < new Date();
                      
                      let displayStatus = inst.status;
                      let statusBadgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-500';

                      if (inst.status === 'PAID') {
                        displayStatus = 'PAID';
                        statusBadgeClass = 'bg-green-500/10 text-green-600 dark:text-green-500';
                      } else if (inst.status === 'PARTIAL') {
                        displayStatus = isOverdue ? 'PARTIAL (OVERDUE)' : 'PARTIAL';
                        statusBadgeClass = isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500';
                      } else if (isOverdue) {
                        displayStatus = 'OVERDUE';
                        statusBadgeClass = 'bg-destructive/10 text-destructive';
                      }
                      
                      return (
                        <tr key={inst.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground">{new Date(inst.due_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">₹{inst.amount_due?.toLocaleString()}</td>
                          <td className={`px-4 py-3 font-medium ${amountPaid > 0 ? 'text-green-500' : ''}`}>
                            ₹{amountPaid.toLocaleString()}
                          </td>
                          <td className={`px-4 py-3 font-bold ${balance > 0 ? 'text-destructive' : ''}`}>
                            ₹{balance.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${statusBadgeClass}`}>
                              {displayStatus}
                            </span>
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

        {/* Transactions Table */}
        <Card className="shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 pb-4">
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Date</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Amount</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Mode</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Receipt</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((t: any) => (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-bold text-green-500">+₹{t.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-md font-medium">
                            {t.payment_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {t.receipt_number || '-'}
                        </td>
                        <td className="px-4 py-3 no-print">
                          <Button 
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedReceipt(t)}
                            title="Download Receipt"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Download size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
