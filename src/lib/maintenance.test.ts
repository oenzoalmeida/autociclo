import { describe, it, expect } from 'vitest';
import { computeItem, computeScore, estimateMonthlyKm, type ItemComputed, type ItemStatus } from './maintenance';
import type { Database } from './database.types';

type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];
type Mileage = Database['public']['Tables']['mileage_records']['Row'];

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    vehicle_id: 'v1',
    user_id: 'u1',
    catalog_id: null,
    custom_name: null,
    name: 'Óleo do motor',
    category: 'Motor',
    last_done_date: null,
    last_done_mileage: null,
    interval_km: null,
    interval_months: null,
    manual_interval: false,
    origin: 'referencia_geral',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function computed(status: ItemStatus, extra: Partial<ItemComputed> = {}): ItemComputed {
  return {
    status,
    dueKm: null,
    dueDate: null,
    kmDistance: null,
    daysLeft: null,
    urgency: 0,
    estimated: false,
    ...extra,
  };
}

describe('computeItem', () => {
  it('retorna sem_info quando não há dados', () => {
    const c = computeItem(item(), 50000);
    expect(c.status).toBe('sem_info');
  });

  it('em_dia quando a quilometragem ainda está distante do prazo', () => {
    const c = computeItem(item({ last_done_mileage: 40000, interval_km: 10000 }), 45000);
    expect(c.status).toBe('em_dia');
    expect(c.dueKm).toBe(50000);
  });

  it('atencao quando está perto do limite (>= 90% do intervalo)', () => {
    const c = computeItem(item({ last_done_mileage: 40000, interval_km: 10000 }), 49500);
    expect(c.status).toBe('atencao');
  });

  it('atrasado quando passou da quilometragem prevista', () => {
    const c = computeItem(item({ last_done_mileage: 40000, interval_km: 10000 }), 51000);
    expect(c.status).toBe('atrasado');
    expect(c.kmDistance).toBeLessThan(0);
  });

  it('marca como estimativa quando o intervalo não foi ajustado manualmente', () => {
    const c = computeItem(item({ last_done_mileage: 40000, interval_km: 10000 }), 45000);
    expect(c.estimated).toBe(true);
  });
});

describe('computeScore', () => {
  it('100 quando não há itens cadastrados', () => {
    expect(computeScore([]).score).toBe(100);
  });

  it('pontua itens em dia', () => {
    const s = computeScore([computed('em_dia')]);
    expect(s.score).toBe(100);
    expect(s.tone).toBe('green');
  });

  it('penaliza itens atrasados', () => {
    const s = computeScore([computed('atrasado')]);
    expect(s.score).toBeLessThan(100);
    expect(s.tone).toBe('red');
  });

  it('desconsidera itens sem informação na média, mas incentiva preencher', () => {
    const s = computeScore([computed('em_dia'), computed('sem_info')]);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThan(100);
  });
});

describe('estimateMonthlyKm', () => {
  it('retorna null com menos de 2 registros', () => {
    expect(estimateMonthlyKm([], 50000)).toBeNull();
  });

  it('calcula média mensal a partir do histórico', () => {
    const records: Mileage[] = [
      { id: '1', vehicle_id: 'v1', user_id: 'u1', mileage: 10000, previous_mileage: 9000, correction: false, note: null, recorded_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' },
      { id: '2', vehicle_id: 'v1', user_id: 'u1', mileage: 11200, previous_mileage: 10000, correction: false, note: null, recorded_at: '2026-03-01T00:00:00Z', created_at: '2026-03-01T00:00:00Z' },
    ];
    const avg = estimateMonthlyKm(records, 11200);
    expect(avg).not.toBeNull();
    expect(avg!).toBeGreaterThan(0);
  });
});
