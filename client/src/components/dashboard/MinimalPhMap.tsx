import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet';
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
  coordinates: [number, number]; // [longitude, latitude]
}

interface MinimalPhMapProps {
  pins: ClusterPin[];
  selectedCluster: string | null;
  onSelectCluster: (municipality: string) => void;
  households?: MapHousehold[];
  onOpenHousehold?: (householdId: string) => void;
}

// System palette (workspace.css): navy UI, rose for critical, amber for review, green for clear.
const COLORS = { RED: '#b83f62', AMBER: '#c98a1c', GREEN: '#2f7d5b', NAVY: '#132e4f', HALO: '#e0a84a' };
const LAGUNA_CENTER: LatLngExpression = [14.22, 121.17];
const toLatLng = ([lon, lat]: [number, number]): [number, number] => [lat, lon];
const valid = (c?: [number, number]) => Array.isArray(c) && c.length === 2 && c.every(Number.isFinite) && !(c[0] === 0 && c[1] === 0);
// Household dots are coloured by review stage, in the system palette.
const STAGES: Record<string, { color: string; label: string }> = {
  FLAGGED_FOR_REVIEW: { color: '#c2416b', label: 'Flagged for review' },
  UNDER_INVESTIGATION: { color: '#d4901f', label: 'Under investigation (visit dispatched)' },
  NOTICE_OF_INELIGIBILITY: { color: '#2f5d8a', label: 'Notice of ineligibility' },
};
const stageOf = (status: string) => STAGES[status] ?? { color: '#6b7789', label: status.replace(/_/g, ' ').toLowerCase() };

// Keeps the view on the data: fits everything on load and flies to a selected municipality.
const ViewController: React.FC<{ bounds: LatLngBoundsExpression | null; focus: [number, number] | null; resetKey: number }> = ({ bounds, focus, resetKey }) => {
  const map = useMap();
  const firstFocus = useRef(true);
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [map, bounds, resetKey]);
  useEffect(() => {
    // The first selection is the default one: keep the fitted view. Later picks fly there.
    if (firstFocus.current) { firstFocus.current = false; return; }
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [map, focus]);
  return null;
};

export const MinimalPhMap: React.FC<MinimalPhMapProps> = ({ pins, selectedCluster, onSelectCluster, households = [], onOpenHousehold }) => {
  const [showMunicipalities, setShowMunicipalities] = useState(households.length === 0);
  const [showHouseholds, setShowHouseholds] = useState(true);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const mappedHouseholds = households.filter(h => valid(h.coordinates));
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const points = [...pins.filter(p => valid(p.coordinates)).map(p => toLatLng(p.coordinates)), ...mappedHouseholds.map(h => toLatLng(h.coordinates))];
    if (!points.length) return null;
    if (points.length === 1) { const [lat, lng] = points[0]; return [[lat - 0.03, lng - 0.03], [lat + 0.03, lng + 0.03]]; }
    return points;
  }, [JSON.stringify(pins.map(p => p.coordinates)), JSON.stringify(mappedHouseholds.map(h => h.coordinates))]);
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
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="flex items-center gap-1 text-stone-500"><Layers className="w-3.5 h-3.5" aria-hidden="true" />Show:</span>
          <label className="map-toggle"><input type="checkbox" checked={showMunicipalities} onChange={e => setShowMunicipalities(e.target.checked)} />Municipalities</label>
          <label className="map-toggle"><input type="checkbox" checked={showHouseholds} onChange={e => setShowHouseholds(e.target.checked)} />Households under review ({mappedHouseholds.length})</label>
          <button type="button" className="map-toggle" onClick={() => setResetKey(k => k + 1)}><Crosshair className="w-3.5 h-3.5" aria-hidden="true" />Fit to data</button>
        </div>
      </div>

      <div className="live-map-canvas" role="region" aria-label="Interactive map of municipalities and flagged households. Use the municipality buttons above for keyboard access.">
        <MapContainer center={LAGUNA_CENTER} zoom={13} scrollWheelZoom={false} zoomControl={false} className="h-full w-full" attributionControl>
          <ZoomControl position="topright" />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd" maxZoom={19}
            eventHandlers={{ tileerror: () => setTilesFailed(true) }}
          />
          <ViewController bounds={bounds} focus={focus} resetKey={resetKey} />
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
          {showHouseholds && mappedHouseholds.map(h => (
            <CircleMarker key={h.household_id} center={toLatLng(h.coordinates)} radius={6}
              pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: stageOf(h.status).color, fillOpacity: 1 }}>
              <Popup>
                <div className="map-popup">
                  <strong>{h.name}</strong>
                  <span>{h.household_id}</span>
                  <span>{h.barangay}, {h.municipality}</span>
                  <span>Risk score <b>{h.score.toFixed(1)}</b> / 100</span>
                  <span className="map-popup-stage"><i style={{ background: stageOf(h.status).color }} />{stageOf(h.status).label}</span>
                  {onOpenHousehold && <button type="button" onClick={() => onOpenHousehold(h.household_id)}>Open Triage Queue</button>}
                </div>
              </Popup>
              <Tooltip direction="top" offset={[0, -6]}>{h.name} · score {h.score.toFixed(0)}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
        {tilesFailed && <p className="map-offline-note" role="status">Map background unavailable (offline?). Markers still show your data.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-stone-600 pt-1">
        {Object.values(STAGES).map(stage => (
          <span key={stage.label} className="flex items-center gap-1.5"><span className="map-dot" style={{ background: stage.color }} />{stage.label}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: COLORS.HALO }} />Calamity moratorium</span>
        {showMunicipalities && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" aria-hidden="true" />Circle size = flagged households</span>}
      </div>
    </div>
  );
};
