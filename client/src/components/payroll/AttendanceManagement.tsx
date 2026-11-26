import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Entity } from '../../api';
import type { PayrollEmployee, AttendanceStatus } from '../../types/payroll';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Calendar,
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EmployeeAttendanceRow {
  employee_id: string;
  employee_name: string;
  employee_role: string;
  entity_id: string;
  entity_name: string;
  salary_plan_type: 'monthly' | 'hourly';
  status: AttendanceStatus;
  hours_worked: number;
  overtime_hours: number;
  notes: string;
  isModified?: boolean;
}

export default function AttendanceManagement() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tableData, setTableData] = useState<EmployeeAttendanceRow[]>([]);

  const queryClient = useQueryClient();

  // Load organizations
  const { data: entities = [] } = useQuery<Entity[]>({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  // Load active employees
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<PayrollEmployee[]>({
    queryKey: ['payroll_employees', 'active'],
    queryFn: () => api.getPayrollEmployees({ status: 'active' }),
  });

  // Load existing attendance for selected date
  const { data: savedAttendance = [], isLoading: isLoadingAttendance } = useQuery<any[]>({
    queryKey: ['payroll_attendance', selectedDate],
    queryFn: () => api.getAttendanceByDate(selectedDate),
  });

  // Sync state when employees or saved attendance for this date changes
  useEffect(() => {
    if (!employees.length) {
      setTableData([]);
      return;
    }

    const savedMap = new Map<string, any>();
    savedAttendance.forEach((rec) => {
      savedMap.set(rec.employee_id, rec);
    });

    const rows: EmployeeAttendanceRow[] = employees.map((emp) => {
      const existing = savedMap.get(emp.id);

      if (existing) {
        return {
          employee_id: emp.id,
          employee_name: emp.name,
          employee_role: emp.nature_of_work || '',
          entity_id: emp.entity_id || '',
          entity_name: emp.entity?.name || 'General',
          salary_plan_type: emp.salary_plan_type,
          status: existing.status || 'present',
          hours_worked: Number(existing.hours_worked) || (emp.salary_plan_type === 'hourly' ? 0 : 8),
          overtime_hours: Number(existing.overtime_hours) || 0,
          notes: existing.notes || '',
          isModified: false,
        };
      }

      // Default row for today
      return {
        employee_id: emp.id,
        employee_name: emp.name,
        employee_role: emp.nature_of_work || '',
        entity_id: emp.entity_id || '',
        entity_name: emp.entity?.name || 'General',
        salary_plan_type: emp.salary_plan_type,
        status: 'present',
        hours_worked: emp.salary_plan_type === 'hourly' ? 0 : 8,
        overtime_hours: 0,
        notes: '',
        isModified: true,
      };
    });

    setTableData(rows);
  }, [employees, savedAttendance, selectedDate]);

  // Handle row changes
  const handleCellChange = (index: number, field: keyof EmployeeAttendanceRow, value: any) => {
    setTableData((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value, isModified: true };

      // Auto adjust hours based on status
      if (field === 'status') {
        if (value === 'absent' || value === 'leave') {
          target.hours_worked = 0;
          target.overtime_hours = 0;
        } else if (value === 'half_day') {
          target.hours_worked = 4;
        } else if (value === 'present' && target.salary_plan_type === 'monthly') {
          target.hours_worked = 8;
        }
      }

      updated[index] = target;
      return updated;
    });
  };

  // Mark all visible rows as Present or Absent
  const handleMarkAll = (status: AttendanceStatus) => {
    setTableData((prev) =>
      prev.map((row) => ({
        ...row,
        status,
        hours_worked: status === 'present' ? (row.salary_plan_type === 'hourly' ? row.hours_worked : 8) : 0,
        isModified: true,
      }))
    );
    toast.success(`Marked all employees as ${status.replace('_', ' ')}. Click "Save Attendance" to commit.`);
  };

  // Filtered rows
  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      const matchesSearch =
        row.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employee_role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEntity = selectedEntity === 'all' || row.entity_id === selectedEntity;
      return matchesSearch && matchesEntity;
    });
  }, [tableData, searchTerm, selectedEntity]);

  // Metrics
  const metrics = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let totalHours = 0;

    filteredData.forEach((r) => {
      if (r.status === 'present') presentCount += 1;
      else if (r.status === 'absent') absentCount += 1;
      else if (r.status === 'half_day') halfDayCount += 1;
      else if (r.status === 'leave') leaveCount += 1;

      totalHours += Number(r.hours_worked) || 0;
    });

    return {
      total: filteredData.length,
      presentCount,
      absentCount,
      halfDayCount,
      leaveCount,
      totalHours,
    };
  }, [filteredData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (rowsToSave: EmployeeAttendanceRow[]) => {
      const payload = rowsToSave.map((r) => {
        const item: any = {
          employee_id: r.employee_id,
          attendance_date: selectedDate,
          status: r.status,
          hours_worked: Number(r.hours_worked) || 0,
          overtime_hours: Number(r.overtime_hours) || 0,
          notes: r.notes || null,
        };
        return item;
      });

      return api.saveBatchAttendance(payload);
    },
    onSuccess: () => {
      toast.success(`Attendance for ${selectedDate} saved successfully!`);
      queryClient.invalidateQueries({ queryKey: ['payroll_attendance', selectedDate] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save attendance');
    },
  });

  const isLoading = isLoadingEmployees || isLoadingAttendance;

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CheckSquare className="text-primary" size={22} />
              Daily Attendance & Hours Tracking
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record daily presence, hours worked for hourly staff, leaves, and overtime.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => saveMutation.mutate(tableData)}
              disabled={saveMutation.isPending || isLoading}
              className="gap-2 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              <Save size={15} />
              {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-border">
          {/* Date Picker */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar size={13} className="text-primary" /> Attendance Date
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 text-sm font-medium"
            />
          </div>

          {/* Organization Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Building2 size={13} className="text-primary" /> Organization
            </label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Organizations</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Search size={13} className="text-primary" /> Search Staff
            </label>
            <Input
              placeholder="Search employee name or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Present</p>
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {metrics.presentCount} <span className="text-xs font-normal text-muted-foreground">/ {metrics.total}</span>
            </h4>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Absent</p>
            <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{metrics.absentCount}</h4>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Half Day</p>
            <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{metrics.halfDayCount}</h4>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Leave</p>
            <h4 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{metrics.leaveCount}</h4>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Hours Logged</p>
            <h4 className="text-xl font-bold text-foreground mt-0.5">{metrics.totalHours} hrs</h4>
          </CardContent>
        </Card>
      </div>

      {/* Batch Actions */}
      <div className="flex items-center justify-between text-xs bg-muted/30 p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Quick Actions:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAll('present')}
            className="h-7 text-xs px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
          >
            <CheckCircle2 size={13} className="mr-1" /> Mark All Present
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAll('absent')}
            className="h-7 text-xs px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
          >
            <XCircle size={13} className="mr-1" /> Mark All Absent
          </Button>
        </div>

        <div className="text-muted-foreground flex items-center gap-1.5">
          <Clock size={13} className="text-primary" />
          <span>Hourly employees calculate wages based on hours logged here.</span>
        </div>
      </div>

      {/* Daily Attendance Grid */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-muted-foreground">Loading attendance for {selectedDate}...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">No active employees found.</div>
        ) : (
          <div className="overflow-x-auto modern-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-2">Organization</th>
                  <th className="py-3 px-2">Plan</th>
                  <th className="py-3 px-3">Attendance Status</th>
                  <th className="py-3 px-2 text-center">Hours Worked</th>
                  <th className="py-3 px-2 text-center">Overtime (Hrs)</th>
                  <th className="py-3 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((row, idx) => {
                  return (
                    <tr key={row.employee_id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Role */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{row.employee_name}</div>
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {row.employee_role || 'Staff'}
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="py-3 px-2 whitespace-nowrap text-muted-foreground font-medium">
                        {row.entity_name}
                      </td>

                      {/* Plan Type */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
                            row.salary_plan_type === 'hourly'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {row.salary_plan_type}
                        </span>
                      </td>

                      {/* Status Selector Buttons */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCellChange(idx, 'status', 'present')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                              row.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCellChange(idx, 'status', 'half_day')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                              row.status === 'half_day'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Half Day
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCellChange(idx, 'status', 'leave')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                              row.status === 'leave'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Leave
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCellChange(idx, 'status', 'absent')}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                              row.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>

                      {/* Hours Worked */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={row.hours_worked || ''}
                          placeholder="0"
                          onChange={(e) => handleCellChange(idx, 'hours_worked', parseFloat(e.target.value) || 0)}
                          className={`w-14 h-7 text-center rounded border font-mono text-xs focus:ring-1 focus:ring-primary ${
                            row.salary_plan_type === 'hourly'
                              ? 'border-blue-400 font-semibold bg-blue-500/5'
                              : 'border-input bg-background'
                          }`}
                        />
                      </td>

                      {/* Overtime Hours */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={row.overtime_hours || ''}
                          placeholder="0"
                          onChange={(e) => handleCellChange(idx, 'overtime_hours', parseFloat(e.target.value) || 0)}
                          className="w-14 h-7 text-center rounded border border-input bg-background font-mono text-xs focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Remarks..."
                          value={row.notes || ''}
                          onChange={(e) => handleCellChange(idx, 'notes', e.target.value)}
                          className="w-full max-w-xs h-7 px-2 rounded border border-input bg-background text-xs focus:ring-1 focus:ring-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
