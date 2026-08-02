export function normalizeBadgeNumber(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
