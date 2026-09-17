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
  },
  [ROLES.REGIONAL_DIRECTOR]: {
    name: 'Regional Director',
    label: 'Regional Director',
    jurisdiction: 'Region IV-A',
  },
  [ROLES.CASE_WORKER]: {
    name: 'Municipal Link',
    label: 'Case Worker',
    jurisdiction: 'Calamba, Laguna',
  },
  [ROLES.COA_AUDITOR]: {
    name: 'COA Inspector',
    label: 'COA Auditor',
    jurisdiction: 'Audit View',
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
