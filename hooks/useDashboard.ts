import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DashboardStats } from '@/types';
import { lightColors } from '@/constants/theme';
import { calculateInstallmentsDetail } from '@/utils/format';

async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [salesRes, allSalesRes] = await Promise.all([
    supabase
      .from('sales')
      .select('*, sale_items(*)')
      .gte('created_at', startOfMonth),
    supabase
      .from('sales')
      .select('id, total_amount, paid_amount, due_amount, status, created_at, installments, client_id, sale_items(product_name, quantity)')
      .order('created_at', { ascending: false }),
  ]);

  const allSales = allSalesRes.data ?? [];
  const monthlySalesData = salesRes.data ?? [];

  // Totais globais
  const totalReceived = allSales.reduce((acc, s) => acc + (s.paid_amount ?? 0), 0);
  const totalDue = allSales
    .filter((s) => s.status !== 'pago')
    .reduce((acc, s) => acc + (s.due_amount ?? 0), 0);

  // Gráfico de linha: recebimentos por dia no mês
  const dailyMap: Record<string, number> = {};
  monthlySalesData.forEach((sale) => {
    const day = sale.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + (sale.paid_amount ?? 0);
  });
  const monthlySales = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  // Previsão e histórico comparativo por mês (Recebidos vs. A Receber)
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
      new Date(s.created_at)
    );

    details.forEach((inst) => {
      if (inst.status === 'pago' || inst.remaining <= 0) return;
      const mKey = inst.dueDate.slice(0, 7);
      dueByMonth[mKey] = (dueByMonth[mKey] ?? 0) + inst.remaining;
    });
  });

  const monthSet = new Set<string>([
    ...Object.keys(receivedByMonth),
    ...Object.keys(dueByMonth),
  ]);
  const sortedMonths = Array.from(monthSet).sort((a, b) => a.localeCompare(b));

  const timelineData = sortedMonths.map((mKey) => ({
    month: mKey,
    received: receivedByMonth[mKey] ?? 0,
    due: dueByMonth[mKey] ?? 0,
  }));

  // Pizza: status breakdown
  const pago = allSales.filter((s) => s.status === 'pago').length;
  const parcial = allSales.filter((s) => s.status === 'parcial').length;
  const pendente = allSales.filter((s) => s.status === 'pendente').length;
  const statusBreakdown = [
    { label: 'Pago', value: pago, color: lightColors.chartGreen },
    { label: 'Parcial', value: parcial, color: lightColors.chartAmber },
    { label: 'Pendente', value: pendente, color: lightColors.chartRed },
  ].filter((s) => s.value > 0);

  // Top produtos (por quantidade total vendida)
  const productCount: Record<string, number> = {};
  allSales.forEach((sale) => {
    (sale.sale_items ?? []).forEach((item: any) => {
      const name = item.product_name ?? 'Sem nome';
      productCount[name] = (productCount[name] ?? 0) + (item.quantity ?? 1);
    });
  });
  const topProducts = Object.entries(productCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Top devedores
  const debtByClient: Record<string, { name: string; amount: number; client_id: string }> = {};
  const clientsRes = await supabase.from('clients').select('id, name');
  const clientMap: Record<string, string> = {};
  (clientsRes.data ?? []).forEach((c: any) => {
    clientMap[c.id] = c.name;
  });

  allSales
    .filter((s) => s.status !== 'pago' && s.due_amount > 0)
    .forEach((s) => {
      const cid = s.client_id;
      if (!debtByClient[cid]) {
        debtByClient[cid] = { name: clientMap[cid] ?? 'Desconhecido', amount: 0, client_id: cid };
      }
      debtByClient[cid].amount += s.due_amount ?? 0;
    });

  const topDebtors = Object.values(debtByClient)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    totalReceived,
    totalDue,
    totalSales: allSales.length,
    monthlySales,
    timelineData,
    statusBreakdown,
    topProducts,
    topDebtors,
  };
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60 * 1000, // 2 minutos para o dashboard
  });
}