import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Home, Trash2, Filter, X, Download, FileText, IndianRupee, ShoppingCart, Store } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../../api';
import { Modal } from '../Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function PurchasesList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hostels, setHostels] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  // Filter states
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterVendorId, setFilterVendorId] = useState('');
  const [filterItemId, setFilterItemId] = useState('');
  
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    hostel_id: '',
    vendor_id: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [purchaseItems, setPurchaseItems] = useState<{item_id: string, quantity: number, unit: string, price_per_unit: number, total_price: number}[]>([]);

  useEffect(() => {
    Promise.all([
      api.getHostels(),
      api.getVendors(),
      api.getItems()
    ]).then(([hostelData, venData, itmData]) => {
      setHostels(hostelData || []);
      setVendors(venData || []);
      setItems(itmData || []);
    }).catch(console.error);
  }, []);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['hostel_purchases'],
    queryFn: () => api.getPurchases()
  });

  const filteredPurchases = purchases.filter(p => {
    if (filterVendorId && p.vendor_id !== filterVendorId) return false;
    if (filterItemId && !p.items?.some((pi: any) => pi.item_id === filterItemId)) return false;
    if (filterDateFrom && p.purchase_date < filterDateFrom) return false;
    if (filterDateTo && p.purchase_date > filterDateTo) return false;
    return true;
  });

  const hasActiveFilters = filterDateFrom || filterDateTo || filterVendorId || filterItemId;

  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterVendorId('');
    setFilterItemId('');
  };

  const mutation = useMutation({
    mutationFn: (data: { purchase: any, items: any[] }) => api.createPurchase(data.purchase, data.items),
    onSuccess: () => {
      toast.success('Purchase recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['hostel_purchases'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to record purchase');
    }
  });

  const resetForm = () => {
    setFormData({
      hostel_id: '',
      vendor_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPurchaseItems([]);
  };

  const handleAddItem = () => {
    setPurchaseItems([
      ...purchaseItems, 
      { item_id: '', quantity: 1, unit: 'kg', price_per_unit: 0, total_price: 0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...purchaseItems];
    const item = { ...newItems[index], [field]: value };
    
    // Auto calculate total
    if (field === 'quantity' || field === 'price_per_unit') {
      item.total_price = Number(item.quantity) * Number(item.price_per_unit);
    }
    
    // Auto set default unit when item is selected
    if (field === 'item_id') {
      const selectedItem = items.find(i => i.id === value);
      if (selectedItem && selectedItem.default_unit) {
        item.unit = selectedItem.default_unit;
      }
    }
    
    newItems[index] = item;
    setPurchaseItems(newItems);
  };

  const totalPurchaseAmount = purchaseItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hostel_id || !formData.vendor_id) {
      toast.error('Please select a hostel and vendor');
      return;
    }
    if (purchaseItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    
    // Validate items
    for (const item of purchaseItems) {
      if (!item.item_id || item.quantity <= 0 || item.price_per_unit < 0) {
        toast.error('Please fill in all item details correctly');
        return;
      }
    }

    const purchaseData = {
      ...formData,
      total_amount: totalPurchaseAmount
    };

    mutation.mutate({ purchase: purchaseData, items: purchaseItems });
  };

  const filteredItemsList = formData.vendor_id ? items.filter(i => i.vendor_id === formData.vendor_id) : items;

  // Summary values from filtered purchases
  const totalAmount = filteredPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
  const uniqueVendors = new Set(filteredPurchases.map(p => p.vendor_id)).size;
  const totalItemLines = filteredPurchases.reduce((sum, p) => sum + (p.items?.length || 0), 0);

  // CSV Export
  const exportCSV = () => {
    const rows = [
      ['Date', 'Hostel', 'Vendor', 'Items', 'Total Amount (INR)']
    ];
    filteredPurchases.forEach(p => {
      const itemStr = p.items?.map((i: any) => `${i.item?.name} (${i.quantity} ${i.unit})`).join('; ') || '';
      rows.push([
        new Date(p.purchase_date).toLocaleDateString('en-IN'),
        p.hostel?.name || '',
        p.vendor?.name || '',
        itemStr,
        Number(p.total_amount).toFixed(2)
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hostel-purchases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Hostel Purchase Report', 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);
    if (filterDateFrom || filterDateTo) {
      doc.text(`Period: ${filterDateFrom || 'start'} to ${filterDateTo || 'end'}`, 14, 28);
    }
    doc.setTextColor(0);

    // Summary row
    doc.setFontSize(11);
    doc.text(`Total: \u20B9${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}  |  Purchases: ${filteredPurchases.length}  |  Vendors: ${uniqueVendors}`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [['Date', 'Hostel', 'Vendor', 'Items', 'Amount (\u20B9)']],
      body: filteredPurchases.map(p => [
        new Date(p.purchase_date).toLocaleDateString('en-IN'),
        p.hostel?.name || '',
        p.vendor?.name || '',
        p.items?.map((i: any) => `${i.item?.name} (${i.quantity} ${i.unit})`).join(', ') || '',
        Number(p.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ]),
      foot: [['', '', '', 'Grand Total', `\u20B9${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      footStyles: { fontStyle: 'bold', fillColor: [230, 230, 255], textColor: [30, 30, 30] },
      columnStyles: { 3: { cellWidth: 60 }, 4: { halign: 'right' } }
    });
    doc.save(`hostel-purchases-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading purchases...</div>;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter size={16} className="text-primary" />
            Filters
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">From Date</label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">To Date</label>
            <Input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Vendor</label>
            <select
              value={filterVendorId}
              onChange={e => setFilterVendorId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Vendors</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Item</label>
            <select
              value={filterItemId}
              onChange={e => setFilterItemId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All Items</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="text-xs text-muted-foreground">
            Showing {filteredPurchases.length} of {purchases.length} purchases
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full shrink-0">
            <IndianRupee size={20} className="text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Spend</div>
            <div className="text-2xl font-bold mt-0.5">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-full shrink-0">
            <ShoppingCart size={20} className="text-blue-500" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Purchases</div>
            <div className="text-2xl font-bold mt-0.5">{filteredPurchases.length}</div>
            <div className="text-xs text-muted-foreground">{totalItemLines} item line{totalItemLines !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-full shrink-0">
            <Store size={20} className="text-green-500" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Vendors</div>
            <div className="text-2xl font-bold mt-0.5">{uniqueVendors}</div>
          </div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={filteredPurchases.length === 0}
            className="gap-2 text-sm"
          >
            <Download size={15} /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportPDF}
            disabled={filteredPurchases.length === 0}
            className="gap-2 text-sm"
          >
            <FileText size={15} /> Export PDF
          </Button>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={18} /> Record Purchase
        </Button>
      </div>

      <div className="overflow-x-auto bg-card rounded-lg border border-border">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Hostel</th>
              <th className="px-6 py-4 font-medium">Vendor</th>
              <th className="px-6 py-4 font-medium">Items</th>
              <th className="px-6 py-4 font-medium">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground">
                  No purchases found.
                </td>
              </tr>
            ) : (
              filteredPurchases.map(purchase => (
                <tr key={purchase.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar size={14} />
                      {new Date(purchase.purchase_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <div className="flex items-center gap-2">
                      <Home size={14} className="text-primary" />
                      {purchase.hostel?.name || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4">{purchase.vendor?.name || 'Unknown Vendor'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {purchase.items?.slice(0, 3).map((item: any, i: number) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                          {item.item?.name} ({item.quantity} {item.unit})
                        </span>
                      ))}
                      {purchase.items?.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          +{purchase.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold">₹{Number(purchase.total_amount).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Purchase">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hostel</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.hostel_id}
                onChange={e => {
                  setFormData({...formData, hostel_id: e.target.value});
                  setPurchaseItems([]);
                }}
              >
                <option value="">Select Hostel</option>
                {hostels.map(hostel => (
                  <option key={hostel.id} value={hostel.id}>{hostel.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Vendor</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                value={formData.vendor_id}
                onChange={e => setFormData({...formData, vendor_id: e.target.value})}
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <Input
              type="date"
              required
              value={formData.purchase_date}
              onChange={e => setFormData({...formData, purchase_date: e.target.value})}
            />
          </div>

          <div className="border border-border rounded-lg p-4 bg-muted/10 space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={!formData.hostel_id} className="gap-2">
                <Plus size={14} /> Add Item
              </Button>
            </div>
            
            {purchaseItems.length === 0 ? (
              <div className="text-sm text-muted-foreground italic text-center py-4">
                Click "Add Item" to add products to this purchase.
              </div>
            ) : (
              <div className="space-y-2">
                {purchaseItems.map((item, index) => (
                  <div key={index} className="border border-border rounded-md p-3 space-y-2 bg-background">
                    {/* Row 1: Item select + delete */}
                    <div className="flex gap-2 items-center">
                      <select
                        required
                        className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={item.item_id}
                        onChange={e => handleItemChange(index, 'item_id', e.target.value)}
                      >
                        <option value="">Select Item</option>
                        {filteredItemsList.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    {/* Row 2: Qty / Unit / Price / Total */}
                    <div className="grid grid-cols-4 gap-2 items-center">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Qty</div>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          required
                          className="h-8 text-sm"
                          value={item.quantity || ''}
                          onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Unit</div>
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={item.unit}
                          onChange={e => handleItemChange(index, 'unit', e.target.value)}
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="L">L</option>
                          <option value="ml">ml</option>
                          <option value="pcs">pcs</option>
                          <option value="pkts">pkts</option>
                          <option value="boxes">boxes</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Price/Unit (₹)</div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="h-8 text-sm"
                          value={item.price_per_unit === 0 ? '' : item.price_per_unit}
                          onChange={e => handleItemChange(index, 'price_per_unit', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total</div>
                        <div className="h-8 flex items-center font-semibold text-sm">₹{item.total_price.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end pt-2 border-t border-border mt-2">
                  <div className="text-sm font-medium mr-4">Total:</div>
                  <div className="font-bold">₹{totalPurchaseAmount.toFixed(2)}</div>
                </div>
              </div>
            )}

          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <textarea
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Purchase'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
