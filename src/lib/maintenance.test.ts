import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeItem, computeScore, estimateMonthlyKm, type ItemComputed, type ItemStatus } from './maintenance';
import type { Database } from './database.types';

type Item = Database['public']['Tables']['vehicle_maintenance_items']['Row'];
type Mileage = Database['public']['Tables']['mileage_records']['Row'];

// Data fixa para os testes que dependem de prazo. Sem isso o resultado muda
// conforme o dia em que a suíte roda.
const HOJE = new Date('2026-06-15T00:00:00Z');

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

function mileage(overrides: Partial<Mileage> = {}): Mileage {
  return {
    id: '1',
    vehicle_id: 'v1',
    user_id: 'u1',
    mileage: 10000,
    previous_mileage: 9000,
    correction: false,
    note: null,
    recorded_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// Item com intervalo de 10.000 km feito aos 40.000: vence aos 50.000 e entra
// em atenção a partir dos 49.000 (10% restantes).
const porKm = (currentMileage: number) =>
  computeItem(item({ last_done_mileage: 40000, interval_km: 10000 }), currentMileage);

// Item com intervalo de 6 meses: entra em atenção nos últimos 18 dias.
const porTempo = (lastDoneDate: string) =>
  computeItem(item({ last_done_date: lastDoneDate, interval_months: 6 }), 0);

describe('computeItem — sem dados suficientes', () => {
  it('retorna sem_info quando não há nenhum registro', () => {
    const c = computeItem(item(), 50000);
    expect(c.status).toBe('sem_info');
    expect(c.dueKm).toBeNull();
    expect(c.dueDate).toBeNull();
  });

  it('retorna sem_info quando há data mas não há intervalo', () => {
    expect(computeItem(item({ last_done_date: '2026-01-01' }), 50000).status).toBe('sem_info');
  });

  it('retorna sem_info quando há quilometragem mas não há intervalo', () => {
    expect(computeItem(item({ last_done_mileage: 40000 }), 50000).status).toBe('sem_info');
  });
});

describe('computeItem — previsão por quilometragem', () => {
  it('em_dia quando ainda falta mais de 10% do intervalo', () => {
    const c = porKm(45000);
    expect(c.status).toBe('em_dia');
    expect(c.dueKm).toBe(50000);
    expect(c.kmDistance).toBe(5000);
  });

  it('em_dia um quilômetro antes da janela de atenção', () => {
    expect(porKm(48999).status).toBe('em_dia');
  });

  it('atencao exatamente no limiar de 10% restantes', () => {
    // Regressão: com o limiar escrito como 1 - 0.9 (0.09999999999999998),
    // faltar exatamente 1.000 km de um intervalo de 10.000 caía em em_dia.
    const c = porKm(49000);
    expect(c.kmDistance).toBe(1000);
    expect(c.status).toBe('atencao');
  });

  it('atencao dentro da janela', () => {
    expect(porKm(49500).status).toBe('atencao');
  });

  it('atencao quando o veículo está exatamente na quilometragem prevista', () => {
    // Regressão: a combinação testava `!kmDistance`, então faltar 0 km caía
    // em sem_info e o item sumia do alerta justamente no dia de vencer.
    const c = porKm(50000);
    expect(c.kmDistance).toBe(0);
    expect(c.status).toBe('atencao');
  });

  it('atrasado a partir do primeiro quilômetro além do previsto', () => {
    expect(porKm(50001).status).toBe('atrasado');
  });

  it('atrasado com a distância negativa preservada', () => {
    const c = porKm(51000);
    expect(c.status).toBe('atrasado');
    expect(c.kmDistance).toBe(-1000);
  });
});

describe('computeItem — previsão por tempo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HOJE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('em_dia logo após a manutenção', () => {
    const c = porTempo('2026-06-15');
    expect(c.status).toBe('em_dia');
    expect(c.dueDate).toBe('2026-12-15');
    expect(c.daysLeft).toBe(183);
  });

  it('atencao nos últimos dias do intervalo', () => {
    const c = porTempo('2025-12-25');
    expect(c.daysLeft).toBe(10);
    expect(c.status).toBe('atencao');
  });

  it('atencao no dia exato do vencimento', () => {
    // Mesma regressão do `!daysLeft`: vencer hoje é informação, não ausência dela.
    const c = porTempo('2025-12-15');
    expect(c.daysLeft).toBe(0);
    expect(c.status).toBe('atencao');
  });

  it('atrasado depois do vencimento', () => {
    const c = porTempo('2025-12-01');
    expect(c.dueDate).toBe('2026-05-31');
    expect(c.daysLeft).toBe(-15);
    expect(c.status).toBe('atrasado');
  });

  it('documenta o transbordo de mês do JavaScript em datas no fim do mês', () => {
    // 31/01 + 1 mês não vira 28/02: o Date avança para 03/03. Comportamento
    // atual, registrado aqui para que qualquer mudança seja deliberada.
    const c = computeItem(item({ last_done_date: '2026-01-31', interval_months: 1 }), 0);
    expect(c.dueDate).toBe('2026-03-03');
  });
});

