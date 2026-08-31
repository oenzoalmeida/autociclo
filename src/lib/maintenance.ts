// Lógica de domínio de manutenções e AutoCiclo Score.

import type { Database } from '@/lib/database.types';

type MaintenanceItem = Database['public']['Tables']['vehicle_maintenance_items']['Row'];
type MileageRecord = Database['public']['Tables']['mileage_records']['Row'];

export type ItemStatus = 'em_dia' | 'atencao' | 'atrasado' | 'sem_info';

export interface ItemComputed {
  status: ItemStatus;
  dueKm: number | null;
  dueDate: string | null;
  kmDistance: number | null; // km restantes (positivo) ou excedidos (negativo)
  daysLeft: number | null; // dias restantes (positivo) ou excedidos (negativo)
  urgency: number; // menor = mais urgente (para ordenação)
  estimated: boolean; // se usa estimativa geral (sem histórico completo)
}

const WARN_PCT = 0.9; // entra em atenção quando passa 90% do intervalo

export function computeItem(
  item: MaintenanceItem,
  currentMileage: number
): ItemComputed {
  const hasKm = item.last_done_mileage !== null && item.interval_km;
  const hasTime = item.last_done_date && item.interval_months;

  let status: ItemStatus = 'sem_info';
  let dueKm: number | null = null;
  let dueDate: string | null = null;
  let kmDistance: number | null = null;
  let daysLeft: number | null = null;

  if (!hasKm && !hasTime) {
    if (!item.last_done_date && item.last_done_mileage === null) {
      return { status: 'sem_info', dueKm: null, dueDate: null, kmDistance: null, daysLeft: null, urgency: 1e9, estimated: item.origin === 'referencia_geral' };
    }
  }

  // Próxima previsão por quilometragem
  if (hasKm) {
    dueKm = (item.last_done_mileage as number) + (item.interval_km as number);
    kmDistance = dueKm - currentMileage;
    if (kmDistance < 0) status = 'atrasado';
    else if (kmDistance <= (kmDistance >= 0 ? item.interval_km! * (1 - WARN_PCT) : 0)) {
      // dentro da janela de atenção
    }
  }

  // Próxima previsão por tempo
  let timeStatus: ItemStatus | null = null;
  if (hasTime) {
    const last = new Date(item.last_done_date as string);
    const due = new Date(last);
    due.setMonth(due.getMonth() + (item.interval_months as number));
    dueDate = due.toISOString().slice(0, 10);
    daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) timeStatus = 'atrasado';
    else if (daysLeft <= (item.interval_months! * 30 * (1 - WARN_PCT))) timeStatus = 'atencao';
    else timeStatus = 'em_dia';
  }

  // Combina produtório de respostas
  if (!kmDistance && !daysLeft) {
    status = 'sem_info';
  } else {
    const candidates: ItemStatus[] = [];
    if (kmDistance !== null) {
      candidates.push(kmDistance < 0 ? 'atrasado' : kmDistance <= item.interval_km! * (1 - WARN_PCT) ? 'atencao' : 'em_dia');
    }
    if (daysLeft !== null && timeStatus) candidates.push(timeStatus);

    if (candidates.includes('atrasado')) status = 'atrasado';
    else if (candidates.includes('atencao')) status = 'atencao';
    else status = 'em_dia';
  }

  // Urgência: quanto menor, mais prioritário
  let urgency = 1e9;
  if (status === 'atrasado') urgency = Math.min(kmDistance ?? 1e9, daysLeft ?? 1e9);
  else if (status === 'atencao') urgency = 1e6 + Math.min(kmDistance ?? 1e9, daysLeft ?? 1e9);
  else if (status === 'em_dia') urgency = 2e6 + Math.min(kmDistance ?? 1e9, daysLeft ?? 1e9);

  return { status, dueKm, dueDate, kmDistance, daysLeft, urgency, estimated: item.origin === 'referencia_geral' };
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  em_dia: 'Em dia',
  atencao: 'Atenção',
  atrasado: 'Atrasado',
  sem_info: 'Sem informações',
};

