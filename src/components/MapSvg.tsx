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
  const innerRef = useRef<HTMLDivElement | null>(null);

  const [svgText, setSvgText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const zoneById = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    zoneId: null
  });

  // zoom state
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  const MIN_SCALE = 0.7;
  const MAX_SCALE = 6;

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

  // Apply styles after render (zones + pointer events)
  useEffect(() => {
    const root = innerRef.current;
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

    const svg = root.querySelector('svg') as SVGElement | null;
    if (svg) svg.style.pointerEvents = 'auto';
    root.querySelectorAll<SVGElement>('svg g').forEach((g) => (g.style.pointerEvents = 'auto'));
  }, [coveredZoneIds, activeZoneId, hoverZoneId, districtFilterId, zoneById, svgText]);

  function closestZone(el: Element | null): Element | null {
    if (!el) return null;
    return el.closest('[data-zone-id],[id]');
  }

  function getZoneId(el: Element | null): string | null {
    if (!el) return null;
    return el.getAttribute('data-zone-id') || el.getAttribute('id');
  }

  function resolveTarget(clientX: number, clientY: number, target: EventTarget | null) {
    const a = target instanceof Element ? closestZone(target) : null;
    const bEl = document.elementFromPoint(clientX, clientY);
    const b = bEl ? closestZone(bEl) : null;
    const winner = a || b;
    return { winner, zoneId: getZoneId(winner) };
  }

  // Hover / click (React handlers)
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isPanning) return; // не показываем tooltip пока тянем
    const { zoneId } = resolveTarget(e.clientX, e.clientY, e.target);
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
    if (isPanning) return;
    const { zoneId } = resolveTarget(e.clientX, e.clientY, e.target);
    if (zoneId) onPickZone(zoneId);
  }

  // Zoom helper: zoom around a point (clientX/clientY)
  function zoomAt(clientX: number, clientY: number, nextScale: number) {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    // world coords before zoom
    const wx = (px - tx) / scale;
    const wy = (py - ty) / scale;

    // new translation so that (wx, wy) stays under cursor
    const nextTx = px - wx * nextScale;
    const nextTy = py - wy * nextScale;

    setScale(nextScale);
    setTx(nextTx);
    setTy(nextTy);
  }

  function clampScale(s: number) {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const delta = -e.deltaY; // wheel up -> zoom in
    const factor = delta > 0 ? 1.12 : 1 / 1.12;
    const next = clampScale(scale * factor);
    zoomAt(e.clientX, e.clientY, next);
  }

  function onDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const next = clampScale(scale * 1.3);
    zoomAt(e.clientX, e.clientY, next);
  }

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    // левая кнопка
    if (e.button !== 0) return;
    setIsPanning(true);
    setTooltip((t) => (t.visible ? { ...t, visible: false, zoneId: null } : t));
    panRef.current = { startX: e.clientX, startY: e.clientY, startTx: tx, startTy: ty };
  }

  function onMouseUp() {
    setIsPanning(false);
    panRef.current = null;
  }

  function onMouseMovePan(e: React.MouseEvent<HTMLDivElement>) {
    if (!isPanning || !panRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setTx(panRef.current.startTx + dx);
    setTy(panRef.current.startTy + dy);
  }

  function resetView() {
    setScale(1);
    setTx(0);
    setTy(0);
  }

  const tooltipZone = tooltip.zoneId ? zoneById.get(tooltip.zoneId) : null;

  if (error) return <div className="errorBox">Ошибка: {error}</div>;
  if (!svgText) return <div className="muted">Загрузка SVG…</div>;

  return (
    <div className="mapWrap" style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        className={`svgContainer ${isPanning ? 'is-panning' : ''}`}
        onMouseMove={(e) => {
          onMouseMovePan(e);
          onMove(e);
        }}
        onMouseLeave={() => {
          onLeave();
          onMouseUp();
        }}
        onMouseUp={onMouseUp}
        onMouseDown={onMouseDown}
        onClick={onClick}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
      >
        <div
          ref={innerRef}
          className="svgInner"
          style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
          dangerouslySetInnerHTML={{ __html: svgText }}
        />
      </div>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', right: 18, top: 18, display: 'flex', gap: 8, zIndex: 10 }}>
        <button className="btn btn--ghost btn--small" type="button" onClick={() => setScale((s) => clampScale(s / 1.12))}>
          −
        </button>
        <button className="btn btn--ghost btn--small" type="button" onClick={() => setScale((s) => clampScale(s * 1.12))}>
          +
        </button>
        <button className="btn btn--ghost btn--small" type="button" onClick={resetView}>
          Reset
        </button>
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltipZone ? (
        <div className="tooltip" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          <div style={{ fontWeight: 600 }}>{tooltipZone.name}</div>
          <div className="muted">id: {tooltipZone.id}</div>
        </div>
      ) : null}
    </div>
  );
}
