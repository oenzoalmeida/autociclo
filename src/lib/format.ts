// Utilitários de formatação (pt-BR)

export function formatCurrency(value: number | null | undefined, currency = 'BRL'): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
}

export function formatKm(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${formatNumber(value)} km`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateDayMonth(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export function relativeDays(date: string): number {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

export function monthName(date: Date = new Date()): string {
  return date.toLocaleDateString('pt-BR', { month: 'long' });
}

/** Saudação por hora local: 00h-05h e 18h-23h "Boa noite"; 06h-11h "Bom dia"; 12h-17h "Boa tarde". */
export function greetingForHour(hour: number): string {
  if (hour >= 6 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
