// Реальный auth: POST /api/auth/login → JWT в localStorage + объект пользователя.
// Логика SSO/импернсонации сохранена (для перехода между порталом и админкой).

import { api, setToken, getToken, ApiError } from '../api/apiClient';

// Роли, которые могут пользоваться порталом. employee — как агент; referral_partner — только MLM/Акции/Профиль.
export type PortalRole = 'agent' | 'admin' | 'employee' | 'referral_partner' | string;

// Партнёр привлечения видит только эти разделы (+ привязка ботов в Профиле скрыта).
export const REFERRAL_PARTNER_PATHS = ['/team', '/shares', '/profile'];

export function isPortalPathAllowed(role: string | undefined, path: string): boolean {
  if (role === 'referral_partner') {
    return REFERRAL_PARTNER_PATHS.some(p => path === p || path.startsWith(p + '/'));
  }
  return true; // agent / employee / прочие — весь портал
}

export function portalDefaultPath(role: string | undefined): string {
  return role === 'referral_partner' ? '/team' : '/dashboard';
}

export interface AgentUser {
  id?: number;
  email: string;
  name: string;
  role: PortalRole;
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

    // Вход на портале всегда ведёт в портал (платформу) — независимо от роли.
    // Админ при необходимости перейдёт в админ-панель кнопкой в шапке портала.
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

const TOKEN_BACKUP_KEY = 'w24_token_backup';
const USER_BACKUP_KEY  = 'w24_agent_user_backup';

/** Read impersonation params from URL (set by admin panel) and persist them.
 *  Если пришёл impersonateToken — бэкапим текущие token/user и подменяем на агента. */
export function tryImpersonationFromUrl(): ImpersonationState | null {
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('impersonate');
  const impersonateToken = params.get('impersonateToken');
  if (!agentId) return null;

  // Если есть токен от админки — бэкапим старые и подменяем.
  if (impersonateToken) {
    // Если импersonation УЖЕ активна (админ кликнул «войти как» по второму агенту,
    // не выйдя из первого) — бэкап не трогаем: в нём лежит токен админа, а текущий
    // токен принадлежит агенту №1. Перезапись затёрла бы админский бэкап, и «выход»
    // возвращал бы в админку с агентским токеном (401, принудительный релогин).
    const alreadyImpersonating = !!localStorage.getItem(IMPERSONATION_KEY);
    if (!alreadyImpersonating) {
      const oldToken = localStorage.getItem('w24_token');
      const oldUser  = localStorage.getItem(USER_KEY);
      if (oldToken) localStorage.setItem(TOKEN_BACKUP_KEY, oldToken);
      if (oldUser)  localStorage.setItem(USER_BACKUP_KEY, oldUser);
    }
    setToken(impersonateToken);
    // Заглушка-user, чтобы PrivateRoute не редиректнул на /login до того,
    // как fetchMe подтянет реальные данные агента.
    const stubName = decodeURIComponent(params.get('agentName') || 'Агент');
    const stub: AgentUser = {
      id: Number(agentId),
      email: '',
      name: stubName,
      role: 'agent',
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem(USER_KEY, JSON.stringify(stub));
  }

  const state: ImpersonationState = {
    agentId: Number(agentId),
    agentName: decodeURIComponent(params.get('agentName') || 'Агент'),
    returnUrl: decodeURIComponent(params.get('returnUrl') || ADMIN_URL),
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
  const url = new URL(window.location.href);
  url.searchParams.delete('impersonate');
  url.searchParams.delete('impersonateToken');
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
  // Восстанавливаем токен и user админа из бэкапа.
  const backupToken = localStorage.getItem(TOKEN_BACKUP_KEY);
  const backupUser  = localStorage.getItem(USER_BACKUP_KEY);
  if (backupToken) {
    setToken(backupToken);
    localStorage.removeItem(TOKEN_BACKUP_KEY);
  }
  if (backupUser) {
    localStorage.setItem(USER_KEY, backupUser);
    localStorage.removeItem(USER_BACKUP_KEY);
  } else {
    // Нет бэкапа админа → стираем агентский токен/user, чтобы не зависнуть.
    setToken(null);
    localStorage.removeItem(USER_KEY);
  }
  if (state) window.location.href = state.returnUrl;
}

export function openAdminPanel() {
  window.location.href = `${ADMIN_URL}/dashboard`;
}
