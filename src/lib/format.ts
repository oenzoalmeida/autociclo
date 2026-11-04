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

/** A SQL DATE is a calendar day, not a midnight UTC timestamp. */
export function parseLocalCalendarDate(date: string): Date {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parts) return new Date(date);
  return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), 12);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  const d = parseLocalCalendarDate(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—';
  const d = parseLocalCalendarDate(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateDayMonth(date: string): string {
  const d = parseLocalCalendarDate(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export function relativeDays(date: string): number {
  const d = parseLocalCalendarDate(date);
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
