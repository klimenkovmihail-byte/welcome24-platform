// Demo auth (no real backend). In production: JWT cookie on .welcome24.ru domain.

export interface AgentUser {
  email: string;
  name: string;
  role: 'agent' | 'admin';
  loginAt: string;
}

export interface ImpersonationState {
  agentId: number;
  agentName: string;
  returnUrl: string;
  startedAt: string;
}

const USER_KEY = 'w24_agent_user';
const IMPERSONATION_KEY = 'w24_impersonation';
const ADMIN_EMAILS = ['admin@w24.agency'];

// URL'ы автоматически выбираются:
//  1) env-переменная (если задана на Vercel) — приоритет
//  2) если домен с "-platform" — заменяем на "-admin" (для текущего Vercel-демо)
//  3) localhost для dev
//  4) дефолт welcome24.ru
function detectAdminUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:5174';
  const fromEnv = import.meta.env.VITE_ADMIN_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5174';
  if (host.includes('welcome24-platform')) {
    return `${window.location.protocol}//${host.replace('welcome24-platform', 'welcome24-admin')}`;
  }
  if (host.includes('app.welcome24')) {
    return `${window.location.protocol}//${host.replace('app.welcome24', 'admin.welcome24')}`;
  }
  return 'https://welcome24-admin.vercel.app';
}
function detectPortalUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:5173';
  const fromEnv = import.meta.env.VITE_PORTAL_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:5173';
  // Если мы УЖЕ на портале — отдадим текущий origin
  return window.location.origin;
}
export const PORTAL_URL = detectPortalUrl();
export const ADMIN_URL = detectAdminUrl();

export function loginAgent(email: string): { ok: true; user: AgentUser } | { ok: false; error: string; redirectTo?: string } {
  const e = email.trim().toLowerCase();
  if (!e) return { ok: false, error: 'Введите email' };

  // Admin emails → bounce to admin
  if (ADMIN_EMAILS.includes(e)) {
    return { ok: false, error: 'Это администраторский email. Перенаправляем в админ-панель…', redirectTo: `${ADMIN_URL}/login?ssoEmail=${encodeURIComponent(e)}` };
  }

  // Treat anything else as a valid agent
  const user: AgentUser = {
    email: e,
    name: e === 'mk@w24.agency' ? 'Клименков Михаил Михайлович' : 'Агент Welcome 24',
    role: e === 'mk@w24.agency' ? 'admin' : 'agent', // mk@w24 is also an admin → дополнительная кнопка в шапке
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { ok: true, user };
}

export function logoutAgent() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(IMPERSONATION_KEY);
}

export function getCurrentAgent(): AgentUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function trySsoFromUrl(): AgentUser | null {
  const params = new URLSearchParams(window.location.search);
  const ssoEmail = params.get('ssoEmail');
  if (!ssoEmail) return null;
  const result = loginAgent(ssoEmail);
  if (result.ok) {
    window.history.replaceState({}, '', window.location.pathname);
    return result.user;
  }
  return null;
}

/** Read impersonation params from URL (set by admin panel) and persist them. */
export function tryImpersonationFromUrl(): ImpersonationState | null {
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('impersonate');
  if (!agentId) return null;
  const state: ImpersonationState = {
    agentId: Number(agentId),
    agentName: decodeURIComponent(params.get('agentName') || 'Агент'),
    returnUrl: decodeURIComponent(params.get('returnUrl') || ADMIN_URL),
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
  // Clean impersonation params from URL but keep current path
  const url = new URL(window.location.href);
  url.searchParams.delete('impersonate');
  url.searchParams.delete('agentName');
  url.searchParams.delete('returnUrl');
  window.history.replaceState({}, '', url.pathname + url.search);
  return state;
}

export function getImpersonation(): ImpersonationState | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function exitImpersonation() {
  const state = getImpersonation();
  localStorage.removeItem(IMPERSONATION_KEY);
  if (state) window.location.href = state.returnUrl;
}

export function openAdminPanel() {
  window.location.href = `${ADMIN_URL}/dashboard`;
}
