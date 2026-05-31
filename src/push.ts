/* Web Push — клиентская логика подписки на PWA-уведомления.
 *
 * Поток:
 *  1) регистрируем service worker (/sw.js)
 *  2) берём VAPID public key с бэка
 *  3) запрашиваем разрешение у пользователя
 *  4) подписываемся через pushManager и шлём подписку на бэк
 *
 * iOS: push работает ТОЛЬКО если портал добавлен на домашний экран
 * (standalone, iOS 16.4+). В обычном Safari API подписки отсутствует.
 */

import { agentsApi } from './api/agents';

export type PushState =
  | 'unsupported'   // браузер не умеет push
  | 'ios-needs-install' // iOS, но не установлено на экран
  | 'server-off'    // VAPID-ключи не настроены на бэке
  | 'denied'        // пользователь запретил в браузере
  | 'subscribed'    // подписка активна
  | 'default';      // можно предложить включить

// base64url → Uint8Array (для applicationServerKey).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  // iOS использует navigator.standalone; остальные — display-mode media query.
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

let swReg: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swReg = await navigator.serviceWorker.register('/sw.js');
    return swReg;
  } catch {
    return null;
  }
}

async function getReg(): Promise<ServiceWorkerRegistration | null> {
  if (swReg) return swReg;
  if (!('serviceWorker' in navigator)) return null;
  swReg = (await navigator.serviceWorker.ready.catch(() => null)) as ServiceWorkerRegistration | null;
  return swReg;
}

// Текущее состояние push для UI (тумблер/баннер).
export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) {
    return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported';
  }
  // Сервер настроен?
  let serverOn = false;
  try {
    const { enabled } = await agentsApi.pushKey();
    serverOn = enabled;
  } catch {
    serverOn = false;
  }
  if (!serverOn) return 'server-off';

  if (Notification.permission === 'denied') return 'denied';

  const reg = await getReg();
  const existing = reg ? await reg.pushManager.getSubscription() : null;
  if (existing && Notification.permission === 'granted') return 'subscribed';
  return 'default';
}

// Включить push: запросить разрешение + подписаться + отправить на бэк.
// Возвращает итоговое состояние.
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) {
    return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported';
  }

  const { enabled, publicKey } = await agentsApi.pushKey().catch(() => ({ enabled: false, publicKey: '' }));
  if (!enabled || !publicKey) return 'server-off';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';

  const reg = (await registerServiceWorker()) || (await getReg());
  if (!reg) return 'unsupported';

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
    await agentsApi.pushSubscribe({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent,
    });
  }
  return 'subscribed';
}

// Выключить push: отписать устройство и убрать с бэка.
export async function disablePush(): Promise<PushState> {
  const reg = await getReg();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await agentsApi.pushUnsubscribe(endpoint).catch(() => {});
  }
  return 'default';
}
