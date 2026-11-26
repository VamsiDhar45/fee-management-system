import { useState } from 'react';
import { Plus, Search, Edit2, Phone, MapPin, Building2, Calendar, IndianRupee, CreditCard, User, Briefcase, Filter } from 'lucide-react';
import { api, type Entity } from '../../api';
import type { PayrollEmployee, CreatePayrollEmployeeInput } from '../../types/payroll';
import { EmployeeModal } from './EmployeeModal';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function EmployeesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<PayrollEmployee | null>(null);

  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery<Entity[]>({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const { data: employees = [], isLoading } = useQuery<PayrollEmployee[]>({
    queryKey: ['payroll_employees'],
    queryFn: () => api.getPayrollEmployees(),
  });

  const createMutation = useMutation({
    mutationFn: (newEmployee: CreatePayrollEmployeeInput) => api.createPayrollEmployee(newEmployee),
    onSuccess: () => {
      toast.success('Employee onboarded successfully');
      queryClient.invalidateQueries({ queryKey: ['payroll_employees'] });
      setIsModalOpen(false);
      setEditingEmployee(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to onboard employee');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePayrollEmployeeInput> }) =>
      api.updatePayrollEmployee(id, data),
    onSuccess: () => {
      toast.success('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['payroll_employees'] });
      setIsModalOpen(false);
      setEditingEmployee(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update employee');
    },
  });

  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: PayrollEmployee) => {
    setEditingEmployee(emp);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (data: CreatePayrollEmployeeInput) => {
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.phone && emp.phone.includes(searchTerm)) ||
      (emp.nature_of_work && emp.nature_of_work.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesEntity = entityFilter === 'all' || emp.entity_id === entityFilter;

    return matchesSearch && matchesStatus && matchesEntity;
  });

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'active').length;
  const monthlySalaryTotal = employees
    .filter((e) => e.status === 'active' && e.salary_plan_type === 'monthly')
    .reduce((sum, e) => sum + (Number(e.base_salary) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <User size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Onboarded</p>
              <h3 className="text-2xl font-bold text-foreground">{totalEmployees}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Staff</p>
              <h3 className="text-2xl font-bold text-foreground">{activeEmployees}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Monthly Base Commitment</p>
              <h3 className="text-2xl font-bold text-foreground">₹{monthlySalaryTotal.toLocaleString('en-IN')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search by name, phone or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Organizations</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleOpenCreateModal} className="gap-2 shrink-0">
          <Plus size={18} />
          Onboard Employee
        </Button>
      </div>

      {/* Employee List Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No employees found. Click "Onboard Employee" to add the first team member.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role / Nature of Work</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Compensation</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{emp.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="capitalize">{emp.gender}</span>
                        {emp.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {emp.phone}
                            </span>
                          </>
                        )}
                      </div>
                      {emp.address && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          <MapPin size={11} className="shrink-0" /> {emp.address}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {emp.nature_of_work ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          <Briefcase size={12} />
                          {emp.nature_of_work}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Unspecified</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {emp.entity?.name ? (
                        <div className="flex items-center gap-1.5 text-foreground text-xs font-medium">
                          <Building2 size={13} className="text-primary" />
                          {emp.entity.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">General</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} />
                        {new Date(emp.date_of_joining).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        ₹{Number(emp.base_salary).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {emp.salary_plan_type === 'monthly' ? 'per month' : 'per hour'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          emp.payment_mode === 'bank'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {emp.payment_mode === 'bank' ? <CreditCard size={12} /> : <IndianRupee size={12} />}
                        {emp.payment_mode}
                      </span>
                      {emp.payment_mode === 'bank' && emp.bank_account_number && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          A/C: ...{emp.bank_account_number.slice(-4)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          emp.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditModal(emp)}
                        className="h-8 w-8 p-0"
                        title="Edit employee"
                      >
                        <Edit2 size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard / Edit Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        initialData={editingEmployee}
      />
    </div>
  );
}
