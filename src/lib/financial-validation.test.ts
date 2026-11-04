import { describe, expect, it } from 'vitest';
import { isPositiveFiniteNumber, isNonNegativeOrEmptyNumber } from './financial-validation';

describe('financial entry validation', () => {
  it('accepts ordinary positive amounts', () => {
    expect(isPositiveFiniteNumber('5.95')).toBe(true);
    expect(isPositiveFiniteNumber('0.01')).toBe(true);
  });

  it('rejects zero, negative, empty and non-finite amounts', () => {
    for (const input of ['', ' ', '0', '-5', 'Infinity', '-Infinity', 'NaN', '1e309']) {
      expect(isPositiveFiniteNumber(input)).toBe(false);
    }
  });

  it('accepts empty or non-negative mileage and rejects invalid values', () => {
    for (const input of ['', '0', '100', '100.5']) {
      expect(isNonNegativeOrEmptyNumber(input)).toBe(true);
    }
    for (const input of ['-1', 'Infinity', 'NaN', '1e309']) {
      expect(isNonNegativeOrEmptyNumber(input)).toBe(false);
    }
  });
});