describe('computeItem — combinação de km e tempo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HOJE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('vale o pior dos dois: km em dia e prazo vencido dá atrasado', () => {
    const c = computeItem(
      item({ last_done_mileage: 40000, interval_km: 10000, last_done_date: '2025-06-15', interval_months: 6 }),
      42000
    );
    expect(c.status).toBe('atrasado');
  });

  it('vale o pior dos dois: km estourado e prazo em dia dá atrasado', () => {
    const c = computeItem(
      item({ last_done_mileage: 40000, interval_km: 10000, last_done_date: '2026-06-15', interval_months: 6 }),
      60000
    );
    expect(c.status).toBe('atrasado');
  });

  it('atencao prevalece sobre em_dia', () => {
    const c = computeItem(
      item({ last_done_mileage: 40000, interval_km: 10000, last_done_date: '2026-06-15', interval_months: 6 }),
      49500
    );
    expect(c.status).toBe('atencao');
  });

  it('em_dia só quando os dois estão em dia', () => {
    const c = computeItem(
      item({ last_done_mileage: 40000, interval_km: 10000, last_done_date: '2026-06-15', interval_months: 6 }),
      45000
    );
    expect(c.status).toBe('em_dia');
  });
});

describe('computeItem — urgência e origem', () => {
  it('ordena atrasado antes de atencao, e atencao antes de em_dia', () => {
    const urgencias = [porKm(51000), porKm(49500), porKm(45000)].map((c) => c.urgency);
    expect(urgencias[0]).toBeLessThan(urgencias[1]);
    expect(urgencias[1]).toBeLessThan(urgencias[2]);
  });

  it('marca como estimativa quando o intervalo vem da referência geral', () => {
    expect(porKm(45000).estimated).toBe(true);
  });

  it('não marca como estimativa quando o intervalo é do fabricante', () => {
    const c = computeItem(
      item({ last_done_mileage: 40000, interval_km: 10000, origin: 'fabricante' }),
      45000
    );
    expect(c.estimated).toBe(false);
  });
});

describe('computeScore', () => {
  it('100 quando ainda não há itens cadastrados', () => {
    const s = computeScore([]);
    expect(s.score).toBe(100);
    expect(s.tone).toBe('green');
  });

  it('60 e tom de atenção quando nenhum item tem informação', () => {
    const s = computeScore([computed('sem_info'), computed('sem_info')]);
    expect(s.score).toBe(60);
    expect(s.tone).toBe('amber');
  });

  it('pontua integralmente um item em dia', () => {
    const s = computeScore([computed('em_dia')]);
    expect(s.score).toBe(100);
    expect(s.tone).toBe('green');
  });

  it('item em atenção vale 55% do peso', () => {
    expect(computeScore([computed('atencao')]).score).toBe(55);
  });

  it('item atrasado vale 15% do peso', () => {
    const s = computeScore([computed('atrasado')]);
    expect(s.score).toBe(15);
    expect(s.tone).toBe('red');
  });

  it('item sem informação entra na média com peso parcial', () => {
    // (1 + 0.4) / 2 = 0.7
    expect(computeScore([computed('em_dia'), computed('sem_info')]).score).toBe(70);
  });

  it('um atrasado entre três em dia derruba o tom para atenção', () => {
    // (3 + 0.15) / 4 = 0.7875 -> 79, logo abaixo do corte de 80
    const s = computeScore([computed('em_dia'), computed('em_dia'), computed('em_dia'), computed('atrasado')]);
    expect(s.score).toBe(79);
    expect(s.tone).toBe('amber');
  });

  it('mantém o tom verde quando o atrasado é diluído', () => {
    // (4 + 0.15) / 5 = 0.83
    const s = computeScore([
      computed('em_dia'), computed('em_dia'), computed('em_dia'), computed('em_dia'), computed('atrasado'),
    ]);
    expect(s.score).toBe(83);
    expect(s.tone).toBe('green');
  });
});

describe('estimateMonthlyKm', () => {
  it('retorna null com menos de dois registros', () => {
    expect(estimateMonthlyKm([], 50000)).toBeNull();
    expect(estimateMonthlyKm([mileage()], 10000)).toBeNull();
  });

  it('calcula a média mensal entre o primeiro e o último registro', () => {
    const records = [
      mileage({ recorded_at: '2026-01-01T00:00:00Z', mileage: 10000, previous_mileage: 9000 }),
      mileage({ id: '2', recorded_at: '2026-03-01T00:00:00Z', mileage: 11200, previous_mileage: 10000 }),
    ];
    // 2.200 km rodados em ~1,94 mês
    expect(Math.round(estimateMonthlyKm(records, 11200)!)).toBe(1135);
  });

  it('ignora registros marcados como correção', () => {
    const records = [
      mileage({ id: 'c', recorded_at: '2024-01-01T00:00:00Z', mileage: 1, previous_mileage: 0, correction: true }),
      mileage({ recorded_at: '2026-01-01T00:00:00Z', mileage: 10000, previous_mileage: 9000 }),
      mileage({ id: '2', recorded_at: '2026-03-01T00:00:00Z', mileage: 11200, previous_mileage: 10000 }),
    ];
    // Se a correção de 2024 entrasse na conta, a média despencaria.
    expect(Math.round(estimateMonthlyKm(records, 11200)!)).toBe(1135);
  });

  it('retorna null quando não houve quilometragem rodada', () => {
    const records = [
      mileage({ recorded_at: '2026-01-01T00:00:00Z', mileage: 10000, previous_mileage: 10000 }),
      mileage({ id: '2', recorded_at: '2026-03-01T00:00:00Z', mileage: 10000, previous_mileage: 10000 }),
    ];
    expect(estimateMonthlyKm(records, 10000)).toBeNull();
  });

  it('retorna null quando os registros são do mesmo instante', () => {
    const records = [
      mileage({ recorded_at: '2026-01-01T00:00:00Z', mileage: 10000, previous_mileage: 9000 }),
      mileage({ id: '2', recorded_at: '2026-01-01T00:00:00Z', mileage: 11000, previous_mileage: 10000 }),
    ];
    expect(estimateMonthlyKm(records, 11000)).toBeNull();
  });
});
