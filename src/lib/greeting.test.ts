import { describe, it, expect } from 'vitest';
import { greetingForHour } from './format';

describe('greetingForHour', () => {
  it('madrugada (0h-5h) é Boa noite', () => {
    expect(greetingForHour(0)).toBe('Boa noite');
    expect(greetingForHour(3)).toBe('Boa noite');
    expect(greetingForHour(5)).toBe('Boa noite');
  });
  it('manhã (6h-11h) é Bom dia', () => {
    expect(greetingForHour(6)).toBe('Bom dia');
    expect(greetingForHour(11)).toBe('Bom dia');
  });
  it('tarde (12h-17h) é Boa tarde', () => {
    expect(greetingForHour(12)).toBe('Boa tarde');
    expect(greetingForHour(17)).toBe('Boa tarde');
  });
  it('noite (18h-23h) é Boa noite', () => {
    expect(greetingForHour(18)).toBe('Boa noite');
    expect(greetingForHour(23)).toBe('Boa noite');
  });
});
