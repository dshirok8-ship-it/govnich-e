import Papa from 'papaparse';
import type { Coverage } from './dataLoader';

export type CsvCoverageRow = {
  companyId: string;
  zoneId: string;
};

export type CsvParseResult = {
  rows: Coverage[];
  errors: string[];
};

export function parseCoverageCsv(text: string): CsvParseResult {
  const errors: string[] = [];

  const parsed = Papa.parse<CsvCoverageRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v)
  });

  if (parsed.errors?.length) {
    for (const e of parsed.errors) errors.push(`CSV: ${e.message}`);
  }

  const rows: Coverage[] = [];
  for (const r of parsed.data ?? []) {
    const companyId = (r.companyId ?? '').trim();
    const zoneId = (r.zoneId ?? '').trim();
    if (!companyId || !zoneId) continue;
    rows.push({ companyId, zoneId });
  }

  if (!rows.length) errors.push('CSV: не найдено ни одной строки формата companyId,zoneId');

  return { rows, errors };
}
