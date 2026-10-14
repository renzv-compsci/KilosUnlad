import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { Crosshair, Layers, MapPin } from 'lucide-react';

export interface ClusterPin {
  id: string;
  municipality: string;
  coordinates: [number, number]; // [longitude, latitude]
  status: 'RED' | 'AMBER' | 'GREEN';
  riskScore: number;
  flaggedCount: number;
  dispatchedCount: number;
  note: string;
  calamityActive: boolean;
}

export interface MapHousehold {
  household_id: string;
  name: string;
  barangay: string;
  municipality: string;
  score: number;
  status: string;
  task?: string; // latest field-task status for this household, when there is one
  coordinates: [number, number]; // [longitude, latitude]
}

export interface DensityCell { center: [number, number]; households: number; active_compliant: number; under_review: number }

interface MinimalPhMapProps {
  pins: ClusterPin[];
  selectedCluster: string | null;
  onSelectCluster: (municipality: string) => void;
  households?: MapHousehold[];
  density?: DensityCell[];
  onOpenHousehold?: (householdId: string) => void;
}

// System palette (workspace.css): navy UI, rose for critical, amber for review, green for clear.
const COLORS = { RED: '#b83f62', AMBER: '#c98a1c', GREEN: '#2f7d5b', NAVY: '#132e4f', HALO: '#e0a84a' };
const LAGUNA_CENTER: LatLngExpression = [14.22, 121.17];
const toLatLng = ([lon, lat]: [number, number]): [number, number] => [lat, lon];
const valid = (c?: [number, number]) => Array.isArray(c) && c.length === 2 && c.every(Number.isFinite) && !(c[0] === 0 && c[1] === 0);
// Household dots are coloured by stage, in the system palette. A household under investigation
// is split by its field task: visit still open, or report already submitted.
const STAGES: Record<string, { color: string; label: string }> = {
  FLAGGED_FOR_REVIEW: { color: '#c2416b', label: 'Flagged, awaiting dispatch' },
  OPEN_FIELD_TASK: { color: '#d4901f', label: 'Open field task' },
  REPORT_SUBMITTED: { color: '#2f7d7a', label: 'Report submitted' },
  NOTICE_OF_INELIGIBILITY: { color: '#2f5d8a', label: 'Notice of ineligibility' },
};
const STAGE_ORDER = Object.keys(STAGES);
const stageKey = (h: MapHousehold) => h.status !== 'UNDER_INVESTIGATION' ? h.status
  : h.task === 'SUBMITTED' ? 'REPORT_SUBMITTED' : 'OPEN_FIELD_TASK';
const DENSITY_COLOR = '#132e4f';
// Basemaps: "Streets" is the familiar road map (yellow/orange roads, green parks, blue water, labels);
// "Light" is a muted style. Both are free with the attribution shown on the map.
const BASEMAPS = {
  streets: { label: 'Streets', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: undefined as string | undefined,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
  light: { label: 'Light', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' },
};
type BasemapKey = keyof typeof BASEMAPS;

// Household marker: a solid dot with a soft halo; flagged households pulse so they stand out.
const iconCache = new Map<string, L.DivIcon>();
function householdIcon(color: string, pulse: boolean): L.DivIcon {
  const key = `${color}-${pulse}`;
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({
      className: 'hh-marker',
      html: `<span class="hh-halo${pulse ? ' hh-pulse' : ''}" style="--c:${color}"></span><span class="hh-dot" style="--c:${color}"></span>`,
      iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -12], tooltipAnchor: [0, -12],
    }));
  }
  return iconCache.get(key)!;
}

const stageOf = (key: string) => STAGES[key] ?? { color: '#6b7789', label: key.replace(/_/g, ' ').toLowerCase() };

