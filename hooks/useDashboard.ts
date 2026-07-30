import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DashboardStats } from '@/types';
import { lightColors } from '@/constants/theme';
import { calculateInstallmentsDetail, isOverdue } from '@/utils/format';

async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Uma única consulta unificada buscando vendas, nome do cliente e itens da venda
  const { data, error } = await supabase
    .from('sales')
    .select('id, total_amount, paid_amount, due_amount, due_date, status, created_at, installments, client_id, clients(name), sale_items(product_name, quantity)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const allSales = data ?? [];
  const monthlySalesData = allSales.filter((s) => (s.created_at ?? '') >= startOfMonth);

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
      new Date(s.created_at)
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

  // Pizza: status breakdown (incluindo Vencido)
  const isSaleOverdue = (s: any) => {
    if (s.status === 'pago') return false;
    if (s.due_date) return isOverdue(s.due_date);
    const details = calculateInstallmentsDetail(
      s.total_amount ?? 0,
      s.paid_amount ?? 0,
      s.installments ?? 1,
      new Date(s.created_at)
    );
    return details.some((inst) => inst.status !== 'pago' && isOverdue(inst.dueDate));
  };

  const pago = allSales.filter((s) => s.status === 'pago').length;
  const vencido = allSales.filter((s) => isSaleOverdue(s)).length;
  const parcial = allSales.filter((s) => s.status === 'parcial' && !isSaleOverdue(s)).length;
  const pendente = allSales.filter((s) => s.status === 'pendente' && !isSaleOverdue(s)).length;

  const statusBreakdown = [
    { label: 'Pago', value: pago, color: lightColors.chartGreen },
    { label: 'Parcial', value: parcial, color: lightColors.chartCyan },
    { label: 'Pendente', value: pendente, color: lightColors.chartAmber },
    { label: 'Vencido', value: vencido, color: lightColors.chartRed },
  ].filter((s) => s.value > 0);

  // Top produtos (por quantidade total vendida)
  const productCount: Record<string, number> = {};
  allSales.forEach((sale: any) => {
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
    staleTime: 2 * 60 * 1000, // 2 minutos para o dashboard
  });
}