export function statusColor(status: ItemStatus): string {
  switch (status) {
    case 'em_dia':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'atencao':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'atrasado':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export const ORIGIN_LABEL: Record<string, string> = {
  fabricante: 'Fabricante',
  referencia_geral: 'Referência geral',
  personalizada: 'Personalizada',
};

export function originLabel(origin: string | null | undefined): string {
  if (!origin) return 'Referência geral';
  return ORIGIN_LABEL[origin] ?? origin;
}

export const USAGE_TYPES = [
  { v: 'urbano_leve', l: 'Urbano leve' },
  { v: 'urbano_intenso', l: 'Urbano intenso / trânsito frequente' },
  { v: 'rodoviario', l: 'Rodoviário' },
  { v: 'estrada_terra', l: 'Estrada de terra' },
  { v: 'comercial', l: 'Comercial / aplicativo' },
  { v: 'misto', l: 'Misto' },
  { v: 'personalizado', l: 'Personalizado' },
];

export function usageLabel(value: string | null | undefined): string {
  if (!value) return 'Misto';
  return USAGE_TYPES.find((u) => u.v === value)?.l ?? value;
}

// Velocidade média de uso (km/mês) a partir dos registros de km
export function estimateMonthlyKm(records: MileageRecord[], currentMileage: number): number | null {
  const recs = [...records]
    .filter((r) => !r.correction)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  if (recs.length < 2) {
    return null;
  }
  const first = recs[0];
  const last = recs[recs.length - 1];
  const months = (new Date(last.recorded_at).getTime() - new Date(first.recorded_at).getTime()) /
    (1000 * 60 * 60 * 24 * 30.44);
  if (months <= 0) return null;
  const kmDiff = currentMileage - first.previous_mileage;
  if (kmDiff <= 0) return null;
  return kmDiff / months;
}

// AutoCiclo Score — representa apenas o nível de acompanhamento das manutenções
// registradas no sistema. NÃO é diagnóstico mecânico.
export function computeScore(items: ItemComputed[]): { score: number; label: string; tone: 'green' | 'amber' | 'red' } {
  if (items.length === 0) return { score: 100, label: 'Aguardando registros', tone: 'green' };

  let total = 0;
  const known = items.filter((i) => i.status !== 'sem_info');
  if (known.length === 0) return { score: 60, label: 'Registre suas manutenções', tone: 'amber' };

  const unknownWeight = items.length - known.length;
  const maxWeight = known.length + unknownWeight;

  for (const item of known) {
    if (item.status === 'em_dia') total += 1;
    else if (item.status === 'atencao') total += 0.55;
    else if (item.status === 'atrasado') total += 0.15;
  }
  // itens sem informação pontuam parcialmente, incentivando preencher
  total += unknownWeight * 0.4;

  const score = Math.round((total / maxWeight) * 100);

  if (score >= 80) return { score, label: 'Tudo em dia', tone: 'green' };
  if (score >= 55) return { score, label: 'Atenção', tone: 'amber' };
  return { score, label: 'Manutenção necessária', tone: 'red' };
}

export const CATEGORY_OPTIONS = [
  'Motor',
  'Freios',
  'Rodagem',
  'Transmissão',
  'Suspensão',
  'Elétrica',
  'Conforto',
  'Documentação',
];

// Descrições em linguagem simples para explicações
export const MAINTENANCE_EXPLAIN: Record<string, string> = {
  'Óleo do motor': 'Lubrifica as peças internas do motor, reduzindo o atrito e o desgaste. Por que isso importa? A troca no prazo ajuda a evitar danos caros ao motor.',
  'Fluido de freio': 'Ajuda a transmitir a força aplicada no pedal para o sistema de frenagem. Por que isso importa? Com fluido velho, o freio pode demorar mais para responder.',
  'Pastilhas de freio': 'Fazem pressão nos discos para parar o veículo. Por que isso importa? Pastilhas gastas aumentam a distância de frenagem.',
  'Correia dentada': 'Sincroniza o funcionamento do motor. Por que isso importa? Se romper, pode causar um prejuízo muito maior e caro.',
  'Rodízio dos pneus': 'Alterna a posição dos pneus para que se desgastem de forma uniforme. Por que isso importa? Pneus duram mais e o carro fica mais estável.',
};
