import React from 'react';
import { UserSession } from '../../types/contracts';
import { ShieldCheck, UserCheck, MapPin, Building2, LogOut, ChevronDown, Users, Scale, Laptop } from 'lucide-react';

interface HeaderProps {
  session: UserSession;
  onLogout: () => void;
  onSwitchUser: (roleKey: string) => void;
  showSpecAnnotations?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  onSwitchUser,
  showSpecAnnotations = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'DSWD_DIRECTOR':
        return 'Regional Director (Admin)';
      case 'MUNICIPAL_LINK':
        return 'Municipal Link (Field)';
      case 'GRIEVANCE_OFFICER':
        return 'Grievance Officer (Appeals)';
      case 'COA_AUDITOR':
        return 'COA State Auditor (Audit)';
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'DSWD_DIRECTOR':
        return 'bg-blue-50/80 text-[#132e4f] border-blue-200';
      case 'MUNICIPAL_LINK':
        return 'bg-emerald-50/80 text-emerald-900 border-emerald-200';
      case 'GRIEVANCE_OFFICER':
        return 'bg-amber-50/80 text-amber-950 border-amber-200';
      case 'COA_AUDITOR':
        return 'bg-stone-100 text-stone-800 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <header className="bg-white border-b border-stone-200/90 relative z-40">
      {/* Official Government Masthead (Gov.ph standard) */}
      <div className="bg-stone-100/80 border-b border-stone-200/70 text-[11px] text-stone-600 px-4 sm:px-6 lg:px-8 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Philippine Flag SVG */}
            <svg 
              className="w-4 h-3 rounded-[1px] shadow-xs shrink-0" 
              viewBox="0 0 24 16" 
              aria-hidden="true"
            >
              <rect width="24" height="8" fill="#0038a8" />
              <rect y="8" width="24" height="8" fill="#ce1126" />
              <polygon points="0,0 12,8 0,16" fill="#ffffff" />
              <circle cx="4" cy="8" r="1.5" fill="#fcd116" />
            </svg>
            <span className="font-medium text-stone-700">
              An official website of the Republic of the Philippines
            </span>
            <span className="text-stone-300 hidden sm:inline">•</span>
            <span className="hidden sm:inline text-stone-500 font-serif-accent italic">
              Kagawaran ng Kagalingang Panlipunan at Pagpapaunlad
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-stone-500">
            <span className="hidden md:inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              Role Isolation Enforced
            </span>
            <span className="text-stone-400">RA 11310 & COA 2024-008</span>
          </div>
        </div>
      </div>

