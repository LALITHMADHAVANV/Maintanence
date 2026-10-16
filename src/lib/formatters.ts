/**
 * Utility functions for Indian Rupee (₹) formatting across Sahana CMMS
 */

export function formatRupee(
  amount: number | undefined | null,
  options?: { decimals?: boolean }
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  const showDecimals = options?.decimals ?? (amount % 1 !== 0);
  return (
    '₹' +
    amount.toLocaleString('en-IN', {
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 2,
    })
  );
}

export function formatAssetLocation(m?: {
  unit?: string;
  area?: string;
  currentLine?: string;
  stationNo?: string;
  department?: string;
} | null): string {
  if (!m) return 'Unknown Location';

  const parts: string[] = [];

  // 1. Plant Unit
  if (m.unit && m.unit !== 'Unassigned Unit') {
    parts.push(m.unit);
  }

  // 2. Area / Zone / Line / Department
  const primaryArea =
    m.area && m.area !== 'Unassigned Area'
      ? m.area
      : m.currentLine && m.currentLine !== 'Unassigned Line'
      ? m.currentLine
      : m.department;

  if (primaryArea) {
    parts.push(primaryArea);
  }

  // If currentLine is distinct from area, not the stale fallback 'Line 01', and not already in parts
  if (
    m.currentLine &&
    m.area &&
    m.currentLine !== m.area &&
    m.currentLine !== 'Line 01' &&
    !parts.includes(m.currentLine)
  ) {
    parts.push(m.currentLine);
  }

  // 3. Station / Bay
  if (m.stationNo && m.stationNo !== 'Unassigned Station') {
    parts.push(m.stationNo);
  }

  if (parts.length > 0) {
    return parts.join(' • ');
  }

  return m.currentLine || 'Line 01';
}
