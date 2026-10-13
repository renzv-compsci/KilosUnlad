import React, { useState } from 'react';
import { MapPin, ZoomIn, ZoomOut, Layers, Compass, Globe } from 'lucide-react';

export interface ClusterPin {
  id: string;
  municipality: string;
  coordinates: [number, number];
  status: 'RED' | 'AMBER' | 'GREEN';
  riskScore: number;
  flaggedCount: number;
  dispatchedCount: number;
  note: string;
  calamityActive: boolean;
  region?: string;
  mapX?: string;
  mapY?: string;
  nationalX?: number; // percentage on national map
  nationalY?: number;
  lagunaX?: number;   // percentage on laguna zoom
  lagunaY?: number;
}

interface MinimalPhMapProps {
  pins: ClusterPin[];
  selectedCluster: string | null;
  onSelectCluster: (municipality: string) => void;
}

export const MinimalPhMap: React.FC<MinimalPhMapProps> = ({
  pins,
  selectedCluster,
  onSelectCluster,
}) => {
  const [viewMode, setViewMode] = useState<'laguna' | 'national'>('laguna');

  // National context: only the pilot region carries data; other regions are outside the pilot.
  const pilotStatus = pins.some(p => p.status === 'RED') ? 'RED' : pins.some(p => p.status === 'AMBER') ? 'AMBER' : 'GREEN';
  const nationalNodes = [
    { name: 'NCR', x: 42, y: 31, status: 'NONE' },
    { name: 'Region III', x: 40, y: 27, status: 'NONE' },
    { name: 'Region IV-A (Laguna Pilot)', x: 44, y: 34, status: pilotStatus, isHighlight: true },
    { name: 'Region VII', x: 57, y: 56, status: 'NONE' },
    { name: 'Region XI', x: 67, y: 79, status: 'NONE' },
  ];

  return (
    <div className="jurisdiction-map relative flex h-full min-h-[360px] w-full flex-col gap-5 overflow-hidden bg-stone-50/60 p-4 select-none sm:p-6">

      {/* Top Map Controls */}
      <div className="relative z-10 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 py-1.5 text-xs">
            <Globe className="w-3.5 h-3.5 text-[#132e4f]" />
            <span className="font-semibold text-stone-800 font-display">
              {viewMode === 'laguna' ? 'Laguna de Bay Operational Cluster' : 'Philippine Archipelago'}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {viewMode === 'laguna' ? '14.21° N, 121.16° E' : '12.87° N, 121.77° E'}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-stone-200/90 rounded-lg p-0.5 shadow-2xs text-xs">
            <button
              type="button"
              onClick={() => setViewMode('laguna')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'laguna'
                  ? 'bg-[#132e4f] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Laguna Cluster
            </button>
            <button
              type="button"
              onClick={() => setViewMode('national')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                viewMode === 'national'
                  ? 'bg-[#132e4f] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              National Overview
            </button>
          </div>
        </div>

        {/* Municipality Quick-Select Ribbon (Only in Laguna view) */}
        {viewMode === 'laguna' && (
          <div className="flex flex-wrap items-center gap-2 pb-1 text-[11px]">
            <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider shrink-0 pr-1">
              LGUs:
            </span>
            {pins.map((pin) => {
              const isSelected = selectedCluster === pin.municipality;
              return (
                <button
                  key={`chip-${pin.id}`}
                  type="button"
                  onClick={() => onSelectCluster(pin.municipality)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-[#132e4f] text-white border-[#132e4f] shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    pin.status === 'RED' ? 'bg-rose-500' :
                    pin.status === 'AMBER' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  <span>{pin.municipality}</span>
                  <span className={`text-[10px] tabular-nums ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                    ({pin.flaggedCount})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="map-canvas relative z-10 flex w-full flex-1 items-center justify-center">
        {viewMode === 'national' ? (
          /* ============================================================
             MINIMAL PHILIPPINE ARCHIPELAGO VECTOR MAP
             ============================================================ */
          <div className="national-map-frame relative flex w-full items-center justify-center">
            <svg
              viewBox="0 0 320 400"
              className="w-full h-full max-h-[320px] filter drop-shadow-2xs"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Sea Waterway background accent */}
              <rect width="320" height="400" fill="transparent" />

              {/* Minimal Coordinate Grid Labels */}
              <text x="12" y="40" className="text-[8px] fill-stone-400 font-mono">18°N</text>
              <text x="12" y="140" className="text-[8px] fill-stone-400 font-mono">14°N</text>
              <text x="12" y="240" className="text-[8px] fill-stone-400 font-mono">10°N</text>
              <text x="12" y="340" className="text-[8px] fill-stone-400 font-mono">6°N</text>
              <line x1="30" y1="140" x2="300" y2="140" stroke="#d6d3d1" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6" />
              <line x1="30" y1="240" x2="300" y2="240" stroke="#d6d3d1" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6" />

              {/* LUZON MAINLAND (Minimal stylized geometry) */}
              <path
                d="M 120 30 
                   L 145 28 L 155 45 L 165 75 L 160 105 L 140 120 
                   L 155 130 L 180 145 L 195 170 L 175 180 L 150 155 
                   L 135 150 L 125 135 L 115 132 L 112 115 L 125 95 
                   L 120 65 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* Bicol Peninsula */}
              <path
                d="M 165 145 L 190 155 L 210 175 L 215 195 L 205 205 L 185 195 L 175 175 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* MINDORO */}
              <path
                d="M 105 150 L 125 155 L 130 180 L 115 190 L 100 170 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* PALAWAN (Southwest chain) */}
              <path
                d="M 60 210 L 80 230 L 60 270 L 45 305 L 35 300 L 50 250 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* VISAYAS ISLANDS */}
              {/* Panay */}
              <path
                d="M 130 205 L 150 200 L 155 225 L 135 235 L 125 215 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
              />
              {/* Negros */}
              <path
                d="M 152 230 L 165 230 L 168 265 L 155 270 L 148 245 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
              />
              {/* Cebu */}
              <path
                d="M 172 225 L 180 230 L 178 260 L 170 255 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
              />
              {/* Bohol */}
              <path
                d="M 183 252 L 198 250 L 200 265 L 185 268 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
              />
              {/* Samar & Leyte */}
              <path
                d="M 195 195 L 215 200 L 220 230 L 200 240 L 190 220 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
              />
              <path
                d="M 195 225 L 205 235 L 200 260 L 190 250 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
              />

              {/* MINDANAO MAINLAND */}
              <path
                d="M 170 280 
                   L 210 275 L 235 290 L 230 320 L 235 345 L 215 365 
                   L 180 360 L 165 340 L 175 320 L 155 315 L 135 305 
                   L 125 325 L 115 325 L 120 300 L 150 295 Z"
                fill="#f5f5f4"
                stroke="#d6d3d1"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* Sulu Archipelago chain */}
              <circle cx="105" cy="340" r="2.5" fill="#cbd5e1" />
              <circle cx="95" cy="350" r="2" fill="#cbd5e1" />
              <circle cx="85" cy="360" r="2" fill="#cbd5e1" />

              {/* Region IV-A (Laguna Focus Zone Ring) */}
              <ellipse
                cx="138"
                cy="138"
                rx="14"
                ry="10"
                fill="#dbeafe"
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="animate-pulse"
              />
              <text x="156" y="136" className="text-[8px] font-bold fill-blue-800 font-sans">
                Region IV-A (Pilot)
              </text>

              {/* Waterway Labels */}
              <text x="35" y="100" className="text-[8px] fill-slate-300 font-medium tracking-wider">West Philippine Sea</text>
              <text x="210" y="120" className="text-[8px] fill-slate-300 font-medium tracking-wider">Philippine Sea</text>
            </svg>

            {/* National Nodes Interactive Overlays */}
            {nationalNodes.map((node) => (
              <div
                key={node.name}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                onClick={() => {
                  if (node.isHighlight) setViewMode('laguna');
                }}
              >
                <div className={`relative flex items-center space-x-1 px-2 py-0.5 rounded-full border shadow-xs text-[10px] font-semibold transition transform hover:scale-110 ${
                  node.isHighlight
                    ? 'bg-blue-700 text-white border-blue-900 ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    node.status === 'RED' ? 'bg-red-500' : node.status === 'AMBER' ? 'bg-amber-500' : node.status === 'GREEN' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                  <span>{node.name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ============================================================
             LAGUNA DE BAY PILOT SECTOR DETAIL VIEW
             Realistic, clean vector geometry showing the lake and shoreline
             ============================================================ */
          <div className="laguna-map-frame relative flex w-full items-center justify-center">
            <svg
              viewBox="0 0 480 320"
              className="w-full h-full filter drop-shadow-xs"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Surrounding Coastline & Provincial Outlines */}
              {/* Landmass around the lake */}
              <path
                d="M 20 40 
                   L 120 30 L 220 25 L 340 35 L 450 45 
                   L 460 280 L 380 295 L 260 290 L 140 285 L 20 270 Z"
                fill="#fafaf9"
                stroke="#e7e5e4"
                strokeWidth="1.5"
              />

              {/* Provincial Border Dashes: Rizal / Laguna / Cavite */}
              <path
                d="M 110 30 L 120 120 L 80 220 L 40 270"
                stroke="#d6d3d1"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text x="35" y="160" className="text-[9px] font-semibold fill-stone-400">
                CAVITE SECTOR
              </text>

              <path
                d="M 240 25 L 260 85 L 320 90 L 420 80"
                stroke="#d6d3d1"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text x="330" y="65" className="text-[9px] font-semibold fill-stone-400">
                RIZAL PROVINCE
              </text>

              {/* LAGUNA DE BAY WATER BODY (Three-lobed stylized lake) */}
              <path
                d="M 155 120
                   C 170 80, 230 75, 255 105
                   C 275 80, 320 85, 340 125
                   C 360 170, 335 220, 280 215
                   C 240 225, 200 230, 165 210
                   C 130 190, 140 140, 155 120 Z"
                fill="#e6eff5"
                stroke="#9fc1d6"
                strokeWidth="1.5"
              />

              {/* Talim Island inside Laguna de Bay */}
              <path
                d="M 250 115 L 255 170 L 245 165 Z"
                fill="#fafaf9"
                stroke="#d6d3d1"
                strokeWidth="1"
              />
              <text x="240" y="145" className="text-[7px] font-medium fill-stone-400">
                Talim Is.
              </text>

              {/* Lake Label */}
              <text x="205" y="175" className="text-[11px] font-bold fill-[#1e4663] tracking-wide font-display">
                Laguna de Bay
              </text>
              <text x="212" y="188" className="text-[8px] font-medium fill-[#3b6f8f]">
                Freshwater Basin (Regional Waterway)
              </text>

              {/* Highway Corridor Axis (SLEX / Manila South Road) */}
              <path
                d="M 95 80 L 115 125 L 135 165 L 175 220 L 235 250"
                stroke="#a8a29e"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text x="65" y="95" className="text-[8px] fill-stone-400 font-mono">
                SLEX Corridor
              </text>

              {/* Mount Makiling silhouette footprint at Los Baños */}
              <path
                d="M 230 270 Q 255 240 280 270 Z"
                fill="#eeecea"
                stroke="#d6d3d1"
                strokeWidth="1"
              />
              <text x="238" y="275" className="text-[7px] font-semibold fill-stone-500">
                Mt. Makiling
              </text>

              {/* Geographic Direction Indicator */}
              <g transform="translate(425, 250)">
                <circle cx="15" cy="15" r="14" fill="#ffffff" stroke="#e7e5e4" strokeWidth="1" />
                <path d="M 15 5 L 19 15 L 15 13 L 11 15 Z" fill="#132e4f" />
                <text x="12.5" y="26" className="text-[8px] font-bold fill-stone-600">N</text>
              </g>
            </svg>

            {/* Interactive Municipality Pins placed along the lake shore */}
            {pins.map((pin) => {
              const isSelected = selectedCluster === pin.municipality;

              // Geographic positions along the west & south shore of Laguna de Bay with ample spacing
              const coords: Record<string, { left: string; top: string }> = {
                'San Pedro': { left: '18%', top: '22%' },
                'Biñan City': { left: '17%', top: '38%' },
                'Santa Rosa': { left: '21%', top: '55%' },
                'Calamba City': { left: '33%', top: '74%' },
                'Los Baños': { left: '60%', top: '82%' },
              };
              coords['Calamba'] = coords['Calamba City'];
              coords['Biñan'] = coords['Biñan City'];
              // Unknown municipalities: project the household centroid onto the Laguna frame.
              const [lon, lat] = pin.coordinates;
              const clamp = (v: number) => `${Math.min(92, Math.max(8, v)).toFixed(1)}%`;
              const projected = Number.isFinite(lon) && Number.isFinite(lat)
                ? { left: clamp(((lon - 121.0) / 0.5) * 100), top: clamp(((14.45 - lat) / 0.4) * 100) } : null;
              const pos = coords[pin.municipality] || projected || { left: pin.mapX || '50%', top: pin.mapY || '50%' };

              let pinBadge = 'bg-emerald-700 text-white border-emerald-800';
              if (pin.status === 'RED') pinBadge = 'bg-rose-700 text-white border-rose-800';
              else if (pin.status === 'AMBER') pinBadge = 'bg-amber-700 text-white border-amber-800';

              return (
                <button
                  key={pin.id}
                  id={`map-pin-${pin.id}`}
                  onClick={() => onSelectCluster(pin.municipality)}
                  style={{ left: pos.left, top: pos.top }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-150 ${
                    isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-20'
                  }`}
                >
                  <div
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs transition border ${pinBadge} ${
                      isSelected
                        ? 'ring-2 ring-[#132e4f] ring-offset-2 shadow-md'
                        : 'opacity-95 hover:opacity-100'
                    }`}
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="whitespace-nowrap">{pin.municipality}</span>
                    <span className="text-[10px] opacity-90 pl-0.5 font-mono">
                      ({pin.flaggedCount})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Map Legend & Guidance */}
      <div className="relative z-10 flex flex-wrap items-center justify-between text-xs text-stone-600 pt-2.5 border-t border-stone-200/90 gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-700"></span>
            <span>High Risk (≥ 70)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-700"></span>
            <span>Flags below 70 average / under review</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
            <span>No flagged households</span>
          </span>
        </div>

      </div>

    </div>
  );
};
