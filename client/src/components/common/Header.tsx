import React from 'react';
import { UserSession } from '../../types/contracts';
import { MapPin, LogOut, ChevronDown, PanelLeftOpen } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { ScreenId } from '../../types/navigation';
import { SCREEN_GUIDE } from '../../utils/screenGuide';

interface HeaderProps {
  session: UserSession;
  onLogout: () => void;
  onOpenSidebar: () => void;
  sidebarCollapsed: boolean;
  currentScreen?: ScreenId;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLogout,
  onOpenSidebar,
  sidebarCollapsed,
  currentScreen,
}) => {
  const guide = currentScreen ? SCREEN_GUIDE[currentScreen] : undefined;
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    REGIONAL_DIRECTOR: 'Regional Director',
    CASE_WORKER: 'Case Worker',
    COA_AUDITOR: 'COA State Auditor',
  };
  const roleLabel = roleLabels[session.user.role] ?? session.user.role;
  const jurisdictionLabel = [
    session.user.jurisdiction.municipality,
    session.user.jurisdiction.region,
  ].filter(Boolean).join(', ');

  React.useEffect(() => {
    if (!dropdownOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setDropdownOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [dropdownOpen]);

  return (
    <header className="app-header">
      <div className="workspace-heading">
        <button
          type="button"
          className="sidebar-mobile-toggle icon-control"
          aria-label="Open navigation"
          title="Open navigation"
          aria-controls="app-sidebar"
          aria-expanded={!sidebarCollapsed}
          onClick={onOpenSidebar}
        >
          <PanelLeftOpen size={20} aria-hidden="true" />
        </button>
        <BrandLogo size={30} className="workspace-product-name" />
        {guide ? <span className="workspace-product-description workspace-page">
          <strong>{guide.title}</strong><span>{guide.hint}</span>
        </span> : <span className="workspace-product-description">Welfare Auditing MIS</span>}
      </div>

      <div className="profile-menu" ref={profileRef}>
        <button
          ref={triggerRef}
          id="user-profile-menu-btn"
          type="button"
          aria-label={`${session.user.full_name}, ${roleLabel}`}
          aria-expanded={dropdownOpen}
          aria-controls="officer-profile-menu"
          onClick={() => setDropdownOpen((open) => !open)}
        >
          <div className="profile-copy">
            <span>{session.user.full_name}</span>
            <small>{roleLabel}</small>
          </div>
          <span className="profile-avatar">{session.user.full_name.charAt(0)}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>

        {dropdownOpen && (
          <div id="officer-profile-menu" className="profile-dropdown">
            <strong>{session.user.full_name}</strong>
            <span>{session.user.username}</span>
            {jurisdictionLabel && <span className="profile-jurisdiction">
              <MapPin size={14} aria-hidden="true" />
              {jurisdictionLabel}
            </span>}
            <button id="header-logout-btn" type="button" onClick={() => {
              setDropdownOpen(false);
              onLogout();
            }}>
              <LogOut size={16} aria-hidden="true" />
              Log Out Session
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
