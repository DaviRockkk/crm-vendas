// Formata valor para moeda BRL
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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

// Formata telefone brasileiro (ex: (11) 99999-9999)
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// Gera URL do WhatsApp a partir do telefone
export function getWhatsAppUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  // Adiciona DDI Brasil se não tiver
  const number = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${number}`;
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
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}
