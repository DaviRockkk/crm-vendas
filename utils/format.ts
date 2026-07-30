// Formata valor para moeda BRL
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Mascara dinamica de moeda (ex: digita 3,5,0,0 -> "35,00")
export function maskCurrency(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  const numeric = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

// Converte string mascarada ou digitada para number float (ex: "35,00" -> 35.00)
export function parseCurrency(input: string): number {
  const digits = input.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

// Retorna a data atual no formato YYYY-MM-DD
export function getTodayDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Retorna o próximo dia 5 no formato YYYY-MM-05 (sempre dia 5 de cada mês)
export function getDefaultDueDate(referenceDate: Date = new Date()): string {
  const date = new Date(referenceDate);
  const currentDay = date.getDate();
  let targetYear = date.getFullYear();
  let targetMonth = date.getMonth(); // 0-indexed

  if (currentDay > 5) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  const monthStr = String(targetMonth + 1).padStart(2, '0');
  return `${targetYear}-${monthStr}-05`;
}

// Retorna uma lista de datas de vencimento no dia 5 para N parcelas
export function getInstallmentDueDates(count: number = 1, referenceDate: Date = new Date()): string[] {
  const dates: string[] = [];
  const date = new Date(referenceDate);
  const currentDay = date.getDate();
  let startYear = date.getFullYear();
  let startMonth = date.getMonth();

  if (currentDay > 5) {
    startMonth += 1;
  }

  for (let i = 0; i < count; i++) {
    const targetDate = new Date(startYear, startMonth + i, 5);
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    dates.push(`${y}-${m}-05`);
  }

  return dates;
}

export interface InstallmentDetail {
  number: number;
  total: number;
  paid: number;
  remaining: number;
  percentage: number;
  dueDate: string;
  status: 'pago' | 'parcial' | 'pendente';
}

// Calcula o detalhamento e progresso de cada parcela com base no valor total pago
export function calculateInstallmentsDetail(
  totalAmount: number,
  paidAmount: number,
  installmentsCount: number = 1,
  referenceDate: Date = new Date()
): InstallmentDetail[] {
  const count = Math.max(1, installmentsCount);
  const dueDates = getInstallmentDueDates(count, referenceDate);
  const baseValue = totalAmount > 0 ? totalAmount / count : 0;

  let remainingPaid = Math.max(0, paidAmount);

  return dueDates.map((dueDate, idx) => {
    const isLast = idx === count - 1;
    const installmentTotal = isLast
      ? Math.max(0, totalAmount - baseValue * (count - 1))
      : baseValue;

    const paidForThis = Math.min(installmentTotal, Math.max(0, remainingPaid));
    remainingPaid = Math.max(0, remainingPaid - paidForThis);

    const remaining = Math.max(0, installmentTotal - paidForThis);
    const percentage = installmentTotal > 0
      ? Math.min(100, Math.max(0, (paidForThis / installmentTotal) * 100))
      : 100;

    let status: 'pago' | 'parcial' | 'pendente' = 'pendente';
    if (percentage >= 99.9) {
      status = 'pago';
    } else if (percentage > 0) {
      status = 'parcial';
    }

    return {
      number: idx + 1,
      total: installmentTotal,
      paid: paidForThis,
      remaining,
      percentage,
      dueDate,
      status,
    };
  });
}

// Formata data para pt-BR (ex: 20/07/2026)
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
  return date.toLocaleDateString('pt-BR');
}

// Formata data-hora (ex: 20/07/2026 às 19:30)
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Mascara dinamica de telefone BR (ex: (11) 99999-9999 ou (11) 3333-4444)
export function maskPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// Formata telefone brasileiro (ex: (11) 99999-9999)
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return maskPhone(phone);
}

// Gera URL do WhatsApp a partir do telefone
export function getWhatsAppUrl(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  // Adiciona DDI Brasil se não tiver
  const number = digits.startsWith('55') ? digits : `55${digits}`;
  const textParam = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${number}${textParam}`;
}

// Retorna label de status da venda
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pago: 'Pago',
    parcial: 'Parcial',
    pendente: 'Pendente',
  };
  return labels[status] ?? status;
}

// Retorna cores do status
export function getStatusColors(status: string, colors: any): { bg: string; text: string } {
  switch (status) {
    case 'pago':
      return { bg: colors.successLight, text: colors.successText };
    case 'parcial':
      return { bg: colors.warningLight, text: colors.warningText };
    case 'pendente':
      return { bg: colors.errorLight, text: colors.errorText };
    default:
      return { bg: colors.surfaceSecondary, text: colors.textSecondary };
  }
}

// Formata número compacto (ex: 1200 → 1,2K)
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

// Calcula se uma data está vencida
export function isOverdue(dueDateStr: string | null | undefined): boolean {
  if (!dueDateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T12:00:00');
  return due < today;
}

// Calcula dias até o vencimento
export function daysUntilDue(dueDateStr: string | null | undefined): number | null {
  if (!dueDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T12:00:00');
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Retorna mês/ano formatado (ex: "Jul/2026")
export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const date = new Date(year, month, 15);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}