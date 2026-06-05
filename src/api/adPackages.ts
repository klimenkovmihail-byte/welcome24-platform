/**
 * api/adPackages (портал) — Отдел рекламы: сбор пакета. Агент видит открытые сборы
 * и подаёт заявку (город + кол-во по категориям); сумма считается из прайса площадки.
 */
import { api } from './apiClient';

export type Platform = 'cian' | 'avito' | 'domclick';
export const PKG_PLATFORM_LABEL: Record<string, string> = { cian: 'ЦИАН', avito: 'Авито', domclick: 'ДомКлик' };

export interface AdCategory { id: number; key: string; label: string; deal_type: 'sale' | 'rent'; sort_idx: number; }
export type DriveStatus = 'open' | 'closed' | 'paid';

export interface Drive {
  id: number; platform: Platform; platform_label: string; title: string; note: string;
  deadline: string | null; status: DriveStatus; created_at: string; updated_at: string;
  totals?: { qty: number; cost: number; entries: number; paid: number };
  mine?: { qty: number; cost: number; entries: number };
}
export interface MyEntry {
  id: number; city: string; total_qty: number; total_cost: number; paid: boolean;
  lines: { category_key: string; qty: number; unit_price: number; line_cost: number }[];
}
export interface DriveDetailAgent extends Drive {
  scope: 'agent';
  categories: AdCategory[];
  pricedCities: string[];
  myEntries: MyEntry[];
}

// Действующий пакет агента: остаток квот по площадке/городу/категории.
export interface QuotaItem { category_key: string; category_label: string; bought: number; used: number; remaining: number; }
export interface ActivePackage {
  entry_id: number; drive_id: number; platform: Platform; platform_label: string;
  title: string; city: string; starts_at: string; ends_at: string;
  items: QuotaItem[]; totalRemaining: number;
}

export const adPackagesApi = {
  drives: () => api.get<Drive[]>('/api/ad-packages/drives'),
  myQuotas: () => api.get<ActivePackage[]>('/api/ad-packages/my-quotas'),
  drive: (id: number) => api.get<DriveDetailAgent>(`/api/ad-packages/drives/${id}`),
  cityPrices: (platform: Platform, city: string) =>
    api.get<Record<string, number>>(`/api/ad-packages/prices/city?platform=${platform}&city=${encodeURIComponent(city)}`),
  submitEntry: (driveId: number, body: { city: string; lines: { categoryKey: string; qty: number }[] }) =>
    api.post<{ ok: boolean }>(`/api/ad-packages/drives/${driveId}/entries`, body),
  removeEntry: (driveId: number, entryId: number) =>
    api.del<{ ok: boolean }>(`/api/ad-packages/drives/${driveId}/entries/${entryId}`),
};