      {/* Spec Annotation Badge */}
      {showSpecAnnotations && (
        <div className="bg-amber-50 text-amber-950 font-mono text-[10px] px-3 py-1 font-semibold flex justify-between items-center border-b border-amber-200">
          <span>Global Header: Multi-Persona Role Isolation Architecture</span>
          <span>Current Role: {session.user.role} · User: {session.user.full_name}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Official Seals & System Title */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="flex items-center space-x-2">
              {/* Bagong Pilipinas Badge */}
              <div 
                id="bagong-pilipinas-logo-badge"
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-0.5 border border-stone-200 shadow-xs"
                title="Republic of the Philippines - Bagong Pilipinas"
              >
                <div className="w-full h-full rounded-full bg-[#0c2340] border border-amber-400/70 flex flex-col items-center justify-center text-center p-0.5">
                  <div className="text-[7.5px] font-black tracking-tighter text-amber-300 leading-none">
                    PILIPINAS
                  </div>
                  <div className="w-4 h-[1px] bg-red-500 my-0.5"></div>
                  <div className="text-[6.5px] font-semibold text-white/90 leading-none">
                    DSWD
                  </div>
                </div>
              </div>

              {/* DSWD Seal Badge */}
              <div 
                id="dswd-logo-badge"
                className="w-10 h-10 rounded-full bg-[#132e4f] border border-amber-400/80 flex items-center justify-center text-[10px] font-bold text-amber-300 shadow-xs"
                title="Department of Social Welfare and Development"
              >
                <div className="text-center leading-none">
                  <div className="text-[9px] font-black tracking-wider text-amber-300">DSWD</div>
                  <div className="text-[6px] text-amber-200/80 font-normal">4Ps MIS</div>
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-semibold text-stone-500 tracking-wide uppercase">
                  Republic of the Philippines
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight font-display flex items-center gap-1.5">
                <span>KilosUnlad</span>
                <span className="text-xs font-normal text-stone-400 hidden xl:inline">
                  — Dedicated Caseworker Personas
                </span>
              </h1>
            </div>
          </div>

          {/* Center: Quick Persona Role Switcher Segmented Control */}
          <div className="hidden lg:flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/90 shadow-2xs">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-2 font-mono">
              Persona:
            </span>
            
            {/* Director Button */}
            <button
              id="quick-switch-director-btn"
              onClick={() => onSwitchUser('director')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                session.user.role === 'DSWD_DIRECTOR'
                  ? 'bg-white text-[#132e4f] shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Director (Admin)</span>
            </button>

            {/* Municipal Link Button */}
            <button
              id="quick-switch-municipal-btn"
              onClick={() => onSwitchUser('municipal_link')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                session.user.role === 'MUNICIPAL_LINK'
                  ? 'bg-white text-emerald-800 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Municipal Link</span>
            </button>

            {/* Grievance Officer Button */}
            <button
              id="quick-switch-grievance-btn"
              onClick={() => onSwitchUser('grievance_officer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                session.user.role === 'GRIEVANCE_OFFICER'
                  ? 'bg-white text-amber-950 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Grievance Officer</span>
            </button>

            {/* COA Auditor Button */}
            <button
              id="quick-switch-coa-btn"
              onClick={() => onSwitchUser('coa_auditor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                session.user.role === 'COA_AUDITOR'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200/90'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>COA Auditor</span>
            </button>
          </div>

          {/* User Profile & Jurisdiction Bar */}
          <div className="flex items-center space-x-3 shrink-0">
            
            {/* User Session Info Card */}
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2.5 bg-stone-50 hover:bg-stone-100/90 border border-stone-200/90 rounded-lg px-3 py-1.5 text-left transition cursor-pointer shadow-2xs"
              >
                <div className="w-7 h-7 rounded-full bg-[#132e4f] text-amber-300 font-semibold flex items-center justify-center text-xs shadow-2xs">
                  {session.user.full_name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-stone-900 leading-tight">
                    {session.user.full_name}
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-stone-500 mt-0.5">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${getRoleBadgeStyle(session.user.role)}`}>
                      {getRoleLabel(session.user.role)}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 ml-1" />
              </button>

              {/* Role Switcher & Sign Out Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-stone-200/90 py-1.5 z-50 text-stone-800 animate-in fade-in-50 duration-100">
                  <div className="px-3.5 py-2.5 border-b border-stone-100">
                    <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                      Current Active Officer
                    </p>
                    <p className="text-xs font-bold text-stone-900 mt-0.5">{session.user.full_name}</p>
                    <p className="text-[11px] text-stone-500 font-mono">{session.user.username}</p>
                    <p className="text-[10px] text-stone-500 mt-1 flex items-center">
                      <MapPin className="w-3 h-3 mr-1 text-stone-400" />
                      {session.user.jurisdiction.municipality} ({session.user.jurisdiction.region})
                    </p>
                  </div>

                  <div className="p-1.5">
                    <p className="px-2.5 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Switch Role Persona:
                    </p>
                    <button
                      id="switch-director-btn"
                      onClick={() => {
                        onSwitchUser('director');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-stone-50 rounded-lg flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-stone-800">Regional Director</div>
                        <div className="text-[10px] text-stone-500">Atty. Carmelita Mendoza</div>
                      </div>
                      <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-medium border border-blue-200/60">Admin</span>
                    </button>
                    <button
                      id="switch-municipal-link-btn"
                      onClick={() => {
                        onSwitchUser('municipal_link');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-stone-50 rounded-lg flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-stone-800">Municipal Link</div>
                        <div className="text-[10px] text-stone-500">Marvin Bautista, RSW</div>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-medium border border-emerald-200/60">Field</span>
                    </button>
                    <button
                      id="switch-grievance-btn"
                      onClick={() => {
                        onSwitchUser('grievance_officer');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-stone-50 rounded-lg flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-stone-800">Grievance Officer</div>
                        <div className="text-[10px] text-stone-500">Rochelle Castillo, MSSW</div>
                      </div>
                      <span className="text-[10px] bg-amber-50 text-amber-950 px-1.5 py-0.5 rounded font-medium border border-amber-200/60">Appeals</span>
                    </button>
                    <button
                      id="switch-coa-auditor-btn"
                      onClick={() => {
                        onSwitchUser('coa_auditor');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-stone-50 rounded-lg flex items-center justify-between transition cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-stone-800">COA State Auditor</div>
                        <div className="text-[10px] text-stone-500">Engr. Roberto Santos, CPA</div>
                      </div>
                      <span className="text-[10px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded font-medium border border-amber-200/60">Audit</span>
                    </button>
                  </div>

                  <div className="border-t border-stone-100 pt-1 px-1.5">
                    <button
                      id="header-logout-btn"
                      onClick={() => {
                        onLogout();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded-lg flex items-center space-x-2 transition cursor-pointer font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
