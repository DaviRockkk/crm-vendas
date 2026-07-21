import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { scheduleDueDateNotification, cancelNotificationsForSale } from '@/lib/notifications';
import type { Sale, NewSale } from '@/types';

const QUERY_KEY = 'sales';

async function fetchSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, clients(id, name, phone), sale_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchSaleById(id: string): Promise<Sale> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, clients(id, name, phone, notes), sale_items(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function fetchSalesByClient(clientId: string): Promise<Sale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useSales() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchSales,
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => fetchSaleById(id),
    enabled: !!id,
  });
}

export function useSalesByClient(clientId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'client', clientId],
    queryFn: () => fetchSalesByClient(clientId),
    enabled: !!clientId,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newSale: NewSale) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { items, ...saleData } = newSale;

      // Criar venda
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({ ...saleData, user_id: user.id })
        .select()
        .single();
      if (saleError) throw saleError;

      // Criar itens da venda
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(items.map((item) => ({ ...item, sale_id: sale.id })));
        if (itemsError) throw itemsError;
      }

      // Agendar notificação se tiver vencimento e não estiver pago
      if (sale.due_date && sale.status !== 'pago' && sale.due_amount > 0) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', sale.client_id)
          .single();
        if (client) {
          await scheduleDueDateNotification(
            sale.id,
            client.name,
            sale.due_amount,
            new Date(sale.due_date),
          ).catch(() => {});
        }
      }

      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sale> & { id: string }) => {
      const { data, error } = await supabase
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Re-agendar ou cancelar notificação
      if (data.status === 'pago') {
        await cancelNotificationsForSale(id).catch(() => {});
      } else if (data.due_date && data.due_amount > 0) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', data.client_id)
          .single();
        if (client) {
          await scheduleDueDateNotification(
            id,
            client.name,
            data.due_amount,
            new Date(data.due_date),
          ).catch(() => {});
        }
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, data.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await cancelNotificationsForSale(id).catch(() => {});
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}