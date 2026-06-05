export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  client_id: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending';
  sale_date: string;
  created_at: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  payment_date: string;
  created_at: string;
}

export interface ClientWithBalance extends Client {
  total_spent: number;
  total_paid: number;
  total_debt: number;
}

export interface SaleWithClient extends Sale {
  client?: Client;
}