import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';

// ===================== JSON EXPORT =====================

export async function exportAllDataAsJSON(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const [clients, products, sales, saleItems] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', user.id),
    supabase.from('products').select('*').eq('user_id', user.id),
    supabase.from('sales').select('*').eq('user_id', user.id),
    supabase.from('sale_items').select('*, sales!inner(user_id)').eq('sales.user_id', user.id),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user_id: user.id,
    data: {
      clients: clients.data ?? [],
      products: products.data ?? [],
      sales: sales.data ?? [],
      sale_items: saleItems.data ?? [],
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  const fileName = `crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Compartilhamento não disponível neste dispositivo');

  await Sharing.shareAsync(filePath, {
    mimeType: 'application/json',
    dialogTitle: 'Exportar Backup CRM',
    UTI: 'public.json',
  });
}

// ===================== CSV EXPORT =====================

function objectsToCSV(objects: Record<string, any>[]): string {
  if (!objects || objects.length === 0) return '';
  const headers = Object.keys(objects[0]);
  const rows = objects.map((obj) =>
    headers.map((h) => {
      const val = obj[h] ?? '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function exportAllDataAsCSV(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const [clients, products, sales, saleItems] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', user.id),
    supabase.from('products').select('*').eq('user_id', user.id),
    supabase.from('sales').select('*').eq('user_id', user.id),
    supabase.from('sale_items').select('*'),
  ]);

  const sections = [
    `=== CLIENTES ===\n${objectsToCSV(clients.data ?? [])}`,
    `\n\n=== PRODUTOS ===\n${objectsToCSV(products.data ?? [])}`,
    `\n\n=== VENDAS ===\n${objectsToCSV(sales.data ?? [])}`,
    `\n\n=== ITENS DE VENDA ===\n${objectsToCSV(saleItems.data ?? [])}`,
  ];

  const csv = sections.join('');
  const fileName = `crm-backup-${new Date().toISOString().slice(0, 10)}.csv`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Compartilhamento não disponível neste dispositivo');

  await Sharing.shareAsync(filePath, {
    mimeType: 'text/csv',
    dialogTitle: 'Exportar Dados como CSV',
    UTI: 'public.comma-separated-values-text',
  });
}
