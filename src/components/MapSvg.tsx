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
  const
