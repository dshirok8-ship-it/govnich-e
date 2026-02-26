import React from 'react';
import type { Company, Zone } from '../lib/dataLoader';

type Props = {
  activeCompany: Company | null;
  activeZone: Zone | null;
  companiesForZone: Company[];
  zonesForCompany: Zone[];
  onPickCompany: (id: string) => void;
};

export default function SidePanel({
  activeCompany,
  activeZone,
  companiesForZone,
  zonesForCompany,
  onPickCompany
}: Props) {
  return (
    <div className="side">
      <div className="side__header">
        <div className="side__title">Детали</div>
        <div className="muted">клик по зоне или компании</div>
      </div>

      {activeZone ? (
        <section className="card">
          <h3 className="card__title">{activeZone.name}</h3>
          <div className="muted">
            {activeZone.type} · id: <code>{activeZone.id}</code>
          </div>

          <h4 className="card__subtitle">УК в зоне ({companiesForZone.length})</h4>
          {companiesForZone.length === 0 ? (
            <div className="muted">Нет данных</div>
          ) : (
            <ul className="list">
              {companiesForZone.map((c) => (
                <li key={c.id} className="list__item">
                  <button className="linkBtn" onClick={() => onPickCompany(c.id)} type="button">
                    {c.name}
                  </button>
                  <a className="ext" href={c.site} target="_blank" rel="noreferrer">
                    сайт
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {activeCompany ? (
        <section className="card">
          <h3 className="card__title">{activeCompany.name}</h3>
          <div className="muted">
            id: <code>{activeCompany.id}</code>
          </div>

          <div style={{ marginTop: 8 }}>
            <a className="btn btn--small" href={activeCompany.site} target="_blank" rel="noreferrer">
              Открыть сайт
            </a>
          </div>

          <h4 className="card__subtitle">Зоны покрытия ({zonesForCompany.length})</h4>
          {zonesForCompany.length === 0 ? (
            <div className="muted">Нет данных</div>
          ) : (
            <ul className="list">
              {zonesForCompany.map((z) => (
                <li key={z.id} className="list__item">
                  {z.name} <span className="muted">({z.id})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!activeZone && !activeCompany ? (
        <section className="card">
          <div className="muted">Выбери компанию слева или кликни по зоне на карте.</div>
        </section>
      ) : null}
    </div>
  );
}
