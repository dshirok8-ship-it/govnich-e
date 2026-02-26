import React, { useMemo } from 'react';
import type { Company } from '../lib/dataLoader';

type Props = {
  companies: Company[];
  value: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onChange: (companyId: string | null) => void;
};

export default function CompanySearchSelect({ companies, value, query, onQueryChange, onChange }: Props) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [companies, query]);

  return (
    <div className="panel">
      <div className="panel__title">Управляющая компания</div>

      <input
        className="input"
        placeholder="Поиск по имени…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />

      <div className="selectWrap">
        <select
          className="select"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? e.target.value : null)}
        >
          <option value="">— не выбрано —</option>
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.id})
            </option>
          ))}
        </select>

        {value && (
          <button className="btn btn--ghost" type="button" onClick={() => onChange(null)}>
            Сброс
          </button>
        )}
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        Найдено: {filtered.length}
      </div>
    </div>
  );
}
