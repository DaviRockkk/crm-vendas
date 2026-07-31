import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

const QUERY_KEY = 'products';

async function fetchProducts(): Promise<Product[]> {
  const [productsRes, itemsRes] = await Promise.all([
    supabase.from('products').select('*').order('name'),
    supabase.from('sale_items').select('product_id, product_name, quantity'),
  ]);

  if (productsRes.error) throw productsRes.error;
  const products = productsRes.data ?? [];
  const items = itemsRes.data ?? [];

  const countById: Record<string, number> = {};
  const countByName: Record<string, number> = {};

  items.forEach((item: any) => {
    const qty = item.quantity ?? 1;
    if (item.product_id) {
      countById[item.product_id] = (countById[item.product_id] ?? 0) + qty;
    }
    if (item.product_name) {
      const lowerName = item.product_name.trim().toLowerCase();
      countByName[lowerName] = (countByName[lowerName] ?? 0) + qty;
    }
  });

  return products.map((p) => {
    const soldCount = countById[p.id] ?? countByName[p.name.trim().toLowerCase()] ?? 0;
    return {
      ...p,
      salesCount: soldCount,
    };
  });
}

async function fetchProductById(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export function useProducts() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: fetchProducts,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => fetchProductById(id),
    enabled: !!id,
  });
}

export interface ProductBuyer {
  id: string;
  sale_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  sale_status: 'pago' | 'parcial' | 'pendente';
  client_id: string;
  client_name: string;
  client_phone?: string | null;
}

async function fetchProductBuyers(productId: string, productName?: string): Promise<ProductBuyer[]> {
  const [byProductRes, byNameRes] = await Promise.all([
    supabase
      .from('sale_items')
      .select(`
        id,
        sale_id,
        product_id,
        product_name,
        unit_price,
        quantity,
        sales!inner (
          id,
          created_at,
          status,
          client_id,
          clients (
            id,
            name,
            phone
          )
        )
      `)
      .eq('product_id', productId),
    productName
      ? supabase
          .from('sale_items')
          .select(`
            id,
            sale_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            sales!inner (
              id,
              created_at,
              status,
              client_id,
              clients (
                id,
                name,
                phone
              )
            )
          `)
          .ilike('product_name', productName.trim())
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (byProductRes.error) throw byProductRes.error;
  if (byNameRes.error) throw byNameRes.error;

  const rawList = [...(byProductRes.data ?? []), ...(byNameRes.data ?? [])];
  
  const seenIds = new Set<string>();
  const buyers: ProductBuyer[] = [];

  for (const item of rawList) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);

    const sale: any = item.sales;
    if (!sale) continue;
    const client: any = sale.clients;
    const qty = item.quantity ?? 1;
    const unitPrice = item.unit_price ?? 0;

    buyers.push({
      id: item.id,
      sale_id: sale.id,
      quantity: qty,
      unit_price: unitPrice,
      total_price: qty * unitPrice,
      sale_date: sale.created_at,
      sale_status: sale.status,
      client_id: client?.id ?? sale.client_id,
      client_name: client?.name ?? 'Cliente Desconhecido',
      client_phone: client?.phone ?? null,
    });
  }

  return buyers.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
}

export function useProductBuyers(productId?: string, productName?: string) {
  return useQuery({
    queryKey: ['product_buyers', productId, productName],
    queryFn: () => fetchProductBuyers(productId!, productName),
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, user_id: user!.id })
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

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
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

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// Upload de foto do produto para Supabase Storage
export async function uploadProductPhoto(uri: string, productId: string): Promise<string> {
  const ext = uri.split('.').pop() ?? 'jpg';
  const path = `${productId}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const { error } = await supabase.storage
    .from('products')
    .upload(path, arrayBuffer, {
      contentType: `image/${ext}`,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('products').getPublicUrl(path);
  return data.publicUrl;
}