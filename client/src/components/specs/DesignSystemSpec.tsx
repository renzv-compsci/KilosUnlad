import React, { useState } from 'react';
import { 
  Palette, 
  Type, 
  MoveHorizontal, 
  MousePointerClick, 
  FormInput, 
  Tag, 
  Layers, 
  Table as TableIcon, 
  Navigation as NavIcon, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Search, 
  ChevronDown, 
  Copy, 
  ShieldCheck,
  Building2,
  Users,
  Scale,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const DesignSystemSpec: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'colors' | 'typography' | 'spacing' | 'buttons' | 'inputs' | 'badges' | 'cards' | 'tables' | 'navigation' | 'alerts'>('colors');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToken = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedToken(val);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  return (
    <div className="max-w-7xl mx-auto p-5 sm:p-7 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-[#132e4f] text-stone-100 p-6 rounded-2xl border border-[#1c3a5e] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded bg-amber-400 text-stone-900 font-mono text-xs font-bold shadow-2xs">
                CHAPTER 01
              </span>
              <span className="text-amber-200/90 font-mono text-xs font-medium">
                Figma Design System & Token Specification
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white mt-2">
              KilosUnlad Design System
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Standardized design tokens, accessible color palettes, typographic hierarchies, and reusable React components calibrated for DSWD Philippine Government MIS standards.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-white/10 text-stone-200 font-mono border border-white/10">
              WCAG AA Compliant (4.5:1)
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
              Tailwind CSS v4
            </span>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 mt-6 pt-4 border-t border-white/10">
          {[
            { id: 'colors', label: '1. Colors & Tokens', icon: Palette },
            { id: 'typography', label: '2. Typography', icon: Type },
            { id: 'spacing', label: '3. Spacing & Math', icon: MoveHorizontal },
            { id: 'buttons', label: '4. Buttons & Controls', icon: MousePointerClick },
            { id: 'inputs', label: '5. Inputs & Forms', icon: FormInput },
            { id: 'badges', label: '6. Badges & Chips', icon: Tag },
            { id: 'cards', label: '7. Cards & Panels', icon: Layers },
            { id: 'tables', label: '8. Tables & Data', icon: TableIcon },
            { id: 'navigation', label: '9. Navigation & Modals', icon: NavIcon },
            { id: 'alerts', label: '10. Alerts & Feedback', icon: Bell }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-stone-900 shadow-2xs font-bold'
                    : 'bg-white/10 text-stone-200 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Copy Toast Feedback */}
      {copiedToken && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-amber-300 font-mono text-xs px-3.5 py-2 rounded-xl shadow-lg border border-stone-700 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Copied to clipboard: {copiedToken}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. COLORS & DESIGN TOKENS */}
      {/* ============================================================ */}
      {activeSection === 'colors' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#132e4f]" />
              <span>Color System & Accessibility Ratios</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Sophisticated, high-contrast palette calibrated against strict WCAG AA rules. Banned: purple-to-blue gradients, cyan-on-dark, or arbitrary saturated neon glow.
            </p>

            {/* Color Swatch Groups */}
            <div className="space-y-6">
              {/* Primary Identity Colors */}
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                  Government & Institutional Brand
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: 'DSWD Navy (Primary)', hex: '#132e4f', role: 'Main headers, primary brand surfaces, modal titles', tw: 'bg-[#132e4f]' },
                    { name: 'Gov Navy Dark', hex: '#0c2340', role: 'High-contrast footers, dark status bars, active states', tw: 'bg-[#0c2340]' },
                    { name: 'Bagong Pilipinas Gold', hex: '#b48c36', role: 'Official gold accent, seal borders, key badges', tw: 'bg-[#b48c36]' },
                    { name: 'Gold Highlight', hex: '#f59e0b', role: 'Warning highlights, countdown progress bars', tw: 'bg-amber-500' }
                  ].map((c) => (
                    <div 
                      key={c.hex} 
                      onClick={() => copyToken(c.hex)}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200 hover:border-stone-400 transition cursor-pointer group"
                    >
                      <div className={`h-12 w-full rounded-lg ${c.tw} shadow-2xs mb-2 flex items-center justify-end p-2 text-white/70 opacity-90 group-hover:opacity-100`}>
                        <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <div className="font-bold text-stone-900 text-xs">{c.name}</div>
                      <div className="font-mono text-[11px] text-stone-500 font-semibold">{c.hex}</div>
                      <div className="text-[10px] text-stone-400 mt-1 leading-tight">{c.role}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semantic Severity & Status */}
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                  Semantic Status & Severity Colors
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: 'Critical / Danger', hex: '#be123c', bgHex: '#fff1f2', role: 'Critical risk, revoked eligibility, breach alerts', tw: 'bg-rose-700' },
                    { name: 'Warning / Review', hex: '#b45309', bgHex: '#fffbeb', role: 'Under appeal, pending investigation, Meralco warning', tw: 'bg-amber-700' },
                    { name: 'Success / Retain', hex: '#047857', bgHex: '#ecfdf5', role: 'Verified compliant, synced reports, cryptographic pass', tw: 'bg-emerald-700' },
                    { name: 'Informational / Note', hex: '#1d4ed8', bgHex: '#eff6ff', role: 'PhilSys verified, scheduled hearings, general notes', tw: 'bg-blue-700' }
                  ].map((c) => (
                    <div 
                      key={c.hex} 
                      onClick={() => copyToken(c.hex)}
                      className="p-3 bg-stone-50 rounded-xl border border-stone-200 hover:border-stone-400 transition cursor-pointer group"
                    >
                      <div className={`h-12 w-full rounded-lg ${c.tw} shadow-2xs mb-2 flex items-center justify-end p-2 text-white/70 opacity-90 group-hover:opacity-100`}>
                        <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <div className="font-bold text-stone-900 text-xs">{c.name}</div>
                      <div className="font-mono text-[11px] text-stone-500 font-semibold">Text: {c.hex}</div>
                      <div className="font-mono text-[10px] text-stone-400">Surface: {c.bgHex}</div>
                      <div className="text-[10px] text-stone-400 mt-1 leading-tight">{c.role}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warm/Cool Neutrals */}
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
                  Neutral Surface Scale (Stone & Slate)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
                  {[
                    { label: 'Surface 50', hex: '#fafaf9', tw: 'bg-stone-50 text-stone-800' },
                    { label: 'Border 200', hex: '#e7e5e4', tw: 'bg-stone-200 text-stone-800' },
                    { label: 'Divider 300', hex: '#d6d3d1', tw: 'bg-stone-300 text-stone-900' },
                    { label: 'Muted 500', hex: '#78716c', tw: 'bg-stone-500 text-white' },
                    { label: 'Body 700', hex: '#44403c', tw: 'bg-stone-700 text-white' },
                    { label: 'Heading 900', hex: '#1c1917', tw: 'bg-stone-900 text-white' }
                  ].map((n) => (
                    <div 
                      key={n.hex} 
                      onClick={() => copyToken(n.hex)}
                      className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 cursor-pointer hover:border-stone-400 transition"
                    >
                      <div className={`h-8 w-full rounded ${n.tw} flex items-center justify-center font-mono text-[10px] font-bold mb-1.5`}>
                        {n.hex}
                      </div>
                      <div className="text-[11px] font-medium text-stone-700">{n.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. TYPOGRAPHY */}
      {/* ============================================================ */}
      {activeSection === 'typography' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <Type className="w-5 h-5 text-[#132e4f]" />
              <span>Typographic Hierarchy & Scale Ratios</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Step ratio 1.25 (Major Second to Minor Third) for dense, flexible enterprise data tables and clean administrative readability.
            </p>

            <div className="space-y-4">
              {[
                { level: 'Display H1', font: 'Font Display (Plus Jakarta Sans / Sans-Serif)', size: '28px / 1.75rem', weight: 'Bold (700)', sample: 'Executive Regional Dashboard & GIS Casemix', usage: 'Primary screen titles and hero executive metrics' },
                { level: 'Section H2', font: 'Font Display', size: '20px / 1.25rem', weight: 'Bold (700)', sample: 'Triage Queue & Cross-Match Anomaly Docket', usage: 'Major panel headers and bento section titles' },
                { level: 'Card H3', font: 'Font Display', size: '16px / 1.0rem', weight: 'SemiBold (600)', sample: 'Household 4PS-04A-2026-00129 — Eduardo Dela Cruz', usage: 'Beneficiary cards, modal headers, and table section titles' },
                { level: 'Body Regular', font: 'Font Sans (Inter / System-UI)', size: '14px / 0.875rem', weight: 'Regular (400)', sample: 'Under Section 12 of RA 11310, cash transfers cannot be terminated without serving a formal 15-day notice.', usage: 'Standard narrative paragraphs, descriptions, and caseworker notes' },
                { level: 'Body Small / Meta', font: 'Font Sans', size: '12px / 0.75rem', weight: 'Medium (500)', sample: 'Barangay Makiling, Calamba City, Laguna · SLA Due: 2026-09-24', usage: 'Table subtexts, timestamp labels, helper captions' },
                { level: 'Monospace Code', font: 'Font Mono (JetBrains Mono / Courier)', size: '11px / 0.6875rem', weight: 'Bold (700)', sample: 'SHA-256: 4f89d3...c812 | PhilSys-9021-4412-8801', usage: 'Cryptographic hashes, PhilSys identifiers, API endpoints' }
              ].map((t, idx) => (
                <div key={idx} className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="w-48 shrink-0">
                    <span className="font-mono text-xs font-bold text-[#132e4f] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {t.level}
                    </span>
                    <div className="text-[11px] text-stone-500 mt-1">{t.size} · {t.weight}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-stone-900 font-medium" style={{ fontSize: t.size.split('/')[0] }}>
                      {t.sample}
                    </div>
                    <div className="text-[11px] text-stone-400 mt-1 italic">{t.usage}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SPACING & MATHEMATICAL RULES */}
      {/* ============================================================ */}
      {activeSection === 'spacing' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <MoveHorizontal className="w-5 h-5 text-[#132e4f]" />
              <span>Spacing System & Layout Math</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Rules strictly enforced: Outer container padding must always exceed inner element gaps; button horizontal padding must be exactly 2x vertical padding; nested border radii must satisfy <code>Inner Radius = Outer Radius - Padding</code>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 bg-stone-50 p-5 rounded-xl border border-stone-200">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Mathematical Layout Formulas
                </h3>
                <div className="space-y-2 text-xs text-stone-600">
                  <div className="p-3 bg-white rounded-lg border border-stone-200">
                    <span className="font-mono font-bold text-[#132e4f]">Rule 1: Button Padding Scale</span>
                    <p className="mt-1 text-stone-500">Horizontal padding = 2x vertical padding. E.g., <code>px-4 py-2</code> (16px / 8px) or <code>px-3 py-1.5</code> (12px / 6px).</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-stone-200">
                    <span className="font-mono font-bold text-[#132e4f]">Rule 2: Container Outer vs Inner</span>
                    <p className="mt-1 text-stone-500">Container padding (p-5 sm:p-7) $\ge$ inner item gaps (gap-3 to gap-4). Minimum container padding is 16px.</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-stone-200">
                    <span className="font-mono font-bold text-[#132e4f]">Rule 3: Nested Corner Radius</span>
                    <p className="mt-1 text-stone-500"><code>Inner Radius = Outer Radius - Padding</code>. E.g., Outer <code>rounded-2xl (16px)</code> with <code>p-4 (16px)</code> requires Inner <code>rounded-lg (8px)</code>.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-stone-50 p-5 rounded-xl border border-stone-200">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  8-Point Grid Scale in Pixels
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  {[
                    { token: 'space-1', px: '4px', tw: '0.25rem' },
                    { token: 'space-2', px: '8px', tw: '0.5rem' },
                    { token: 'space-3', px: '12px', tw: '0.75rem' },
                    { token: 'space-4', px: '16px', tw: '1.0rem' },
                    { token: 'space-5', px: '20px', tw: '1.25rem' },
                    { token: 'space-6', px: '24px', tw: '1.5rem' },
                    { token: 'space-8', px: '32px', tw: '2.0rem' },
                    { token: 'space-10', px: '40px', tw: '2.5rem' },
                    { token: 'space-12', px: '48px', tw: '3.0rem' }
                  ].map((s) => (
                    <div key={s.token} className="p-2 bg-white rounded border border-stone-200">
                      <div className="font-bold text-stone-900">{s.px}</div>
                      <div className="text-[10px] text-stone-400">{s.token}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. BUTTONS & CONTROLS */}
      {/* ============================================================ */}
      {activeSection === 'buttons' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-[#132e4f]" />
              <span>Button Variants & Interactive States</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Clear hierarchy: Primary DSWD Navy, Emerald Action, Danger Revoke, Secondary Outline, and Subtle Ghost.
            </p>

            <div className="space-y-4">
              {/* Primary DSWD Navy */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-xs text-stone-900">Primary Institutional Button</div>
                  <div className="text-[11px] text-stone-500 font-mono">bg-[#132e4f] text-white hover:bg-[#1a3d66] px-4 py-2 rounded-lg text-xs font-semibold</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-[#132e4f] text-white rounded-lg text-xs font-semibold hover:bg-[#1a3d66] transition cursor-pointer shadow-2xs">
                    Dispatch Task
                  </button>
                  <button disabled className="px-4 py-2 bg-[#132e4f]/50 text-white/70 rounded-lg text-xs font-semibold cursor-not-allowed">
                    Disabled
                  </button>
                </div>
              </div>

              {/* Action Emerald (Field / Verification) */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-xs text-stone-900">Field Action Emerald Button</div>
                  <div className="text-[11px] text-stone-500 font-mono">bg-emerald-800 text-white hover:bg-emerald-900 px-4 py-2 rounded-lg text-xs font-semibold</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900 transition cursor-pointer shadow-2xs">
                    Begin Field Visit
                  </button>
                  <button className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 opacity-90 cursor-wait">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Syncing...</span>
                  </button>
                </div>
              </div>

              {/* Secondary Outline */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-xs text-stone-900">Secondary Outline Button</div>
                  <div className="text-[11px] text-stone-500 font-mono">bg-white text-stone-800 border border-stone-300 hover:bg-stone-100 px-4 py-2 rounded-lg text-xs font-semibold</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-white text-stone-800 border border-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-100 transition cursor-pointer shadow-2xs">
                    View Dossier
                  </button>
                  <button className="px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-md text-xs font-medium transition cursor-pointer">
                    Inspect Hash
                  </button>
                </div>
              </div>

              {/* Destructive Danger */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-xs text-stone-900">Destructive / Revoke Button</div>
                  <div className="text-[11px] text-stone-500 font-mono">bg-rose-700 text-white hover:bg-rose-800 px-4 py-2 rounded-lg text-xs font-semibold</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800 transition cursor-pointer shadow-2xs">
                    Finalize Revocation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. INPUTS & FORMS */}
      {/* ============================================================ */}
      {activeSection === 'inputs' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <FormInput className="w-5 h-5 text-[#132e4f]" />
              <span>Form Fields, Selectors & Toggles</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Inputs feature subtle neutral borders (border-stone-300), high-contrast active focus rings (focus:ring-2 focus:ring-[#132e4f]), and clear helper validation text.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Text Input with Search Icon */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  Beneficiary Search (PhilSys / 4Ps ID)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. 4PS-04A-2026 or Eduardo..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#132e4f]"
                    readOnly
                  />
                </div>
                <span className="text-[10px] text-stone-400">Press Enter to search live index</span>
              </div>

              {/* Select Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  Assign Municipal Link
                </label>
                <div className="relative">
                  <select 
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#132e4f] appearance-none"
                    defaultValue="marvin"
                  >
                    <option value="marvin">Marvin Bautista, RSW (Calamba Cluster)</option>
                    <option value="elena">Elena Ramos, RSW (Makiling Cluster)</option>
                    <option value="dante">Dante Alcantara, RSW (Canlubang Cluster)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Boolean Radio Button Group */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  LandBank Cash Card in Physical Custody? (Anti-Sangla)
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 text-xs text-stone-800 cursor-pointer">
                    <input type="radio" name="demo_card" defaultChecked className="text-[#132e4f] focus:ring-[#132e4f]" />
                    <span>Yes, Card Presented</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-stone-800 cursor-pointer">
                    <input type="radio" name="demo_card" className="text-[#132e4f] focus:ring-[#132e4f]" />
                    <span>No, Pawning Suspected</span>
                  </label>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  Statutory Hearing Date
                </label>
                <input
                  type="date"
                  defaultValue="2026-10-08"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#132e4f]"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. BADGES & STATUS CHIPS */}
      {/* ============================================================ */}
      {activeSection === 'badges' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#132e4f]" />
              <span>Status Badges & Cross-Match Indicators</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Semantic badges for composite anomaly detection and statutory lifecycle transitions. Never wrap or truncate text inside a pill.
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Risk Severity Badges
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                    CRITICAL (Si ≥ 85)
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                    HIGH (Si ≥ 70)
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    MEDIUM (Si ≥ 50)
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                    LOW (Si &lt; 50)
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Cross-Registry Anomaly Trigger Pills
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    <span>Meralco: 385 kWh (&gt;200 Lifeline)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                    <span>LTO: Toyota Vios 2021 (4-Wheel)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>SWDI Inversion: Level 1 vs 3</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Livelihood Motorcycle Verified</span>
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Statutory Due Process Lifecycle Badges
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                    15-Day Notice Active
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                    Under Appeal Hearing (Paused)
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Reinstated (Compliant)
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                    Graduated from 4Ps
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. CARDS & PANELS */}
      {/* ============================================================ */}
      {activeSection === 'cards' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#132e4f]" />
              <span>Card Layouts & Unboxed Metrics</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Card surfaces avoid arbitrary drop-shadows or 1px ghost hairline combinations. Instead, we use clean single-tone borders (border-stone-200/90) and generous whitespace.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Metric Card */}
              <div className="p-5 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
                <div className="text-xs font-semibold text-stone-500">Flagged Discrepancies</div>
                <div className="text-3xl font-black text-stone-900 font-display mt-2">32</div>
                <div className="text-[11px] text-rose-700 mt-1 font-medium">Composite Risk Score $S_i \ge 70$</div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
                <div className="text-xs font-semibold text-stone-500">Active Field Dispatches</div>
                <div className="text-3xl font-black text-stone-900 font-display mt-2">24</div>
                <div className="text-[11px] text-emerald-700 mt-1 font-medium">Assigned to Municipal Links</div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-stone-200/90 shadow-2xs">
                <div className="text-xs font-semibold text-stone-500">COA Audit Compliance</div>
                <div className="text-3xl font-black text-stone-900 font-display mt-2">94.2%</div>
                <div className="text-[11px] text-emerald-700 mt-1 font-medium">Circular 2024-008 Adherence</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. DATA TABLES */}
      {/* ============================================================ */}
      {activeSection === 'tables' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-[#132e4f]" />
              <span>Data Tables & Tabular Alignment</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Header row uses <code>text-[11px] font-mono uppercase text-stone-500</code>. Number cells are right-aligned or paired with progress bars.
            </p>

            <div className="border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100/80 text-stone-600 font-mono text-[10px] uppercase border-b border-stone-200">
                    <th className="p-3">Household ID</th>
                    <th className="p-3">Head of Household</th>
                    <th className="p-3">Jurisdiction</th>
                    <th className="p-3">Risk Score</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-mono font-bold text-[#132e4f]">4PS-04A-2026-00129</td>
                    <td className="p-3 font-semibold text-stone-900">Eduardo Dela Cruz</td>
                    <td className="p-3 text-stone-600">Makiling, Calamba</td>
                    <td className="p-3 font-mono font-bold text-rose-700">84.0 / 100</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        CRITICAL
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="px-3 py-1 bg-[#132e4f] text-white rounded-md text-[11px] font-semibold hover:bg-[#1a3d66]">
                        Dispatch
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-stone-50">
                    <td className="p-3 font-mono font-bold text-[#132e4f]">4PS-04A-2026-00341</td>
                    <td className="p-3 font-semibold text-stone-900">Maria Clara Santos</td>
                    <td className="p-3 text-stone-600">Sinalhan, Santa Rosa</td>
                    <td className="p-3 font-mono font-bold text-amber-700">76.5 / 100</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        HIGH
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="px-3 py-1 bg-[#132e4f] text-white rounded-md text-[11px] font-semibold hover:bg-[#1a3d66]">
                        Dispatch
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. NAVIGATION & MODALS */}
      {/* ============================================================ */}
      {activeSection === 'navigation' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <NavIcon className="w-5 h-5 text-[#132e4f]" />
              <span>Navigation Hierarchy & Modal Overlays</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Three-tier navigation: Official government masthead on top, followed by role-isolated application bar and role-specific sidebar.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <span className="font-bold text-xs text-stone-900">Breadcrumb Pattern</span>
                <div className="flex items-center space-x-1.5 text-xs text-stone-500">
                  <span>Portal</span>
                  <span>›</span>
                  <span>Executive Administration</span>
                  <span>›</span>
                  <span className="font-bold text-stone-900">Triage Docket</span>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <span className="font-bold text-xs text-stone-900">Modal Specifications</span>
                <p className="text-[11px] text-stone-500">
                  Fixed backdrop: <code>bg-black/50 backdrop-blur-xs</code>. Traps focus, handles ESC dismissal, and includes sticky submit and cancel buttons.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. ALERTS & FEEDBACK */}
      {/* ============================================================ */}
      {activeSection === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
            <h2 className="text-lg font-bold text-stone-900 font-display mb-1 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#132e4f]" />
              <span>Alert Banners & System Feedback</span>
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              High-contrast contextual alert banners and transient toast notifications.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 flex items-start gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Cryptographic Chain Verified: All 1,048 Blocks Valid</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">SHA-256 Merkle root hash matches GovCloud Central Ledger (Block #1048).</div>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 text-amber-950 rounded-xl border border-amber-200 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Statutory 15-Day Appeal Window Active (RA 11310)</div>
                  <div className="text-[11px] text-amber-800 mt-0.5">Beneficiary cash grant remains active during the 15-day notice contestation period.</div>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50 text-rose-950 rounded-xl border border-rose-200 flex items-start gap-3 text-xs">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Lifeline Breach Detected: Meralco Consumption Exceeds 200 kWh</div>
                  <div className="text-[11px] text-rose-800 mt-0.5">Household billed 385 kWh in August 2026. On-site caseworker verification dispatched.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
