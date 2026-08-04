import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';

const QUERY_KEY = 'clients';

async function fetchClients(): Promise<Client[]> {
  const [clientsRes, salesRes] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('sales').select('client_id, total_amount, paid_amount, due_amount, status'),
  ]);

  if (clientsRes.error) throw clientsRes.error;
  if (salesRes.error) throw salesRes.error;

  const clients = clientsRes.data ?? [];
  const sales = salesRes.data ?? [];

  const salesByClient: Record<string, { totalPaid: number; totalDue: number; count: number }> = {};

  sales.forEach((s: any) => {
    const cid = s.client_id;
    if (!cid) return;
    if (!salesByClient[cid]) {
      salesByClient[cid] = { totalPaid: 0, totalDue: 0, count: 0 };
    }
    const paid = Number(s.paid_amount || 0);
    const due = s.status !== 'pago' ? Number(s.due_amount || 0) : 0;

    salesByClient[cid].totalPaid += paid;
    salesByClient[cid].totalDue += due;
    salesByClient[cid].count += 1;
  });

  return clients.map((c: any) => {
    const stats = salesByClient[c.id] || { totalPaid: 0, totalDue: 0, count: 0 };
    return {
      ...c,
      totalPaid: stats.totalPaid,
      totalDue: stats.totalDue,
      totalSalesCount: stats.count,
    };
  });
}

async function fetchClientById(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export function useClients() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchClients,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => fetchClientById(id),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      if (client.phone && client.phone.trim()) {
        const cleanPhone = client.phone.replace(/\D/g, '');
        if (cleanPhone) {
          const { data: existingClients } = await supabase
            .from('clients')
            .select('id, name, phone')
            .eq('user_id', user.id);

          const duplicate = existingClients?.find(
            (c: any) => c.phone && c.phone.replace(/\D/g, '') === cleanPhone
          );
          if (duplicate) {
            throw new Error(`Este número de telefone já está cadastrado para o cliente "${duplicate.name}".`);
          }
        }
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      if (updates.phone !== undefined && updates.phone !== null && updates.phone.trim() !== '') {
        const cleanPhone = updates.phone.replace(/\D/g, '');
        if (cleanPhone) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Usuário não autenticado.');

          const { data: existingClients } = await supabase
            .from('clients')
            .select('id, name, phone')
            .eq('user_id', user.id)
            .neq('id', id);

          const duplicate = existingClients?.find(
            (c: any) => c.phone && c.phone.replace(/\D/g, '') === cleanPhone
          );
          if (duplicate) {
            throw new Error(`Este número de telefone já está cadastrado para o cliente "${duplicate.name}".`);
          }
        }
      }

      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}