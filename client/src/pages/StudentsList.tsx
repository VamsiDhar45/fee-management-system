import React, { useState } from 'react';
import { api } from '../api';
import { Users, Plus, Search, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const StudentsList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [batchId, setBatchId] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 10;
  
  const queryClient = useQueryClient();

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: api.getBatches,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['students', page, limit, searchTerm, batchId, sortBy, sortOrder],
    queryFn: () => api.getStudents(page, limit, searchTerm, batchId, sortBy, sortOrder),
  });

  const students = data?.data || [];
  const totalPages = data?.totalPages || 0;
  const count = data?.count || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1); // Reset to page 1 on new search
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => {
      console.error('Failed to delete student:', error);
      alert('Failed to delete student.');
    }
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This will clear all their fee records as well.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students Directory</h1>
          <p className="text-muted-foreground mt-1">Manage all enrolled students across Gurukul branches.</p>
        </div>
        <Link to="/students/onboard">
          <Button className="gap-2">
            <Plus size={16} /> Onboard Student
          </Button>
        </Link>
      </header>

      <Card>
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                type="text" 
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search students by name..." 
                className="pl-10"
              />
            </div>
            
            <select
              className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={batchId}
              onChange={(e) => { setBatchId(e.target.value); setPage(1); }}
            >
              <option value="">All Batches / Courses</option>
              {batches?.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => { 
                const [by, order] = e.target.value.split('-');
                setSortBy(by);
                setSortOrder(order as 'asc'|'desc');
                setPage(1);
              }}
            >
              <option value="created_at-desc">Newest Enrolled</option>
              <option value="created_at-asc">Oldest Enrolled</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>

            <Button type="submit" variant="secondary" className="w-full sm:w-auto">Search</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading students...</div>
          ) : isError ? (
            <div className="p-12 text-center text-destructive">Error loading students.</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Users className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">{searchTerm ? 'No students found matching your search.' : 'No students have been onboarded yet.'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Batch / Course</th>
                      <th className="px-6 py-4 font-medium">Contact</th>
                      <th className="px-6 py-4 font-medium">Enrollment Date</th>
                      <th className="px-6 py-4 font-medium">Total Fee</th>
                      <th className="px-6 py-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    className="divide-y divide-border"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                  >
                    {students.map((student: any) => (
                      <motion.tr variants={itemVariants} key={student.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{student.name}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{student.batches?.name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{student.contact_number || '-'}</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(student.enrollment_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-semibold">
                          ₹{student.fee_structures?.[0]?.total_amount?.toLocaleString() || '0'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Link to={`/students/${student.id}`}>
                              <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500/20" title="View Profile">
                                <Eye size={16} />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                              title="Delete Student"
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDelete(student.id, student.name)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
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
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, count)} of {count} students
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
