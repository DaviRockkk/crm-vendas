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