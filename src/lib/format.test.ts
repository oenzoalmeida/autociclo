import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatDateDayMonth,
  parseLocalCalendarDate,
} from './format';

describe('date-only fields from Supabase', () => {
  it('keeps a date in its calendar month, not UTC midnight', () => {
    const day = parseLocalCalendarDate('2026-11-01');
    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 10, 1]);
  });

  it('renders the same calendar day in all date labels', () => {
    expect(formatDate('2026-11-01')).toBe('01/11/2026');
    expect(formatDateShort('2026-11-01')).toContain('nov.');
    expect(formatDateDayMonth('2026-11-01')).toContain('NOV.');
  });

  it('does not reinterpret an existing ISO timestamp as a date-only field', () => {
    expect(parseLocalCalendarDate('2026-11-01T03:00:00Z').toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });

  it('preserves a date on the first day of the year', () => {
    expect(formatDate('2027-01-01')).toBe('01/01/2027');
  });
});
