export interface Product {
  id: string;
  name: string;
  default_price: number;
  photo_url?: string | null;
  created_at: string;
  user_id: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  notes?: string | null;
  created_at: string;
  user_id: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export type SaleStatus = 'pago' | 'parcial' | 'pendente';

export interface Sale {
  id: string;
  client_id: string;
  clients?: Client;
  sale_items?: SaleItem[];
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  due_date?: string | null;
  status: SaleStatus;
  created_at: string;
  user_id: string;
}

export interface DashboardStats {
  totalReceived: number;
  totalDue: number;
  totalSales: number;
  monthlySales: { date: string; value: number }[];
  statusBreakdown: { label: string; value: number; color: string }[];
  topProducts: { name: string; count: number }[];
  topDebtors: { name: string; amount: number; client_id: string }[];
}

export interface NewSaleItem {
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface NewSale {
  client_id: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  due_date?: string | null;
  status: SaleStatus;
  items: NewSaleItem[];
}
