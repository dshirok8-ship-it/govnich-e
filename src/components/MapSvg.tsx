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

  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, zoneId: null });

  // 1) Load SVG as text
  useEffect(() => {
    let cancelled = false;
    setError(null);

    fetch('/map/spb.svg')
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

  // 2) Event delegation on container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function findZoneTarget(target: EventTarget | null): HTMLElement | null {
      if (!(target instanceof HTMLElement)) return null;
      const zoneEl = target.closest?.('[data-zone-id]') as HTMLElement | null;
      return zoneEl;
    }

    function onMove(e: MouseEvent) {
      const zoneEl = findZoneTarget(e.target);
      const zoneId = zoneEl?.getAttribute('data-zone-id');

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
      const zoneId = zoneEl?.getAttribute('data-zone-id');
      if (!zoneId) return;

      // Опционально: приоритет MO над district если вложено (например, path внутри группы района)
      // Сейчас берём nearest [data-zone-id] — уже достаточно для приоритета "самого глубокого".
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

  // 3) Apply classes to zones after render (based on state)
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const nodes = root.querySelectorAll<HTMLElement>('[data-zone-id]');
    nodes.forEach((n) => {
      const zoneId = n.getAttribute('data-zone-id') ?? '';

      // districtFilter: скрываем MO не из выбранного района
      const z = zoneById.get(zoneId);
      const hidden =
        districtFilterId &&
        z &&
        ((z.type === 'district' && z.id !== districtFilterId) ||
          (z.type === 'mo' && z.parentDistrictId !== districtFilterId));

      n.classList.toggle('is-hidden', Boolean(hidden));

      n.classList.add('zone');
      n.classList.toggle('is-covered', coveredZoneIds.has(zoneId));
      n.classList.toggle('is-active', activeZoneId === zoneId);
      n.classList.toggle('is-hovered', hoverZoneId === zoneId);
    });
  }, [coveredZoneIds, activeZoneId, hoverZoneId, districtFilterId, zoneById, svgText]);

  const tooltipZone = tooltip.zoneId ? zoneById.get(tooltip.zoneId) : null;

  if (error) {
    return <div className="errorBox">Ошибка: {error}</div>;
  }

  if (!svgText) {
    return <div className="muted">Загрузка SVG…</div>;
  }

  return (
    <div className="mapWrap">
      <div ref={containerRef} className="svgContainer" dangerouslySetInnerHTML={{ __html: svgText }} />

      {/* tooltip рендерим отдельно поверх */}
      {tooltip.visible && tooltipZone ? (
        <div className="tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          <div style={{ fontWeight: 600 }}>{tooltipZone.name}</div>
          <div className="muted">id: {tooltipZone.id}</div>
        </div>
      ) : null}
    </div>
  );
}
