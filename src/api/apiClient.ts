/**
 * Welcome 24 — обёртка над fetch.
 *
 * Базовый URL берётся из VITE_API_URL (см. .env.local).
 * Для прода — VITE_API_URL должен быть проставлен в Vercel.
 * JWT хранится в localStorage ('w24_token') и автоматически
 * добавляется в Authorization-заголовок ко всем запросам.
 *
 * Использование:
 *   const me = await api.get<Agent>('/api/auth/me');
 *   const { token, user } = await api.post<{token: string; user: Agent}>('/api/auth/login', { email, password });
 */

const TOKEN_KEY = 'w24_token';

function detectApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:4000';
  }
  // На vercel пока бэка нет — оставим заглушку, чтобы fetch падал явно.
  return 'http://localhost:4000';
}

export const API_BASE_URL = detectApiUrl();

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Json = Record<string, unknown> | unknown[] | null;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function request<T>(method: string, path: string, body?: Json): Promise<T> {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  // Авто-ретрай ТОЛЬКО для идемпотентных GET (сеть/таймаут/5xx — с backoff).
  // POST/PATCH/DELETE не ретраим вообще: при таймауте клиент обрывает запрос у себя,
  // но сервер мог его получить и обработать — повтор создаёт дубли (заявки на оплату,
  // сообщения, записи в истории). Раньше не-GET ретраился «для холодного старта
  // Render»; теперь бэк на собственном VPS без холодных стартов — причина отпала.
  const retryable = method === 'GET';
  const maxAttempts = retryable ? 5 : 1;
  // GET — короткий таймаут (есть ретраи). Не-GET — одна попытка, поэтому ждём долго:
  // AI-чат (юрист/навигатор) генерирует ответ 15-40с+, с 15с-таймаутом он падал бы
  // «не удаётся подключиться». 120с = proxy_read_timeout nginx на сервере.
  const ATTEMPT_TIMEOUT = retryable ? 15000 : 120000; // мс на одну попытку
  const backoff = (n: number) => Math.min(800 * 2 ** (n - 1), 4000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT);
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (e: unknown) {
      // Сетевой сбой ИЛИ таймаут (abort) — запрос не завершился, повторяем (любой метод).
      if (attempt < maxAttempts) { await sleep(backoff(attempt)); continue; }
      throw new ApiError(
        'Не удаётся подключиться к серверу. Проверь что бэкенд запущен на ' + API_BASE_URL,
        0,
        e,
      );
    } finally {
      clearTimeout(timer);
    }

    // Сервер перезапускается (деплой) — повторяем (только идемпотентный GET).
    if (retryable && [502, 503, 504].includes(res.status) && attempt < maxAttempts) {
      await sleep(backoff(attempt));
      continue;
    }

    const text = await res.text();
    const json = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

    if (!res.ok) {
      // Токен невалиден — стереть. Но только если он всё ещё ТЕКУЩИЙ: запоздавший
      // 401 от запроса со старым токеном не должен затирать свежий токен,
      // который пользователь только что получил при логине.
      if (res.status === 401 && getToken() === token) setToken(null);
      const message = (json && typeof json === 'object' && 'error' in json && typeof (json as { error: unknown }).error === 'string')
        ? (json as { error: string }).error
        : `HTTP ${res.status}`;
      throw new ApiError(message, res.status, json);
    }

    return json as T;
  }
  // недостижимо
  throw new ApiError('Не удаётся подключиться к серверу', 0, null);
}

export const api = {
  get:  <T>(path: string)              => request<T>('GET',    path),
  post: <T>(path: string, body?: Json) => request<T>('POST',   path, body ?? {}),
  patch:<T>(path: string, body?: Json) => request<T>('PATCH',  path, body ?? {}),
  put:  <T>(path: string, body?: Json) => request<T>('PUT',    path, body ?? {}),
  del:  <T>(path: string)              => request<T>('DELETE', path),
};
