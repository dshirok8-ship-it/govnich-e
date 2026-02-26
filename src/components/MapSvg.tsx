import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Zone } from '../lib/dataLoader';

type Props = {
  zones: Zone[];
  coveredZoneIds: Set<string>;
  activeZoneId: string | null;
  hoverZoneId: string | null;
  districtFilterId: string | null;
  onHoverZone: (zoneId: string | null) => void;
  onPickZone: (zoneId: string) => void;
  onSvgLoaded?: () => void;
};

type TooltipState = { visible: boolean; x: number; y: number; zoneId: string | null };

function sortZoneIds(ids: string[]) {
  // mo_001.. -> по числу; остальное — как есть
  return [...ids].sort((a, b) => {
    const am = a.match(/_(\d+)/);
    const bm = b.match(/_(\d+)/);
    if (am && bm) return Number(am[1]) - Number(bm[1]);
    return a.localeCompare(b);
  });
}

export default function MapSvg({
  zones,
  coveredZoneIds,
  activeZoneId,
  hoverZoneId,
  districtFilterId,
  onHoverZone,
  onPickZone,
  onSvgLoaded
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgText, setSvgText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const zoneById = useMemo(() => {
    const m = new Map<string, Zone>();
    zones.forEach((z) => m.set(z.id, z));
    return m;
  }, [zones]);

  const zoneIdsSorted = useMemo(() => sortZoneIds(zones.map((z) => z.id)), [zones]);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    zoneId: null
  });

  // 1) Load SVG
  useEffect(() => {
    let cancelled = false;
    setError(null);

    const base = import.meta.env.BASE_URL;
    const url = `${base}map/spb.svg?v=${Date.now()}`;

    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`SVG не загрузился (${r.status})`);
        return r.text();
      })
      .then((t) => {
        if (cancelled) return;
        setSvgText(t);
        onSvgLoaded?.();
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Ошибка загрузки SVG');
      });

    return () => {
      cancelled = true;
    };
  }, [onSvgLoaded]);

  // 2) Event delegation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function findZoneTarget(target: EventTarget | null): HTMLElement | null {
      if (!(target instanceof HTMLElement)) return null;
      return (target.closest?.('[data-zone-id],[id]') as HTMLElement | null) ?? null;
    }

    function getZoneId(zoneEl: HTMLElement | null): string | null {
      if (!zoneEl) return null;
      return zoneEl.getAttribute('data-zone-id') || zoneEl.getAttribute('id');
    }

    function onMove(e: MouseEvent) {
      const zoneEl = findZoneTarget(e.target);
      const zoneId = getZoneId(zoneEl);

      if (zoneId) {
        onHoverZone(zoneId);
        setTooltip({ visible: true, x: e.clientX, y: e.clientY, zoneId });
      } else {
        onHoverZone(null);
        setTooltip((t) => (t.visible ? { ...t, visible: false, zoneId: null } : t));
      }
    }

    function onLeave() {
      onHoverZone(null);
      setTooltip((t) => (t.visible ? { ...t, visible: false, zoneId: null } : t));
    }

    function onClick(e: MouseEvent) {
      const zoneEl = findZoneTarget(e.target);
      const zoneId = getZoneId(zoneEl);
      if (!zoneId) return;
      onPickZone(zoneId);
    }

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('click', onClick);

    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('click', onClick);
    };
  }, [onHoverZone, onPickZone]);

  // 3) Apply styles + auto-assign zone ids if SVG has none
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const shapes = Array.from(root.querySelectorAll<HTMLElement>('svg path, svg polygon'));

    // проверим: есть ли вообще хоть один id/data-zone-id у фигур
    const hasAnyIds = shapes.some((n) => n.getAttribute('data-zone-id') || n.getAttribute('id'));

    // если ids нет, но количество фигур совпадает с количеством зон — проставим data-zone-id по порядку
    if (!hasAnyIds && shapes.length === zoneIdsSorted.length) {
      shapes.forEach((n, idx) => {
        n.setAttribute('data-zone-id', zoneIdsSorted[idx]);
      });
    }

    // теперь применяем стили/состояния
    shapes.forEach((n) => {
      n.removeAttribute('fill');
      n.removeAttribute('stroke');
      n.removeAttribute('style');
      n.classList.add('zone');

      const zoneId = n.getAttribute('data-zone-id') || n.getAttribute('id') || '';
      if (!zoneId) return;

      const z = zoneById.get(zoneId);
      const hidden =
        Boolean(districtFilterId) &&
        Boolean(z) &&
        ((z!.type === 'district' && z!.id !== districtFilterId) ||
          (z!.type === 'mo' && z!.parentDistrictId !== districtFilterId));

      n.classList.toggle('is-hidden', hidden);
      n.classList.toggle('is-covered', coveredZoneIds.has(zoneId));
      n.classList.toggle('is-active', activeZoneId === zoneId);
      n.classList.toggle('is-hovered', hoverZoneId === zoneId);
    });
  }, [coveredZoneIds, activeZoneId, hoverZoneId, districtFilterId, zoneById, svgText, zoneIdsSorted]);

  const tooltipZone = tooltip.zoneId ? zoneById.get(tooltip.zoneId) : null;

  if (error) return <div className="errorBox">Ошибка: {error}</div>;
  if (!svgText) return <div className="muted">Загрузка SVG…</div>;

  return (
    <div className="mapWrap">
      <div ref={containerRef} className="svgContainer" dangerouslySetInnerHTML={{ __html: svgText }} />
      {tooltip.visible && tooltipZone ? (
        <div className="tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          <div style={{ fontWeight: 600 }}>{tooltipZone.name}</div>
          <div className="muted">id: {tooltipZone.id}</div>
        </div>
      ) : null}
    </div>
  );
}
