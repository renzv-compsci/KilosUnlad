import type { UserRole, UserSession } from '../types/contracts';

export const USER_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'REGIONAL_DIRECTOR', 'CASE_WORKER', 'COA_AUDITOR'];
export const TOKEN_KEY = 'kilosunlad_access_token';
export const SESSION_KEY = 'kilosunlad_session';

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}

function decodeTokenPart(value: string): any {
  return JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/')));
}

// This is a client expiry/shape check, not JWT signature verification. The API
// remains authoritative for authentication, current account status and RBAC.
export function parseSession(payload: any, now = Date.now()): UserSession {
  const token = payload?.access_token;
  const user = payload?.user;
  if (typeof token !== 'string' || !user || !isUserRole(user.role) ||
      typeof user.user_id !== 'string' || !/^[a-f\d]{24}$/i.test(user.user_id) ||
      typeof user.username !== 'string' || !user.username ||
      typeof user.full_name !== 'string' || !user.full_name) {
    throw new Error('The server returned an unsupported login session.');
  }
  const parts = token.split('.');
  if (parts.length !== 3 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
    throw new Error('A real JWT is required. Disable backend Phase 1 mock mode.');
  }
  let claims: any;
  let header: any;
  try { header = decodeTokenPart(parts[0]); claims = decodeTokenPart(parts[1]); }
  catch { throw new Error('The server returned an invalid access token.'); }
  if (header.alg !== 'HS256' || claims.role !== user.role || claims.userId !== user.user_id ||
      !Number.isFinite(claims.exp) || claims.exp * 1000 <= now ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf * 1000 > now))) {
    throw new Error('The login session is expired or invalid. Please sign in again.');
  }
  const jurisdiction = user.jurisdiction;
  if (!jurisdiction || !['region', 'province', 'municipality'].every((key) => typeof jurisdiction[key] === 'string') ||
      !Array.isArray(jurisdiction.assigned_barangays) || !jurisdiction.assigned_barangays.every((item: unknown) => typeof item === 'string')) {
    throw new Error('The server returned an invalid jurisdiction.');
  }
  return { access_token: token, expires_at: claims.exp * 1000, user: {
    user_id: user.user_id, username: user.username, full_name: user.full_name,
    role: user.role, jurisdiction,
  } };
}

export function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* Sign-out must still clear the in-memory UI when storage is blocked. */ }
}

export function saveSession(session: UserSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(TOKEN_KEY, session.access_token);
  } catch {
    clearStoredSession();
    throw new Error('Browser session storage is unavailable. Enable it before signing in.');
  }
}

export function readStoredSession(): UserSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) { clearStoredSession(); return null; }
    const session = parseSession(JSON.parse(value));
    if (session.access_token !== sessionStorage.getItem(TOKEN_KEY)) throw new Error('Session mismatch');
    return session;
  } catch { clearStoredSession(); return null; }
}
