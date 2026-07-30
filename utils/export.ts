import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, getStatusLabel } from '@/utils/format';

// ===================== JSON EXPORT =====================

export async function exportAllDataAsJSON(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const [clients, products, sales, saleItems] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', user.id),
    supabase.from('products').select('*').eq('user_id', user.id),
    supabase.from('sales').select('*').eq('user_id', user.id),
    supabase.from('sale_items').select('*'),
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

  const file = new File(Paths.cache, fileName);
  const writer = file.writableStream().getWriter();
  await writer.write(new TextEncoder().encode(json));
  await writer.close();

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Compartilhamento não disponível neste dispositivo');

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exportar Backup CRM (JSON)',
    UTI: 'public.json',
  });
}

// ===================== CSV EXPORT FOR EXCEL =====================

function arrayToCSVRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return '""';
      const str = String(v).replace(/\r?\n/g, ' ').replace(/"/g, '""');
      return `"${str}"`;
    })
    .join(';');
}

export async function exportAllDataAsCSV(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const [clientsRes, productsRes, salesRes] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
    supabase.from('products').select('*').eq('user_id', user.id).order('name'),
    supabase.from('sales').select('*, clients(name), sale_items(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
  ]);

  const clients = clientsRes.data ?? [];
  const products = productsRes.data ?? [];
  const sales = salesRes.data ?? [];

  // Mapear acumulados por cliente
  const clientStats: Record<string, { totalAmount: number; totalPaid: number; totalDue: number; count: number }> = {};
  sales.forEach((s: any) => {
    const cid = s.client_id;
    if (!cid) return;
    if (!clientStats[cid]) {
      clientStats[cid] = { totalAmount: 0, totalPaid: 0, totalDue: 0, count: 0 };
    }
    clientStats[cid].totalAmount += Number(s.total_amount || 0);
    clientStats[cid].totalPaid += Number(s.paid_amount || 0);
    clientStats[cid].totalDue += s.status !== 'pago' ? Number(s.due_amount || 0) : 0;
    clientStats[cid].count += 1;
  });

  const lines: string[] = [];

  // UTF-8 BOM (\uFEFF) para garantir acentuação correta no Excel em PT-BR
  const BOM = '\uFEFF';

  // --- SEÇÃO VENDAS ---
  lines.push('=== RELATÓRIO DE VENDAS ===');
  lines.push(
    arrayToCSVRow([
      'Cliente',
      'Data da Venda',
      'Status',
      'Valor Total',
      'Valor Pago',
      'Saldo Devedor',
      'Vencimento',
      'Parcelas',
      'Itens da Venda',
    ])
  );

  sales.forEach((s: any) => {
    const clientName = Array.isArray(s.clients)
      ? s.clients[0]?.name ?? 'Cliente Desconhecido'
      : s.clients?.name ?? 'Cliente Desconhecido';

    const itemsStr = (s.sale_items ?? [])
      .map((item: any) => `${item.quantity}x ${item.product_name} (${formatCurrency(item.unit_price)})`)
      .join(' | ');

    lines.push(
      arrayToCSVRow([
        clientName,
        formatDate(s.created_at),
        getStatusLabel(s.status),
        formatCurrency(s.total_amount),
        formatCurrency(s.paid_amount),
        formatCurrency(s.due_amount),
        formatDate(s.due_date),
        `${s.installments ?? 1}x`,
        itemsStr || 'Sem itens registrados',
      ])
    );
  });

  lines.push('');
  lines.push('');

  // --- SEÇÃO CLIENTES ---
  lines.push('=== RELATÓRIO DE CLIENTES ===');
  lines.push(
    arrayToCSVRow([
      'Nome do Cliente',
      'Telefone',
      'Observações',
      'Qtd. Vendas',
      'Total Comprado',
      'Total Pago',
      'Saldo Devedor Acumulado',
      'Data de Cadastro',
    ])
  );

  clients.forEach((c: any) => {
    const stats = clientStats[c.id] ?? { totalAmount: 0, totalPaid: 0, totalDue: 0, count: 0 };
    lines.push(
      arrayToCSVRow([
        c.name,
        c.phone || '—',
        c.notes || '—',
        stats.count,
        formatCurrency(stats.totalAmount),
        formatCurrency(stats.totalPaid),
        formatCurrency(stats.totalDue),
        formatDate(c.created_at),
      ])
    );
  });

  lines.push('');
  lines.push('');

  // --- SEÇÃO PRODUTOS ---
  lines.push('=== CATÁLOGO DE PRODUTOS ===');
  lines.push(
    arrayToCSVRow([
      'Nome do Produto',
      'Preço Padrão',
      'Data de Cadastro',
    ])
  );

  products.forEach((p: any) => {
    lines.push(
      arrayToCSVRow([
        p.name,
        formatCurrency(p.default_price),
        formatDate(p.created_at),
      ])
    );
  });

  const csvContent = BOM + lines.join('\n');
  const fileName = `crm-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;

  const file = new File(Paths.cache, fileName);
  const writer = file.writableStream().getWriter();
  await writer.write(new TextEncoder().encode(csvContent));
  await writer.close();

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) throw new Error('Compartilhamento não disponível neste dispositivo');

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Exportar Relatório Excel (CSV)',
    UTI: 'public.comma-separated-values-text',
  });
}
