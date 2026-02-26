import { z } from 'zod';

export type ZoneType = 'district' | 'mo';

export type Zone = {
  id: string;
  type: ZoneType;
  name: string;
  parentDistrictId: string | null;
};

export type Company = {
  id: string;
  name: string;
  site: string;
};

export type Coverage = {
  companyId: string;
  zoneId: string;
};

export type Note = {
  entityType: 'zone' | 'company' | 'coverage';
  entityId: string;
  text: string;
  updatedAt: string;
};

const ZoneSchema = z.object({
  id: z.string().min(1),
  type: z.union([z.literal('district'), z.literal('mo')]),
  name: z.string().min(1),
  parentDistrictId: z.string().nullable()
});

const CompanySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  site: z.string().min(1)
});

const CoverageSchema = z.object({
  companyId: z.string().min(1),
  zoneId: z.string().min(1)
});

const NoteSchema = z.object({
  entityType: z.union([z.literal('zone'), z.literal('company'), z.literal('coverage')]),
  entityId: z.string().min(1),
  text: z.string().min(1),
  updatedAt: z.string().min(1)
});

export const Schemas = {
  zones: z.array(ZoneSchema),
  companies: z.array(CompanySchema),
  coverage: z.array(CoverageSchema),
  notes: z.array(NoteSchema)
};

// ВАЖНО: пути БЕЗ ведущего "/" (GitHub Pages открывает сайт в подпапке /<repo>/)
const DATA_BASE = 'data';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Не удалось загрузить ${path} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function loadData() {
  const [zonesRaw, companiesRaw, coverageRaw, notesRaw] = await Promise.all([
    fetchJson<unknown>(`${DATA_BASE}/zones.json`),
    fetchJson<unknown>(`${DATA_BASE}/companies.json`),
    fetchJson<unknown>(`${DATA_BASE}/coverage.json`),
    // notes опционален
    fetch(`${DATA_BASE}/notes.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
  ]);

  const zones = Schemas.zones.parse(zonesRaw);
  const companies = Schemas.companies.parse(companiesRaw);
  const coverage = Schemas.coverage.parse(coverageRaw);

  const notes = Array.isArray(notesRaw) ? Schemas.notes.safeParse(notesRaw).data ?? [] : [];

  return { zones, companies, coverage, notes };
}
