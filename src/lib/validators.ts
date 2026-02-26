import type { Company, Coverage, Zone } from './dataLoader';
import { isProbablyUrl } from './url';

export type ValidationIssue = {
  level: 'error' | 'warn';
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export function validateCompanies(companies: Company[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const c of companies) {
    if (ids.has(c.id)) issues.push({ level: 'error', code: 'company.duplicate_id', message: `Дубликат companyId: ${c.id}` });
    ids.add(c.id);

    if (!c.name.trim()) issues.push({ level: 'error', code: 'company.empty_name', message: `Пустое имя у companyId: ${c.id}` });

    if (!c.site.trim()) {
      issues.push({ level: 'warn', code: 'company.empty_site', message: `Пустой site у companyId: ${c.id}` });
    } else if (!isProbablyUrl(c.site)) {
      issues.push({ level: 'warn', code: 'company.bad_url', message: `Похож на неправильный URL у ${c.id}: ${c.site}` });
    }
  }

  return issues;
}

export function validateCoverage(coverage: Coverage[], companies: Company[], zones: Zone[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const companyIds = new Set(companies.map((c) => c.id));
  const zoneIds = new Set(zones.map((z) => z.id));

  const pairSeen = new Set<string>();
  for (const c of coverage) {
    const key = `${c.companyId}::${c.zoneId}`;
    if (pairSeen.has(key)) {
      issues.push({
        level: 'error',
        code: 'coverage.duplicate_pair',
        message: `Дубликат пары coverage: (${c.companyId}, ${c.zoneId})`
      });
    }
    pairSeen.add(key);

    if (!companyIds.has(c.companyId)) {
      issues.push({
        level: 'error',
        code: 'coverage.unknown_company',
        message: `Неизвестный companyId в coverage: ${c.companyId}`,
        meta: { zoneId: c.zoneId }
      });
    }
    if (!zoneIds.has(c.zoneId)) {
      issues.push({
        level: 'error',
        code: 'coverage.unknown_zone',
        message: `Неизвестный zoneId в coverage: ${c.zoneId}`,
        meta: { companyId: c.companyId }
      });
    }
  }

  return issues;
}

export function validateZones(zones: Zone[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  for (const z of zones) {
    if (ids.has(z.id)) issues.push({ level: 'error', code: 'zone.duplicate_id', message: `Дубликат zoneId: ${z.id}` });
    ids.add(z.id);

    if (!z.name.trim()) issues.push({ level: 'error', code: 'zone.empty_name', message: `Пустое имя у zoneId: ${z.id}` });

    if (z.type === 'district' && z.parentDistrictId !== null) {
      issues.push({ level: 'warn', code: 'zone.district_parent', message: `У district не должен быть parentDistrictId: ${z.id}` });
    }
    if (z.type === 'mo' && !z.parentDistrictId) {
      issues.push({ level: 'error', code: 'zone.mo_missing_parent', message: `MO без parentDistrictId: ${z.id}` });
    }
  }

  return issues;
}
