// Реальный auth: POST /api/auth/login → JWT в localStorage + объект пользователя.
// Логика SSO/импернсонации сохранена (для перехода между порталом и админкой).

import { api, setToken, getToken, ApiError } from '../api/apiClient';

export interface AgentUser {
  id?: number;
  email: string;
  name: string;
  role: 'agent' | 'admin';
  loginAt: string;
  // Дополнительные поля из бэка — пробрасываются как есть.
  [key: string]: unknown;
}

export interface ImpersonationState {
  agentId: number;
  agentName: string;
  returnUrl: string;
  startedAt: string;
}

const USER_KEY = 'w24_agent_user';
const IMPERSONATION_KEY = 'w24_impersonation';

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
  return window.location.origin;
}
export const PORTAL_URL = detectPortalUrl();
export const ADMIN_URL = detectAdminUrl();

interface LoginResponse {
  token: string;
  user: Record<string, unknown> & { id: number; email: string; name: string; role: 'agent' | 'admin' };
}

export async function loginAgent(
  email: string,
  password: string,
): Promise<{ ok: true; user: AgentUser } | { ok: false; error: string; redirectTo?: string }> {
  const e = email.trim().toLowerCase();
  if (!e) return { ok: false, error: 'Введите email' };
  if (!password) return { ok: false, error: 'Введите пароль' };

  try {
    const data = await api.post<LoginResponse>('/api/auth/login', { email: e, password });

    // Если на портал зашёл админ — отправляем его в админку (SSO ему нужен будет ещё раз войти, увы)
    if (data.user.role === 'admin' && e !== 'mk@w24.agency') {
      // mk@w24.agency — гибридный (CEO работает и как агент), оставляем
      setToken(null);
      return {
        ok: false,
        error: 'Это администраторский email. Перенаправляем в админ-панель…',
        redirectTo: `${ADMIN_URL}/login?ssoEmail=${encodeURIComponent(e)}`,
      };
    }

    setToken(data.token);
    const user: AgentUser = {
      ...data.user,
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return { ok: true, user };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Не удалось войти. Попробуйте ещё раз.' };
  }
}

export function logoutAgent() {
  // Best-effort logout на бэке (можно в фоне).
  api.post('/api/auth/logout').catch(() => { /* ignore */ });
  setToken(null);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(IMPERSONATION_KEY);
}

export function getCurrentAgent(): AgentUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Подтверждает токен на бэке и обновляет user в localStorage. Если 401 — стираем. */
export async function fetchMe(): Promise<AgentUser | null> {
  if (!getToken()) {
    // Нет токена — но в LS мог остаться старый объект user. Чистим, чтобы UI
    // не рисовал имя при фактически разлогиненном состоянии.
    localStorage.removeItem(USER_KEY);
    return null;
  }
  try {
    const fresh = await api.get<Record<string, unknown> & { id: number; email: string; name: string; role: 'agent' | 'admin' }>('/api/auth/me');
    const user: AgentUser = { ...fresh, loginAt: new Date().toISOString() };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      localStorage.removeItem(USER_KEY);
      return null;
    }
    // Бэк недоступен — оставляем кэш localStorage, чтобы UI не разваливался.
    return getCurrentAgent();
  }
}

/** SSO из URL: просто префиллим email (пароль вводит пользователь). */
export function trySsoFromUrl(): { ssoEmail: string } | null {
  const params = new URLSearchParams(window.location.search);
  const ssoEmail = params.get('ssoEmail');
  if (!ssoEmail) return null;
  // Чистим только этот параметр
  const url = new URL(window.location.href);
  url.searchParams.delete('ssoEmail');
  window.history.replaceState({}, '', url.pathname + url.search);
  return { ssoEmail };
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
