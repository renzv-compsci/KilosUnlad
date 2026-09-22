import { createContext, createElement, useContext, useMemo, useState } from 'react';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  REGIONAL_DIRECTOR: 'REGIONAL_DIRECTOR',
  CASE_WORKER: 'CASE_WORKER',
  COA_AUDITOR: 'COA_AUDITOR',
};

const roleProfiles = {
  [ROLES.SUPER_ADMIN]: {
    name: 'Markie Angelo',
    label: 'Super Admin',
    jurisdiction: 'National',
    authority: 'Full System View',
  },
  [ROLES.REGIONAL_DIRECTOR]: {
    name: 'Atty. Carmelita Mendoza',
    label: 'Regional Director',
    jurisdiction: 'Region IV-A',
    authority: 'Executive Administration',
  },
  [ROLES.CASE_WORKER]: {
    name: 'Marvin Bautista, RSW',
    label: 'Case Worker',
    jurisdiction: 'Calamba, Laguna',
    authority: 'Field PWA',
  },
  [ROLES.COA_AUDITOR]: {
    name: 'Engr. Roberto Santos',
    label: 'COA Auditor',
    jurisdiction: 'Audit View',
    authority: 'COA Oversight',
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRole] = useState(ROLES.REGIONAL_DIRECTOR);

  const value = useMemo(
    () => ({
      role,
      setRole,
      roles: ROLES,
      user: {
        role,
        ...roleProfiles[role],
      },
    }),
    [role],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
