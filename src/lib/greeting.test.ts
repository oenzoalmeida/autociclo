import { describe, it, expect } from 'vitest';
import { greetingForHour } from './format';

describe('greetingForHour', () => {
  it('uses Boa noite from midnight until 05:59', () => {
    for (const hour of [0, 3, 5]) expect(greetingForHour(hour)).toBe('Boa noite');
  });
  it('uses Bom dia between 06:00 and 11:59', () => {
    for (const hour of [6, 11]) expect(greetingForHour(hour)).toBe('Bom dia');
  });
  it('uses Boa tarde between noon and 17:59', () => {
    for (const hour of [12, 17]) expect(greetingForHour(hour)).toBe('Boa tarde');
  });
  it('uses Boa noite from 18:00 through 23:59', () => {
    for (const hour of [18, 23]) expect(greetingForHour(hour)).toBe('Boa noite');
  });
});
