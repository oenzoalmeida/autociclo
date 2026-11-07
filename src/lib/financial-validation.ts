/** Input validation for client-side financial forms (also enforced by the database). */
export function isPositiveFiniteNumber(input: string): boolean {
  const value = input.trim();
  return value.length > 0 && Number.isFinite(Number(value)) && Number(value) > 0;
}

export function isNonNegativeOrEmptyNumber(input: string): boolean {
  const value = input.trim();
  return value.length === 0 || (Number.isFinite(Number(value)) && Number(value) >= 0);
}
