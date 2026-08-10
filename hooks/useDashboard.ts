import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DashboardStats } from '@/types';
import { lightColors } from '@/constants/theme';
import { calculateInstallmentsDetail, isOverdue, getSalePaymentInfo } from '@/utils/format';

async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Consulta buscando vendas, nome do cliente, itens da venda e lista de produtos para mapeamento de ID
  const [salesRes, productsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('id, total_amount, paid_amount, due_amount, due_date, status, created_at, installments, client_id, clients(name), sale_items(product_id, product_name, quantity)')
      .order('created_at', { ascending: false }),
    supabase.from('products').select('id, name'),
  ]);

  if (salesRes.error) throw salesRes.error;

  const allSales = salesRes.data ?? [];
  const allProducts = productsRes.data ?? [];
  const monthlySalesData = allSales.filter((s) => (s.created_at ?? '') >= startOfMonth);

  // Mapeamento auxiliar de nome do produto -> ID
  const productIdByName: Record<string, string> = {};
  allProducts.forEach((p: any) => {
    if (p.name && p.id) {
      productIdByName[p.name.trim().toLowerCase()] = p.id;
    }
  });

  // Totais globais
  const totalReceived = allSales.reduce((acc, s) => acc + (s.paid_amount ?? 0), 0);
  const totalDue = allSales
    .filter((s) => s.status !== 'pago')
    .reduce((acc, s) => acc + (s.due_amount ?? 0), 0);

  // Gráfico de linha: recebimentos por dia no mês
  const dailyMap: Record<string, number> = {};
  monthlySalesData.forEach((sale) => {
    const day = (sale.created_at ?? '').slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + (sale.paid_amount ?? 0);
  });
  const monthlySales = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // Previsão e histórico comparativo por mês no semestre atual (Janeiro-Junho ou Julho-Dezembro)
  const receivedByMonth: Record<string, number> = {};
  allSales.forEach((s: any) => {
    const mKey = (s.created_at ?? '').slice(0, 7);
    if (mKey) {
      receivedByMonth[mKey] = (receivedByMonth[mKey] ?? 0) + (s.paid_amount ?? 0);
    }
  });

  const dueByMonth: Record<string, number> = {};
  allSales.forEach((s: any) => {
    if (s.status === 'pago' || (s.due_amount ?? 0) <= 0) return;

    const details = calculateInstallmentsDetail(
      s.total_amount ?? 0,
      s.paid_amount ?? 0,
      s.installments ?? 1,
      s.due_date || s.created_at
    );

    details.forEach((inst) => {
      if (inst.status === 'pago' || inst.remaining <= 0) return;
      const mKey = inst.dueDate.slice(0, 7);
      dueByMonth[mKey] = (dueByMonth[mKey] ?? 0) + inst.remaining;
    });
  });

  const currentYear = now.getFullYear();
  const semesterStartMonth = now.getMonth() < 6 ? 0 : 6;

  const timelineData = Array.from({ length: 6 }, (_, i) => {
    const mIdx = semesterStartMonth + i;
    const mStr = String(mIdx + 1).padStart(2, '0');
    const mKey = `${currentYear}-${mStr}`;
    return {
      month: mKey,
      received: receivedByMonth[mKey] ?? 0,
      due: dueByMonth[mKey] ?? 0,
    };
  });

  // Pizza: status breakdown
  let pago = 0;
  let mesPago = 0;
  let parcial = 0;
  let pendente = 0;
  let vencido = 0;

  allSales.forEach((s) => {
    const info = getSalePaymentInfo(s);
    switch (info.displayStatus) {
      case 'pago':
        pago += 1;
        break;
      case 'mes_pago':
        mesPago += 1;
        break;
      case 'parcial':
        parcial += 1;
        break;
      case 'pendente':
        pendente += 1;
        break;
      case 'vencido':
        vencido += 1;
        break;
    }
  });

  const statusBreakdown = [
    { label: 'Pago', value: pago, color: lightColors.chartGreen },
    { label: 'Mês Pago', value: mesPago, color: lightColors.chartBlue },
    { label: 'Parcial', value: parcial, color: lightColors.chartCyan },
    { label: 'Pendente', value: pendente, color: lightColors.chartAmber },
    { label: 'Vencido', value: vencido, color: lightColors.chartRed },
  ].filter((s) => s.value > 0);

  // Top produtos (por quantidade total vendida)
  const productCount: Record<string, { count: number; product_id: string | null }> = {};
  allSales.forEach((sale: any) => {
    (sale.sale_items ?? []).forEach((item: any) => {
      const name = item.product_name ?? 'Sem nome';
      const pid = item.product_id || productIdByName[name.trim().toLowerCase()] || null;
      if (!productCount[name]) {
        productCount[name] = { count: 0, product_id: pid };
      }
      productCount[name].count += (item.quantity ?? 1);
      if (!productCount[name].product_id && pid) {
        productCount[name].product_id = pid;
      }
    });
  });
  const topProducts = Object.entries(productCount)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([name, data]) => ({ name, count: data.count, product_id: data.product_id }));

  // Top devedores
  const debtByClient: Record<string, { name: string; amount: number; client_id: string }> = {};

  allSales
    .filter((s: any) => s.status !== 'pago' && (s.due_amount ?? 0) > 0)
    .forEach((s: any) => {
      const cid = s.client_id;
      if (!cid) return;
      const clientName = Array.isArray(s.clients)
        ? s.clients[0]?.name ?? 'Desconhecido'
        : s.clients?.name ?? 'Desconhecido';

      if (!debtByClient[cid]) {
        debtByClient[cid] = { name: clientName, amount: 0, client_id: cid };
      }
      debtByClient[cid].amount += s.due_amount ?? 0;
    });

  const topDebtors = Object.values(debtByClient)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const totalVolume = allSales.reduce(
    (acc, s) => acc + (s.total_amount ?? ((s.paid_amount ?? 0) + (s.due_amount ?? 0))),
    0
  );
  const averageTicket = allSales.length > 0 ? totalVolume / allSales.length : 0;

  return {
    totalReceived,
    totalDue,
    totalSales: allSales.length,
    averageTicket,
    monthlySales,
    timelineData,
    receivedByMonth,
    dueByMonth,
    statusBreakdown,
    topProducts,
    topDebtors,
  };
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardStats,
  });
}