import React, { useEffect, useMemo, useState } from 'react';
import CompanySearchSelect from '../components/CompanySearchSelect';
import MapSvg from '../components/MapSvg';
import SidePanel from '../components/SidePanel';
import Legend from '../components/Legend';
import { loadData, type Company, type Coverage, type Zone } from '../lib/dataLoader';

export default function MapPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [zones, setZones] = useState<Zone[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);

  // UI state
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [hoverZoneId, setHoverZoneId] = useState<string | null>(null);

  // ВАЖНО: теперь это фильтр по ЗОНЕ (а не по району)
  const [districtFilterId, setDistrictFilterId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    loadData()
      .then((d) => {
        if (cancelled) return;
        setZones(d.zones);
        setCompanies(d.companies);
        setCoverage(d.coverage);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Ошибка загрузки данных');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const zoneById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  // ФИЛЬТР: используем все зоны (как “районы” фильтра), сортируем по имени
  const filterZones = useMemo(() => {
    return [...zones].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [zones]);

  // memo: zonesByCompany, companiesByZone
  const zonesByCompany = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of coverage) {
      const arr = m.get(c.companyId) ?? [];
      arr.push(c.zoneId);
      m.set(c.companyId, arr);
    }
    return m;
  }, [coverage]);

  const companiesByZone = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of coverage) {
      const arr = m.get(c.zoneId) ?? [];
      arr.push(c.companyId);
      m.set(c.zoneId, arr);
    }
    return m;
  }, [coverage]);

  const coveredZoneIds = useMemo(() => {
    if (!activeCompanyId) return new Set<string>();
    return new Set(zonesByCompany.get(activeCompanyId) ?? []);
  }, [activeCompanyId, zonesByCompany]);

  const activeCompany = activeCompanyId ? companyById.get(activeCompanyId) ?? null : null;
  const activeZone = activeZoneId ? zoneById.get(activeZoneId) ?? null : null;

  const companiesForZone = useMemo(() => {
    if (!activeZoneId) return [];
    const ids = companiesByZone.get(activeZoneId) ?? [];
    return ids.map((id) => companyById.get(id)).filter(Boolean) as Company[];
  }, [activeZoneId, companiesByZone, companyById]);

  const zonesForCompany = useMemo(() => {
    if (!activeCompanyId) return [];
    const ids = zonesByCompany.get(activeCompanyId) ?? [];
    return ids.map((id) => zoneById.get(id)).filter(Boolean) as Zone[];
  }, [activeCompanyId, zonesByCompany, zoneById]);

  const hoverTooltipText = useMemo(() => {
    if (!hoverZoneId) return null;
    const z = zoneById.get(hoverZoneId);
    if (!z) return null;
    const cnt = (companiesByZone.get(hoverZoneId) ?? []).length;
    return { name: z.name, id: z.id, count: cnt };
  }, [hoverZoneId, zoneById, companiesByZone]);

  function onPickCompany(id: string | null) {
    setActiveCompanyId(id);
  }

  function onPickZone(id: string) {
    setActiveZoneId(id);
  }

  if (loading) return <div className="muted">Загрузка данных…</div>;
  if (loadError) return <div className="errorBox">Ошибка: {loadError}</div>;

  return (
    <div className="layout">
      <aside className="left">
        <CompanySearchSelect
          companies={companies}
          value={activeCompanyId}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onChange={onPickCompany}
        />

        <div className="panel">
          <div className="panel__title">Фильтр по зоне</div>

          <select
            className="select"
            value={districtFilterId ?? ''}
            onChange={(e) => setDistrictFilterId(e.target.value ? e.target.value : null)}
          >
            <option value="">— все зоны —</option>
            {filterZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.id})
              </option>
            ))}
          </select>

          {districtFilterId ? (
            <button
              className="btn btn--ghost"
              type="button"
              style={{ marginTop: 8 }}
              onClick={() => setDistrictFilterId(null)}
            >
              Сбросить фильтр
            </button>
          ) : null}

          <div className="muted" style={{ marginTop: 8 }}>
            Всего зон: {filterZones.length}
          </div>
        </div>

        <Legend />

        <div className="panel">
          <div className="panel__title">Hover</div>
          {hoverTooltipText ? (
            <div>
              <div style={{ fontWeight: 600 }}>{hoverTooltipText.name}</div>
              <div className="muted">
                {hoverTooltipText.id} · УК: {hoverTooltipText.count}
              </div>
            </div>
          ) : (
            <div className="muted">Наведи на зону на карте</div>
          )}
        </div>
      </aside>

      <section className="center">
        <div className="mapHeader">
          <div className="muted">
            Подсветка: {activeCompany ? <strong>{activeCompany.name}</strong> : 'выбери УК слева'}
          </div>
        </div>

        <MapSvg
          zones={zones}
          coveredZoneIds={coveredZoneIds}
          activeZoneId={activeZoneId}
          hoverZoneId={hoverZoneId}
          districtFilterId={districtFilterId}
          onHoverZone={setHoverZoneId}
          onPickZone={onPickZone}
        />
      </section>

      <aside className="right">
        <SidePanel
          activeCompany={activeCompany}
          activeZone={activeZone}
          companiesForZone={companiesForZone}
          zonesForCompany={zonesForCompany}
          onPickCompany={(id) => setActiveCompanyId(id)}
        />
      </aside>
    </div>
  );
}
