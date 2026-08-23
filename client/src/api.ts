import { supabase } from './supabase';

export interface Entity {
  id: string;
  name: string;
  description: string;
  created_at: string;
  has_gst?: boolean;
}

export interface Batch {
  id: string;
  name: string;
  created_at: string;
}

export const api = {
  getBatches: async () => {
    const { data, error } = await supabase.from('batches').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    // Deduplicate by name in case seed ran multiple times
    const seen = new Map<string, Batch>();
    (data as Batch[])?.forEach(b => { if (!seen.has(b.name)) seen.set(b.name, b); });
    return Array.from(seen.values()) as Batch[];
  },

  createEntity: async (name: string, description: string, has_gst: boolean = false) => {
    const { data, error } = await supabase.from('entities').insert([{ name, description, has_gst }]).select();
    if (error) throw error;
    return data[0] as Entity;
  },

  createBatch: async (name: string) => {
    const { data, error } = await supabase.from('batches').insert([{ name }]).select();
    if (error) throw error;
    return data[0] as Batch;
  },

  getStudents: async (
    page: number = 1, 
    limit: number = 10, 
    searchTerm: string = '', 
    batchId: string = '',
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
      .from('students')
      .select(`
        *,
        batches (name),
        fee_structures (total_amount)
      `, { count: 'exact' });

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(start, end);

    if (error) throw error;
    return { 
      data: data || [], 
      count: count || 0, 
      totalPages: count ? Math.ceil(count / limit) : 0 
    };
  },

  onboardStudent: async (studentData: {
    batch_id: string;
    name: string;
    contact_number: string;
    enrollment_date: string;
    admission_number: string;
  }, totalFee: number, installments: { amount_due: number; due_date: string }[], feeComponents: { category_name: string; amount: number; entity_id: string }[]) => {
    // 1. Create Student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert([studentData])
      .select()
      .single();
    if (studentError) throw studentError;

    // 2. Create Fee Structure
    const { data: feeStructure, error: feeError } = await supabase
      .from('fee_structures')
      .insert([{ student_id: student.id, total_amount: totalFee }])
      .select()
      .single();
    if (feeError) throw feeError;

    // 3. Create Fee Components
    if (feeComponents.length > 0) {
      const componentsData = feeComponents.map(comp => ({
        fee_structure_id: feeStructure.id,
        category_name: comp.category_name,
        amount: comp.amount,
        entity_id: comp.entity_id
      }));
      const { error: compError } = await supabase
        .from('fee_components')
        .insert(componentsData);
      if (compError) throw compError;
    }

    // 4. Create Installments
    const installmentData = installments.map(inst => ({
      fee_structure_id: feeStructure.id,
      amount_due: inst.amount_due,
      due_date: inst.due_date,
      status: 'PENDING'
    }));

    const { error: instError } = await supabase
      .from('fee_installments')
      .insert(installmentData);
    if (instError) throw instError;

    return student;
  },

  deleteStudent: async (studentId: string) => {
    // First, delete associated incomes (which cascades to income_allocations)
    // to prevent foreign key constraint violations.
    const { error: incomeError } = await supabase
      .from('incomes')
      .delete()
      .eq('student_id', studentId);
    if (incomeError) throw incomeError;

    // Then delete the student (cascades to fee_structures, installments, components)
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);
    if (error) throw error;
  },

  getStudentFeeDetails: async (studentId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        batches (name),
        fee_structures (
          id, total_amount,
          fee_installments (*),
          fee_components (*, entities(name, has_gst))
        ),
        incomes (
          *,
          income_allocations (*)
        )
      `)
      .eq('id', studentId)
      .single();
    if (error) throw error;
    return data;
  },

  generateReceiptNumber: async (_entityId: string, entityName: string) => {
    const initials = entityName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 3).toUpperCase();
    const prefix = initials || 'GKL';
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from('incomes')
      .select('receipt_number')
      .ilike('receipt_number', `${prefix}-${year}-%`)
      .order('receipt_number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    if (data && data.length > 0 && data[0].receipt_number) {
      const lastNumber = data[0].receipt_number;
      const parts = lastNumber.split('-');
      if (parts.length === 3) {
        const nextNum = parseInt(parts[2], 10) + 1;
        return `${prefix}-${year}-${nextNum.toString().padStart(4, '0')}`;
      }
    }
    return `${prefix}-${year}-0001`;
  },

  recordPayment: async (paymentData: {
    student_id: string;
    installment_id: string;
    payment_mode: string;
    reference_number?: string;
    allocations: { fee_component_id: string; amount: number; entity_id: string; entity_name: string }[];
  }) => {
    // Group allocations by entity_id
    const groupedAllocations = paymentData.allocations.reduce((acc, alloc) => {
      if (!acc[alloc.entity_id]) {
        acc[alloc.entity_id] = {
          entity_id: alloc.entity_id,
          entity_name: alloc.entity_name,
          allocations: [],
          totalAmount: 0
        };
      }
      acc[alloc.entity_id].allocations.push(alloc);
      acc[alloc.entity_id].totalAmount += alloc.amount;
      return acc;
    }, {} as Record<string, { entity_id: string, entity_name: string, allocations: any[], totalAmount: number }>);

    const incomes = [];

    for (const group of Object.values(groupedAllocations)) {
      const receipt_number = await api.generateReceiptNumber(group.entity_id, group.entity_name);
      
      // 1. Insert Income
      const { data: income, error: incomeError } = await supabase.from('incomes').insert({
        entity_id: group.entity_id,
        student_id: paymentData.student_id,
        installment_id: paymentData.installment_id,
        amount: group.totalAmount,
        payment_mode: paymentData.payment_mode,
        reference_number: paymentData.reference_number || null,
        receipt_number: receipt_number
      }).select().single();
      
      if (incomeError) throw incomeError;

      // 2. Insert Allocations
      if (group.allocations.length > 0) {
        const allocsToInsert = group.allocations.map(a => ({
          income_id: income.id,
          fee_component_id: a.fee_component_id,
          amount: a.amount
        }));
        const { error: allocError } = await supabase.from('income_allocations').insert(allocsToInsert);
        if (allocError) throw allocError;
      }
      
      incomes.push(income);
    }

    // 3. Update Installment Status
    const { data: allIncomes } = await supabase.from('incomes').select('amount').eq('installment_id', paymentData.installment_id);
    const totalPaid = allIncomes?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    
    const { data: inst } = await supabase.from('fee_installments').select('amount_due').eq('id', paymentData.installment_id).single();
    
    if (inst) {
      let status = 'PENDING';
      if (totalPaid >= Number(inst.amount_due)) status = 'PAID';
      else if (totalPaid > 0) status = 'PARTIAL';
      
      await supabase.from('fee_installments').update({ status }).eq('id', paymentData.installment_id);
    }

    // Fetch the full income rows with entity details to return
    const { data: fullIncomes } = await supabase
      .from('incomes')
      .select(`*, entities(name, has_gst)`)
      .in('id', incomes.map(i => i.id));

    return fullIncomes || incomes;
  },

  getDashboardStats: async (startDate?: Date, endDate?: Date) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    // Default to 'All Time' if no start date is provided (1970)
    const p_start_date = startDate ? startDate.toISOString() : new Date('1970-01-01').toISOString();
    const p_end_date = endDate ? endDate.toISOString() : new Date().toISOString();
    
    const { data, error } = await supabase.rpc('get_dashboard_metrics', {
      p_start_date,
      p_end_date,
      p_today_start: todayStart.toISOString(),
      p_today_end: todayEnd.toISOString()
    });

    if (error) {
      console.error('RPC Error:', error);
      throw new Error('Failed to load dashboard metrics. Did you run the SQL migration?');
    }

    const recentExpensesData = await api.getRecentExpenses();

    const entityBreakdown = (data.entities || []).map((e: any) => ({
      ...e,
      pending: Math.max(0, e.expected - e.collected)
    }));

    const batchesData = (data.batches || []).map((b: any) => ({
      ...b,
      pending: Math.max(0, b.expected - b.collected)
    }));

    return {
      activeStudents: data.activeStudents || 0,
      totalCollectionsToday: data.totalCollectionsToday || 0,
      pendingFees: data.pendingFees || 0,
      totalOverdue: data.totalOverdue || 0,
      totalExpensesThisMonth: data.totalExpensesThisMonth || 0,
      pendingExpensesCount: data.pendingExpensesCount || 0,
      netProfit: data.netProfit || 0,
      categoryData: data.categoryData || [],
      monthlyData: data.monthlyData || [],
      entityBreakdown,
      batches: batchesData,
      expenseCategoryData: data.expenseCategoryData || [],
      collectionStatusData: data.collectionStatusData || [],
      recentExpenses: recentExpensesData
    };
  },

  getRecentExpenses: async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        id,
        expense_date,
        amount,
        description,
        status,
        entity_id,
        category_id,
        entities ( name ),
        expense_categories ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return (data || []).map((e: any) => ({
      id: e.id,
      date: e.expense_date,
      entity: e.entities?.name || 'N/A',
      category: e.expense_categories?.name || 'N/A',
      description: e.description,
      amount: Number(e.amount),
      status: e.status
    }));
  },

  getDefaulters: async (entityId?: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('fee_installments')
      .select(`
        *,
        fee_structures!inner (
          fee_components!inner (entity_id),
          students!inner (
            *,
            batches (name)
          )
        ),
        incomes (amount)
      `)
      .lt('due_date', today)
      .neq('status', 'PAID')
      .order('due_date', { ascending: true });

    if (entityId && entityId !== 'all') {
      query = query.eq('fee_structures.fee_components.entity_id', entityId);
    }
      
    const { data: overdueInstallments, error } = await query;
      
    if (error) throw error;
    
    const defaulters = overdueInstallments.map(inst => {
      const paid = inst.incomes?.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0) || 0;
      const amountOwed = Number(inst.amount_due) - paid;
      return {
        ...inst,
        amountOwed
      };
    }).filter(inst => inst.amountOwed > 0);
    
    return defaulters;
  },

  getTransactions: async (
    page: number = 1,
    limit: number = 10,
    searchTerm: string = '',
    entityId?: string,
    startDate?: string,
    endDate?: string,
    paymentMode?: string
  ) => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
      .from('incomes')
      .select(`
        *,
        students!inner (
          name,
          admission_number,
          batches (name)
        ),
        entities (name, has_gst)
      `, { count: 'exact' });

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }
    
    if (startDate) {
      // Assuming startDate is ISO string (e.g. YYYY-MM-DD or YYYY-MM-DDT00:00:00Z)
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      // Make sure endDate covers the whole day if it's just a date
      query = query.lte('created_at', endDate);
    }
    
    if (paymentMode) {
      query = query.eq('payment_mode', paymentMode);
    }

    if (searchTerm) {
      query = query.ilike('students.name', `%${searchTerm}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw error;
    return {
      data: data || [],
      count: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0
    };
  },

  exportAllTransactions: async (
    entityId?: string,
    startDate?: string,
    endDate?: string,
    paymentMode?: string
  ) => {
    let allData: any[] = [];
    let page = 0;
    const limit = 1000;
    
    while (true) {
      const start = page * limit;
      const end = start + limit - 1;
      
      let query = supabase
        .from('incomes')
        .select(`
          *,
          students!inner (
            name,
            admission_number,
            batches (name)
          ),
          entities (name, has_gst)
        `)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (entityId && entityId !== 'all') {
        query = query.eq('entity_id', entityId);
      }
      
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      if (paymentMode && paymentMode !== 'all') {
        query = query.eq('payment_mode', paymentMode);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      allData = [...allData, ...data];
      if (data.length < limit) break;
      page++;
    }
    
    return allData;
  },

  getTransactionStats: async (
    entityId?: string,
    startDate?: string,
    endDate?: string,
    paymentMode?: string,
    searchTerm?: string
  ) => {
    const { data, error } = await supabase.rpc('get_transaction_stats', {
      p_entity_id: entityId || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_payment_mode: paymentMode || null,
      p_search_term: searchTerm || null
    });
    
    if (error) throw error;
    return data;
  },

  // REPORTS APIs
  getDCRReport: async (startDate?: string, endDate?: string, entityId?: string) => {
    const { data, error } = await supabase.rpc('get_dcr_report', {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_entity_id: entityId || null
    });
    if (error) throw error;
    return data;
  },

  getComponentRevenueReport: async (startDate?: string, endDate?: string, entityId?: string, paymentMode?: string) => {
    let query = supabase
      .from('income_allocations')
      .select('amount, fee_components!inner(category_name), incomes!inner(created_at, entity_id, payment_mode)');

    if (startDate) query = query.gte('incomes.created_at', startDate);
    if (endDate) query = query.lte('incomes.created_at', endDate);
    if (entityId) query = query.eq('incomes.entity_id', entityId);
    if (paymentMode) query = query.eq('incomes.payment_mode', paymentMode);

    const { data, error } = await query;
    if (error) throw error;

    const summary: Record<string, number> = {};
    data.forEach((row: any) => {
      const cat = row.fee_components?.category_name || 'Uncategorized';
      summary[cat] = (summary[cat] || 0) + Number(row.amount);
    });

    return {
      summary: Object.entries(summary)
        .map(([category_name, total_amount]) => ({ category_name, total_amount }))
        .sort((a, b) => b.total_amount - a.total_amount),
      rawData: data
    };
  },

  getExpenseSummaryReport: async (startDate?: string, endDate?: string, entityId?: string, paymentMode?: string) => {
    let query = supabase
      .from('expenses')
      .select('amount, created_at, entity_id, status, payment_mode, expense_categories!inner(name)')
      .eq('status', 'APPROVED');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (entityId) query = query.eq('entity_id', entityId);
    if (paymentMode) query = query.eq('payment_mode', paymentMode);

    const { data, error } = await query;
    if (error) throw error;

    const categorySummary: Record<string, number> = {};
    const modeSummary: Record<string, number> = {};

    data.forEach((row: any) => {
      const cat = row.expense_categories?.name || 'Uncategorized';
      const mode = row.payment_mode || 'CASH';
      
      categorySummary[cat] = (categorySummary[cat] || 0) + Number(row.amount);
      modeSummary[mode] = (modeSummary[mode] || 0) + Number(row.amount);
    });

    return {
      byCategory: Object.entries(categorySummary)
        .map(([category_name, total_amount]) => ({ category_name, total_amount }))
        .sort((a, b) => b.total_amount - a.total_amount),
      byMode: Object.entries(modeSummary)
        .map(([payment_mode, total_amount]) => ({ payment_mode, total_amount }))
        .sort((a, b) => b.total_amount - a.total_amount),
      rawData: data
    };
  },

  getStudentBalancesReport: async (batchId?: string) => {
    let query = supabase
      .from('students')
      .select(`
        id,
        name,
        contact_number,
        enrollment_date,
        batches (name),
        fee_structures (total_amount),
        incomes (amount, payment_mode)
      `)
      .order('name');
      
    if (batchId && batchId !== 'all') {
      query = query.eq('batch_id', batchId);
    }
    
    let allData: any[] = [];
    let page = 0;
    const limit = 1000;
    
    while (true) {
      const start = page * limit;
      const end = start + limit - 1;
      
      const { data, error } = await query.range(start, end);
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      allData = [...allData, ...data];
      if (data.length < limit) break;
      page++;
    }
    
    return allData.map(student => {
      const totalFee = student.fee_structures?.[0]?.total_amount || 0;
      let paidCash = 0;
      let paidBank = 0;
      let totalPaid = 0;
      
      (student.incomes || []).forEach((income: any) => {
        const amt = Number(income.amount) || 0;
        totalPaid += amt;
        if (income.payment_mode === 'CASH') paidCash += amt;
        else if (income.payment_mode === 'BANK') paidBank += amt;
      });
      
      const balance = Number(totalFee) - totalPaid;
      
      return {
        student_id: student.id,
        student_name: student.name,
        batch_name: student.batches?.name || 'Unknown',
        contact_number: student.contact_number,
        enrollment_date: student.enrollment_date,
        total_fee: Number(totalFee),
        paid_cash: paidCash,
        paid_bank: paidBank,
        total_paid: totalPaid,
        balance: balance
      };
    });
  },

  exportAllDefaulters: async (entityId?: string) => {
    // Fetches all defaulters using pagination to bypass 1000 row limits
    const today = new Date().toISOString().split('T')[0];
    let allData: any[] = [];
    let page = 0;
    const limit = 1000;
    
    while (true) {
      const start = page * limit;
      const end = start + limit - 1;
      
      let query = supabase
        .from('fee_installments')
        .select(`
          *,
          fee_structures!inner (
            students!inner (
              *,
              entities (name),
              batches (name)
            )
          ),
          incomes (amount)
        `)
        .lt('due_date', today)
        .neq('status', 'PAID')
        .order('due_date', { ascending: true })
        .range(start, end);

      if (entityId) {
        // We have to filter by entity_id on students table
        query = query.eq('fee_structures.students.entity_id', entityId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) break;
      
      const processed = data.map(inst => {
        const paid = inst.incomes?.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0) || 0;
        const amountOwed = Number(inst.amount_due) - paid;
        return {
          ...inst,
          amountOwed
        };
      }).filter(inst => inst.amountOwed > 0);
      
      allData = [...allData, ...processed];
      
      if (data.length < limit) break; // Last page
      page++;
    }
    
    return allData;
  },

  // EXPENSE APIs
  getExpenseCategories: async () => {
    const { data, error } = await supabase.from('expense_categories').select('*').order('name');
    if (error) throw error;
    return data;
  },

  getEntities: async () => {
    const { data, error } = await supabase.from('entities').select('*').order('name');
    if (error) throw error;
    // Deduplicate by name in case seed ran multiple times
    const seen = new Map<string, Entity>();
    (data as Entity[])?.forEach(e => { if (!seen.has(e.name)) seen.set(e.name, e); });
    return Array.from(seen.values()) as Entity[];
  },

  getExpenses: async (
    page: number = 1,
    limit: number = 10,
    searchTerm: string = '',
    entityId: string = '',
    categoryId: string = '',
    status: string = '',
    startDate: string = '',
    endDate: string = ''
  ) => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
      .from('expenses')
      .select(`
        *,
        entities (name),
        batches (name),
        expense_categories (name),
        submitted_by_profile:profiles!expenses_submitted_by_fkey (name),
        approved_by_profile:profiles!expenses_approved_by_fkey (name)
      `, { count: 'exact' });

    if (searchTerm) query = query.ilike('description', `%${searchTerm}%`);
    if (entityId) query = query.eq('entity_id', entityId);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('expense_date', startDate);
    if (endDate) query = query.lte('expense_date', endDate);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw error;
    return {
      data: data || [],
      count: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0
    };
  },

  getExpenseStats: async (
    entityId: string = '',
    categoryId: string = '',
    status: string = '',
    startDate: string = '',
    endDate: string = '',
    searchTerm: string = ''
  ) => {
    const { data, error } = await supabase.rpc('get_expense_stats', {
      p_entity_id: entityId || null,
      p_category_id: categoryId || null,
      p_status: status || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_search_term: searchTerm || null
    });
    
    if (error) {
      console.error('RPC Error (get_expense_stats):', error);
      // Fallback if RPC is not deployed yet to avoid breaking UI completely
      return { totalAmount: 0, pendingCount: 0 };
    }
    
    return data;
  },

  uploadReceiptImage: async (file: File) => {
    // Dynamically import image compression so it doesn't block initial load if not needed
    const imageCompression = (await import('browser-image-compression')).default;
    
    let fileToUpload = file;
    // Only compress if it's an image
    if (file.type.startsWith('image/')) {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      try {
        fileToUpload = await imageCompression(file, options);
      } catch (error) {
        console.warn('Image compression failed, using original file', error);
      }
    }

    const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, fileToUpload);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
    return data.publicUrl;
  },

  submitExpense: async (expenseData: any) => {
    const { data, error } = await supabase.from('expenses').insert([expenseData]).select().single();
    if (error) throw error;
    return data;
  },

  notifyExpenseManager: async (amount: number, category: string, date: string) => {
    // Assuming backend runs on the same origin or configure appropriately if different.
    // Use an absolute URL if needed, or relative since Vite proxy might be used.
    // Usually local API is at http://localhost:5000 if not proxied. Let's use relative or full URL.
    // The environment in vite is import.meta.env.VITE_API_URL, let's see if there's any existing fetch.
    // Wait, the client is connecting to Supabase mostly. Let's hit the server at http://localhost:5000/api/notify-expense
    // Actually, check if other functions use fetch.
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/notify-expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, category, date }),
    });

    if (!response.ok) {
      throw new Error('Failed to notify manager');
    }
    return response.json();
  },

  updateExpenseStatus: async (id: string, status: string, approved_by?: string) => {
    const updateData: any = { status };
    if (approved_by) updateData.approved_by = approved_by;
    
    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  createAccountant: async (userData: any) => {
    const response = await fetch('http://localhost:5000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, role: 'accountant' })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create accountant');
    }
    return response.json();
  },


};
