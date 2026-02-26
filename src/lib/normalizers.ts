import type { Coverage } from './dataLoader';

export function normalizeCoverage(items: Coverage[]): Coverage[] {
  const seen = new Set<string>();
  const out: Coverage[] = [];

  for (const it of items) {
    const companyId = it.companyId.trim();
    const zoneId = it.zoneId.trim();
    if (!companyId || !zoneId) continue;

    const key = `${companyId}::${zoneId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ companyId, zoneId });
  }

  return out;
}
