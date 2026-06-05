import { supabase, isSupabaseConfigured } from './supabase';
import { Client, Sale, Payment, ClientWithBalance, SaleWithClient } from './database.types';

// Gerador de UUID simples para o modo offline
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Dados Mockados Iniciais para Demonstração
let mockClients: Client[] = [
  {
    id: 'c1',
    name: 'Ana Silva',
    phone: '(11) 99876-5432',
    email: 'ana.silva@email.com',
    notes: 'Cliente antiga, costuma comprar cosméticos.',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c2',
    name: 'Carlos Souza',
    phone: '(21) 98765-4321',
    email: 'carlos.souza@email.com',
    notes: 'Paga sempre por Pix, mas às vezes atrasa.',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c3',
    name: 'Beatriz Lima',
    phone: '(31) 97654-3210',
    email: 'beatriz.l@email.com',
    notes: 'Nova cliente, comprou roupas.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let mockSales: Sale[] = [
  // Vendas de Fevereiro (2026-02-10 e 2026-02-20)
  {
    id: 's_feb1',
    client_id: 'c1',
    description: 'Kit Perfumaria e Cremes',
    amount: 300.0,
    status: 'paid',
    sale_date: '2026-02-10T14:30:00.000Z',
    created_at: '2026-02-10T14:30:00.000Z',
  },
  {
    id: 's_feb2',
    client_id: 'c2',
    description: 'Óculos de Sol',
    amount: 350.0,
    status: 'paid',
    sale_date: '2026-02-20T10:15:00.000Z',
    created_at: '2026-02-20T10:15:00.000Z',
  },
  // Vendas de Março (2026-03-05 e 2026-03-18)
  {
    id: 's_mar1',
    client_id: 'c3',
    description: 'Calça Jeans e Camisa Polo',
    amount: 450.0,
    status: 'paid',
    sale_date: '2026-03-05T16:00:00.000Z',
    created_at: '2026-03-05T16:00:00.000Z',
  },
  {
    id: 's_mar2',
    client_id: 'c1',
    description: 'Bolsa de Couro',
    amount: 350.0,
    status: 'paid',
    sale_date: '2026-03-18T11:45:00.000Z',
    created_at: '2026-03-18T11:45:00.000Z',
  },
  // Vendas de Abril (2026-04-12 e 2026-04-25)
  {
    id: 's_apr1',
    client_id: 'c2',
    description: 'Kit Perfumaria e Cremes',
    amount: 600.0,
    status: 'paid',
    sale_date: '2026-04-12T13:20:00.000Z',
    created_at: '2026-04-12T13:20:00.000Z',
  },
  {
    id: 's_apr2',
    client_id: 'c3',
    description: 'Batom Matte',
    amount: 400.0,
    status: 'paid',
    sale_date: '2026-04-25T15:30:00.000Z',
    created_at: '2026-04-25T15:30:00.000Z',
  },
  // Vendas de Maio (2026-05-08 e 2026-05-22)
  {
    id: 's_may1',
    client_id: 'c1',
    description: 'Calça Jeans e Camisa Polo',
    amount: 700.0,
    status: 'paid',
    sale_date: '2026-05-08T09:00:00.000Z',
    created_at: '2026-05-08T09:00:00.000Z',
  },
  {
    id: 's_may2',
    client_id: 'c2',
    description: 'Bolsa de Couro',
    amount: 500.0,
    status: 'paid',
    sale_date: '2026-05-22T17:10:00.000Z',
    created_at: '2026-05-22T17:10:00.000Z',
  },
  // Vendas de Junho (Mês Atual - Dinâmico)
  {
    id: 's1',
    client_id: 'c1',
    description: 'Kit Perfumaria e Cremes',
    amount: 350.0,
    status: 'paid',
    sale_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's2',
    client_id: 'c2',
    description: 'Calça Jeans e Camisa Polo',
    amount: 500.0,
    status: 'pending',
    sale_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's3',
    client_id: 'c3',
    description: 'Bolsa de Couro',
    amount: 150.0,
    status: 'pending',
    sale_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let mockPayments: Payment[] = [
  {
    id: 'p1',
    sale_id: 's2',
    amount: 200.0,
    payment_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Funções Auxiliares para cálculo de Balanço
const calculateClientBalances = (
  clients: Client[],
  sales: Sale[],
  payments: Payment[]
): ClientWithBalance[] => {
  return clients.map((client) => {
    const clientSales = sales.filter((s) => s.client_id === client.id);
    let total_spent = 0;
    let total_debt = 0;
    let total_paid = 0;

    clientSales.forEach((sale) => {
      total_spent += sale.amount;
      const salePayments = payments.filter((p) => p.sale_id === sale.id);
      const paidOnSale = salePayments.reduce((acc, p) => acc + p.amount, 0);

      if (sale.status === 'paid') {
        total_paid += sale.amount;
      } else {
        total_paid += paidOnSale;
        total_debt += Math.max(0, sale.amount - paidOnSale);
      }
    });

    return {
      ...client,
      total_spent,
      total_paid,
      total_debt,
    };
  });
};

// --- CLIENTS SERVICE ---
export const crmClients = {
  getAll: async (): Promise<ClientWithBalance[]> => {
    if (isSupabaseConfigured) {
      try {
        const { data: clients, error: err1 } = await supabase.from('clients').select('*');
        if (err1) throw err1;

        const { data: sales, error: err2 } = await supabase.from('sales').select('*');
        if (err2) throw err2;

        const { data: payments, error: err3 } = await supabase.from('payments').select('*');
        if (err3) throw err3;

        return calculateClientBalances(clients || [], sales || [], payments || []);
      } catch (error) {
        console.error('Error fetching clients from Supabase:', error);
      }
    }
    // Fallback Mock
    return calculateClientBalances(mockClients, mockSales, mockPayments);
  },

  create: async (name: string, phone: string, email?: string, notes?: string): Promise<Client> => {
    const newClient: Client = {
      id: isSupabaseConfigured ? undefined! : generateUUID(),
      name,
      phone,
      email,
      notes,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('clients')
        .insert([newClient])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    mockClients.push(newClient);
    return newClient;
  },

  update: async (id: string, name: string, phone: string, email?: string, notes?: string): Promise<Client> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('clients')
        .update({ name, phone, email, notes })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const index = mockClients.findIndex((c) => c.id === id);
    if (index !== -1) {
      mockClients[index] = { ...mockClients[index], name, phone, email, notes };
      return mockClients[index];
    }
    throw new Error('Client not found');
  },
};

// --- SALES SERVICE ---
export const crmSales = {
  getAll: async (): Promise<SaleWithClient[]> => {
    if (isSupabaseConfigured) {
      try {
        const { data: sales, error } = await supabase
          .from('sales')
          .select('*, client:clients(*)');
        if (error) throw error;
        return sales as SaleWithClient[];
      } catch (error) {
        console.error('Error fetching sales from Supabase:', error);
      }
    }

    // Fallback Mock
    return mockSales.map((sale) => ({
      ...sale,
      client: mockClients.find((c) => c.id === sale.client_id),
    }));
  },

  create: async (
    client_id: string,
    description: string,
    amount: number,
    status: 'paid' | 'pending',
    sale_date: string = new Date().toISOString()
  ): Promise<Sale> => {
    const newSale: Sale = {
      id: isSupabaseConfigured ? undefined! : generateUUID(),
      client_id,
      description,
      amount,
      status,
      sale_date,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('sales')
        .insert([newSale])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    mockSales.push(newSale);
    return newSale;
  },

  updateStatus: async (sale_id: string, status: 'paid' | 'pending'): Promise<Sale> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('sales')
        .update({ status })
        .eq('id', sale_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const index = mockSales.findIndex((s) => s.id === sale_id);
    if (index !== -1) {
      mockSales[index] = { ...mockSales[index], status };
      return mockSales[index];
    }
    throw new Error('Sale not found');
  },
};

// --- PAYMENTS SERVICE ---
export const crmPayments = {
  getBySale: async (sale_id: string): Promise<Payment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('sale_id', sale_id);
      if (error) throw error;
      return data || [];
    }

    return mockPayments.filter((p) => p.sale_id === sale_id);
  },

  getAll: async (): Promise<Payment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('payments').select('*');
      if (error) throw error;
      return data || [];
    }
    return mockPayments;
  },

  create: async (
    sale_id: string,
    amount: number,
    payment_date: string = new Date().toISOString()
  ): Promise<Payment> => {
    const newPayment: Payment = {
      id: isSupabaseConfigured ? undefined! : generateUUID(),
      sale_id,
      amount,
      payment_date,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('payments')
        .insert([newPayment])
        .select()
        .single();
      if (error) throw error;

      // Se pagou tudo ou mais do valor pendente, atualiza o status da venda para 'paid'
      const { data: sale } = await supabase.from('sales').select('*').eq('id', sale_id).single();
      if (sale) {
        const { data: allPayments } = await supabase.from('payments').select('amount').eq('sale_id', sale_id);
        const totalPaid = (allPayments || []).reduce((acc: number, curr: { amount: number }) => acc + curr.amount, 0);
        if (totalPaid >= sale.amount) {
          await supabase.from('sales').update({ status: 'paid' }).eq('id', sale_id);
        }
      }

      return data;
    }

    mockPayments.push(newPayment);

    // Lógica Offline para atualizar o status da venda se liquidou a dívida
    const sale = mockSales.find((s) => s.id === sale_id);
    if (sale) {
      const allPayments = mockPayments.filter((p) => p.sale_id === sale_id);
      const totalPaid = allPayments.reduce((acc, curr) => acc + curr.amount, 0);
      if (totalPaid >= sale.amount) {
        sale.status = 'paid';
      }
    }

    return newPayment;
  },
};