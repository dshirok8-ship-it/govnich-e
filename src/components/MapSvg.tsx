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
  const [debug, setDebug] = useState<string>('debug: …');

  const zoneById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    zoneId: null
  });

  // Load SVG
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

  function closestZone(el: Element | null): Element | null {
    if (!el) return null;
    return el.closest('[data-zone-id],[id]');
  }

  function getZoneId(el: Element | null): string | null {
    if (!el) return null;
    return el.getAttribute('data-zone-id') || el.getAttribute('id');
  }

  function resolveTarget(e: React.MouseEvent<HTMLDivElement>) {
    // способ A: e.target
    const a = e.target instanceof Element ? closestZone(e.target) : null;

    // способ B: elementFromPoint (если target странный)
    const bEl = document.elementFromPoint(e.clientX, e.clientY);
    const b = bEl ? closestZone(bEl) : null;

    const winner = a || b;
    const zoneId = getZoneId(winner);

    const t = winner?.tagName?.toLowerCase() ?? 'none';
    const id = winner?.getAttribute?.('id') ?? '';
    const dz = winner?.getAttribute?.('data-zone-id') ?? '';
    setDebug(`debug: tag=${t} id=${id} data-zone-id=${dz} -> zoneId=${zoneId ?? 'null'}`);

    return { winner, zoneId };
  }

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const { zoneId } = resolveTarget(e);
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

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    const { zoneId } = resolveTarget(e);
    if (zoneId) onPickZone(zoneId);
  }

  // Apply styles after render
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const shapes = Array.from(root.querySelectorAll<SVGElement>('svg path, svg polygon'));
    shapes.forEach((n) => {
      n.removeAttribute('fill');
      n.removeAttribute('stroke');
      n.removeAttribute('style');
      n.style.pointerEvents = 'all';
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

    // на всякий случай включим pointer events на svg/группах
    const svg = root.querySelector('svg') as SVGElement | null;
    if (svg) svg.style.pointerEvents = 'auto';
    root.querySelectorAll<SVGElement>('svg g').forEach((g) => (g.style.pointerEvents = 'auto'));
  }, [coveredZoneIds, activeZoneId, hoverZoneId, districtFilterId, zoneById, svgText]);

  const tooltipZone = tooltip.zoneId ? zoneById.get(tooltip.zoneId) : null;

  if (error) return <div className="errorBox">Ошибка: {error}</div>;
  if (!svgText) return <div className="muted">Загрузка SVG…</div>;

  return (
    <div className="mapWrap">
      <div
        ref={containerRef}
        className="svgContainer"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: svgText }}
      />

      {/* debug плашка */}
      <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 5, fontSize: 12, color: '#9ca3af' }}>
        {debug}
      </div>

      {tooltip.visible && tooltipZone ? (
        <div className="tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          <div style={{ fontWeight: 600 }}>{tooltipZone.name}</div>
          <div className="muted">id: {tooltipZone.id}</div>
        </div>
      ) : null}
    </div>
  );
}
