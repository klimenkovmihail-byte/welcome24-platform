import { useEffect, useState } from 'react';
import { casesApi, type CaseItem } from '../api/cases';
import { adRequestsApi, type AdRequest } from '../api/adRequests';

// Singleton-поллер заявок: и Sidebar, и страница «Заявки» раньше независимо
// дёргали casesApi.list()+adRequestsApi.list() каждые 20с (двойная нагрузка).
// Теперь — ОДИН цикл на всё приложение, с паузой при скрытой вкладке.

export interface RequestsData { cases: CaseItem[]; adRequests: AdRequest[] }

const INTERVAL = 20000;
let cache: RequestsData = { cases: [], adRequests: [] };
const subscribers = new Set<(d: RequestsData) => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

async function fetchOnce() {
  if (inFlight) return;
  inFlight = true;
  try {
    const [c, a] = await Promise.all([
      casesApi.list().catch(() => [] as CaseItem[]),
      adRequestsApi.list().catch(() => [] as AdRequest[]),
    ]);
    cache = { cases: c, adRequests: a };
    subscribers.forEach(cb => cb(cache));
  } finally {
    inFlight = false;
  }
}

function start() {
  if (timer || (typeof document !== 'undefined' && document.hidden)) return;
  fetchOnce();
  timer = setInterval(() => { if (!document.hidden) fetchOnce(); }, INTERVAL);
}
function stop() {
  if (timer) { clearInterval(timer); timer = null; }
}
function onVisibility() {
  if (document.hidden) stop();
  else if (subscribers.size > 0) start();
}

export function useRequestsData(): RequestsData {
  const [data, setData] = useState<RequestsData>(cache);
  useEffect(() => {
    const cb = (d: RequestsData) => setData(d);
    subscribers.add(cb);
    if (subscribers.size === 1) {
      document.addEventListener('visibilitychange', onVisibility);
      start();
    } else {
      setData(cache);   // отдать текущий кэш сразу
      fetchOnce();      // и обновить
    }
    return () => {
      subscribers.delete(cb);
      if (subscribers.size === 0) {
        stop();
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, []);
  return data;
}
