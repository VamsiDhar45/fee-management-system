export interface HostelVendor {
  id: string;
  name: string;
  contact_number: string | null;
  address: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Hostel {
  id: string;
  name: string;
  capacity: number | null;
  address: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HostelItem {
  id: string;
  vendor_id: string;
  name: string;
  category: string | null;
  default_unit: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HostelPurchase {
  id: string;
  hostel_id: string;
  vendor_id: string;
  hostel?: Hostel;
  vendor?: HostelVendor;
  purchase_date: string;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  items?: HostelPurchaseItem[];
}

export interface HostelPurchaseItem {
  id: string;
  purchase_id: string;
  item_id: string;
  item?: HostelItem;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total_price: number;
  created_at?: string;
}
