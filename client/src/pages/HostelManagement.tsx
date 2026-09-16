import { useState } from 'react';
import { Store, ShoppingBag, Package } from 'lucide-react';
import VendorsList from '../components/hostel/VendorsList';
import ItemsList from '../components/hostel/ItemsList';
import PurchasesList from '../components/hostel/PurchasesList';

export function HostelManagement() {
  const [activeTab, setActiveTab] = useState<'purchases' | 'vendors' | 'items'>('purchases');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Hostel Management</h1>
        <p className="text-muted-foreground mt-1">Manage inventory purchases, vendors, and items.</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'purchases' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <ShoppingBag size={18} />
            Purchases
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'vendors' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Store size={18} />
            Vendors
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'items' 
                ? 'text-primary border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Package size={18} />
            Items
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'purchases' && <PurchasesList />}
          {activeTab === 'vendors' && <VendorsList />}
          {activeTab === 'items' && <ItemsList />}
        </div>
      </div>
    </div>
  );
}