// Keeps the view on the data: fits everything on load and flies to a selected municipality.
const ViewController: React.FC<{ bounds: LatLngBoundsExpression | null; focus: [number, number] | null; resetKey: number }> = ({ bounds, focus, resetKey }) => {
  const map = useMap();
  const firstFocus = useRef(true);
  useEffect(() => {
    if (!bounds) return;
    // The map mounts lazily; measure the final box size before fitting, or the zoom comes out too close.
    const fit = () => { map.invalidateSize(); map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 }); };
    const timer = window.setTimeout(fit, 60);
    return () => window.clearTimeout(timer);
  }, [map, bounds, resetKey]);
  useEffect(() => {
    // The first selection is the default one: keep the fitted view. Later picks fly there.
    if (firstFocus.current) { firstFocus.current = false; return; }
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [map, focus]);
  return null;
};

const CLUSTER_CELL_PX = 80;
const CLUSTER_UNTIL_ZOOM = 17;

function clusterIcon(count: number, color: string): L.DivIcon {
  const size = Math.round(Math.min(56, 30 + Math.log2(count) * 5));
  return L.divIcon({
    className: 'hh-cluster-marker',
    html: `<span class="hh-cluster" style="--c:${color};--s:${size}px">${count}</span>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}

const HouseholdPopup: React.FC<{ h: MapHousehold; onOpenHousehold?: (id: string) => void }> = ({ h, onOpenHousehold }) => (
  <Popup>
    <div className="map-popup">
      <strong>{h.name}</strong>
      <span>{h.household_id}</span>
      <span>{h.barangay}, {h.municipality}</span>
      <span>Risk score <b>{h.score.toFixed(1)}</b> / 100</span>
      <span className="map-popup-stage"><i style={{ background: stageOf(stageKey(h)).color }} />{stageOf(stageKey(h)).label}</span>
      {onOpenHousehold && <button type="button" onClick={() => onOpenHousehold(h.household_id)}>Open Triage Queue</button>}
    </div>
  </Popup>
);

// Groups nearby households into count bubbles (like Google Maps) until the map is zoomed in close.
// Clicking a bubble zooms into it. Grouping is recomputed only when the zoom level changes.
const HouseholdLayer: React.FC<{ households: MapHousehold[]; onOpenHousehold?: (id: string) => void }> = ({ households, onOpenHousehold }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const groups = useMemo(() => {
    if (zoom >= CLUSTER_UNTIL_ZOOM || households.length <= 40) return households.map(h => ({ key: h.household_id, members: [h] }));
    const cells = new Map<string, MapHousehold[]>();
    for (const h of households) {
      const p = map.project(toLatLng(h.coordinates), zoom);
      const key = `${Math.floor(p.x / CLUSTER_CELL_PX)}:${Math.floor(p.y / CLUSTER_CELL_PX)}`;
      cells.set(key, [...(cells.get(key) ?? []), h]);
    }
    return [...cells.entries()].map(([key, members]) => ({ key, members }));
  }, [households, zoom, map]);

  return <>{groups.map(({ key, members }) => {
    if (members.length === 1) {
      const h = members[0];
      return (
        <Marker key={key} position={toLatLng(h.coordinates)} title={`${h.name}, ${stageOf(stageKey(h)).label}`}
          icon={householdIcon(stageOf(stageKey(h)).color, stageKey(h) === 'FLAGGED_FOR_REVIEW')}>
          <HouseholdPopup h={h} onOpenHousehold={onOpenHousehold} />
          <Tooltip direction="top">{h.name} · score {h.score.toFixed(0)}</Tooltip>
        </Marker>
      );
    }
    const lat = members.reduce((sum, h) => sum + h.coordinates[1], 0) / members.length;
    const lng = members.reduce((sum, h) => sum + h.coordinates[0], 0) / members.length;
    // Bubble colour = the stage most households inside are in; the tooltip gives the exact breakdown.
    const tally = new Map<string, number>();
    for (const h of members) tally.set(stageKey(h), (tally.get(stageKey(h)) ?? 0) + 1);
    const majority = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const counts = STAGE_ORDER.map(stage => [stageOf(stage).label, tally.get(stage) ?? 0] as const).filter(([, n]) => n);
    return (
      <Marker key={key} position={[lat, lng]} title={`${members.length} households. Click to zoom in.`}
        icon={clusterIcon(members.length, stageOf(majority).color)}
        eventHandlers={{ click: () => map.flyTo([lat, lng], Math.min(map.getZoom() + 2, 18), { duration: 0.5 }) }}>
        <Tooltip direction="top">{members.length} households: {counts.map(([label, n]) => `${n} ${label.toLowerCase()}`).join(', ')}</Tooltip>
      </Marker>
    );
  })}</>;
};

// Every household in scope, as counts per ~220 m cell (GET /insights/map): drawn on a canvas so
// thousands of cells stay fast. Darker and larger = more households.
const DensityLayer: React.FC<{ cells: DensityCell[] }> = ({ cells }) => {
  const max = Math.max(1, ...cells.map(c => c.households));
  return <>{cells.map(c => (
    <CircleMarker key={`${c.center[0]}:${c.center[1]}`} center={toLatLng(c.center)} radius={2 + 6 * Math.sqrt(c.households / max)}
      pathOptions={{ stroke: false, fillColor: DENSITY_COLOR, fillOpacity: 0.06 + 0.2 * (c.households / max) }}>
      <Tooltip direction="top">{c.households.toLocaleString()} household{c.households === 1 ? '' : 's'} · {c.active_compliant.toLocaleString()} compliant · {c.under_review} under review</Tooltip>
    </CircleMarker>
  ))}</>;
};

export const MinimalPhMap: React.FC<MinimalPhMapProps> = ({ pins, selectedCluster, onSelectCluster, households = [], density = [], onOpenHousehold }) => {
  const [showMunicipalities, setShowMunicipalities] = useState(households.length === 0 && density.length === 0);
  const [showDensity, setShowDensity] = useState(true);
  const [hiddenStages, setHiddenStages] = useState<Set<string>>(new Set());
  const toggleStage = (key: string) => setHiddenStages(current => {
    const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next;
  });
  const [tilesFailed, setTilesFailed] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>('streets');
  const [resetKey, setResetKey] = useState(0);
  const mappedHouseholds = households.filter(h => valid(h.coordinates));
  const visibleHouseholds = mappedHouseholds.filter(h => !hiddenStages.has(stageKey(h)));
  const stageCounts = new Map<string, number>();
  for (const h of mappedHouseholds) stageCounts.set(stageKey(h), (stageCounts.get(stageKey(h)) ?? 0) + 1);
  const densityTotal = density.reduce((sum, c) => sum + c.households, 0);
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const points = [...pins.filter(p => valid(p.coordinates)).map(p => toLatLng(p.coordinates)), ...mappedHouseholds.map(h => toLatLng(h.coordinates)),
      ...density.map(c => toLatLng(c.center))];
    if (!points.length) return null;
    if (points.length === 1) { const [lat, lng] = points[0]; return [[lat - 0.03, lng - 0.03], [lat + 0.03, lng + 0.03]]; }
    return points;
  }, [JSON.stringify(pins.map(p => p.coordinates)), JSON.stringify(mappedHouseholds.map(h => h.coordinates)), density.length]);
  const selected = pins.find(p => p.municipality === selectedCluster);
  const focus = useMemo(() => selected && valid(selected.coordinates) ? toLatLng(selected.coordinates) : null,
    [selected?.municipality]);
  const maxFlagged = Math.max(1, ...pins.map(p => p.flaggedCount));

  return (
    <div className="jurisdiction-map live-map relative flex h-full min-h-[360px] w-full flex-col gap-3 overflow-hidden bg-stone-50/60 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]" role="group" aria-label="Municipalities">
          {pins.map((pin) => {
            const isSelected = selectedCluster === pin.municipality;
            return (
              <button key={`chip-${pin.id}`} type="button" aria-pressed={isSelected} onClick={() => onSelectCluster(pin.municipality)}
                className={`min-h-[36px] px-3 py-1 rounded-md border text-[12px] font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected ? 'bg-[#132e4f] text-white border-[#132e4f]' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[pin.status] }} />
                <span>{pin.municipality}</span>
                <span className={`tabular-nums ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>({pin.flaggedCount})</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="map-layer-bar" role="group" aria-label="Map layers">
        <span className="flex items-center gap-1 text-stone-500"><Layers className="w-3.5 h-3.5" aria-hidden="true" />Show:</span>
        {density.length > 0 && <label className="map-toggle"><input type="checkbox" checked={showDensity} onChange={e => setShowDensity(e.target.checked)} />
          <span className="map-dot" style={{ background: DENSITY_COLOR, opacity: 0.55 }} />All households in scope ({densityTotal.toLocaleString()})</label>}
        {STAGE_ORDER.filter(key => stageCounts.get(key)).map(key => (
          <label key={key} className="map-toggle"><input type="checkbox" checked={!hiddenStages.has(key)} onChange={() => toggleStage(key)} />
            <span className="map-dot" style={{ background: STAGES[key].color }} />{STAGES[key].label} ({(stageCounts.get(key) ?? 0).toLocaleString()})</label>
        ))}
        <label className="map-toggle"><input type="checkbox" checked={showMunicipalities} onChange={e => setShowMunicipalities(e.target.checked)} />Municipalities</label>
      </div>

      <div className="live-map-canvas" role="region" aria-label="Interactive map of all households, flagged households and field tasks. Use the buttons above for keyboard access.">
        <MapContainer center={LAGUNA_CENTER} zoom={13} scrollWheelZoom={false} zoomControl={false} preferCanvas className="h-full w-full" attributionControl>
          <ZoomControl position="topright" />
          <TileLayer key={basemap}
            url={BASEMAPS[basemap].url}
            attribution={BASEMAPS[basemap].attribution}
            {...(BASEMAPS[basemap].subdomains ? { subdomains: BASEMAPS[basemap].subdomains } : {})}
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTilesFailed(true), tileload: () => setTilesFailed(false) }}
          />
          <ViewController bounds={bounds} focus={focus} resetKey={resetKey} />
          {showDensity && density.length > 0 && <DensityLayer cells={density} />}
          {showMunicipalities && pins.filter(p => valid(p.coordinates)).map(pin => {
            const isSelected = selectedCluster === pin.municipality;
            const radius = 14 + 16 * Math.sqrt(pin.flaggedCount / maxFlagged);
            return (
              <React.Fragment key={pin.id}>
                {pin.calamityActive && <CircleMarker center={toLatLng(pin.coordinates)} radius={radius + 7} interactive={false}
                  pathOptions={{ color: COLORS.HALO, weight: 3, dashArray: '6 5', fill: false }} />}
                <CircleMarker center={toLatLng(pin.coordinates)} radius={radius}
                  eventHandlers={{ click: () => onSelectCluster(pin.municipality) }}
                  pathOptions={{ color: isSelected ? COLORS.NAVY : COLORS[pin.status], weight: isSelected ? 3 : 2, fillColor: COLORS[pin.status], fillOpacity: 0.12 }}>
                  <Tooltip permanent direction="center" className="map-label">{pin.municipality} · {pin.flaggedCount}</Tooltip>
                </CircleMarker>
              </React.Fragment>
            );
          })}
          <HouseholdLayer households={visibleHouseholds} onOpenHousehold={onOpenHousehold} />
        </MapContainer>
        <div className="map-basemap-switch" role="group" aria-label="Map style">
          {(Object.keys(BASEMAPS) as BasemapKey[]).map(key => (
            <button key={key} type="button" aria-pressed={basemap === key} onClick={() => setBasemap(key)}>{BASEMAPS[key].label}</button>
          ))}
        </div>
        <button type="button" className="map-fit-button" onClick={() => setResetKey(k => k + 1)} aria-label="Fit map to the data" title="Fit map to the data">
          <Crosshair className="w-5 h-5" aria-hidden="true" />
        </button>
        {tilesFailed && <p className="map-offline-note" role="status">Map background unavailable (offline?). Markers still show your data.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-stone-600 pt-1">
        {density.length > 0 && <span className="flex items-center gap-1.5"><span className="map-dot" style={{ background: DENSITY_COLOR, opacity: 0.55 }} />Light navy shading: all households (darker = more)</span>}
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: COLORS.HALO }} />Calamity moratorium</span>
        <span className="flex items-center gap-1.5">Numbered bubbles group nearby households; click one to zoom in.</span>
        {showMunicipalities && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" aria-hidden="true" />Circle size = flagged households</span>}
      </div>
    </div>
  );
};
