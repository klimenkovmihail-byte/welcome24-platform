/**
 * api/adRequests (портал) — Отдел рекламы: агент создаёт заявки на рекламу объектов
 * (разовая квота / подключение к площадкам / работа с ошибками) + чат с отделом.
 */
import { api } from './apiClient';

export type AdKind = 'quota' | 'connect' | 'fix' | 'from_package';
export type AdStatus = 'new' | 'in_progress' | 'done' | 'cancelled';
export type AdPlatform = 'avito' | 'cian' | 'domclick' | 'yandex';

// Инфо о квоте, из которой списывается заявка from_package.
export interface PkgQuota {
  entry_id: number; category_key: string; category_label: string;
  platform: string; platform_label: string; city: string;
  bought: number; used: number; remaining: number; starts_at: string; ends_at: string; active: boolean;
}

export interface AdRequest {
  id: number; agent_id: number; agent_name?: string;
  kind: AdKind; kind_label: string;
  object_ref: string; region: string; platforms: AdPlatform[]; comment: string;
  status: AdStatus; assignee_id: number | null; assignee_name: string | null;
  created_at: string; updated_at: string; unread?: number;
  attachments: { id: number; name: string; url: string }[];
  pkg?: PkgQuota | null;      // только для from_package
  connect_value?: string;     // ЦИАН ID/почта или телефон (для connect)
}
export interface AdMessage {
  id: number; request_id: number; sender_id: number | null; sender_name: string | null;
  sender_role: string | null; body: string; attachment_url: string | null; attachment_name: string | null; created_at: string;
}
export interface AdEvent { id: number; kind: string; text: string; actor_name: string | null; created_at: string; }
export interface AdMeta {
  kinds: { key: AdKind; label: string; group?: string }[];
  platforms: { key: AdPlatform; label: string }[];
  statuses: { key: AdStatus; label: string }[];
  connectPlatforms?: AdPlatform[];
  avitoInviteUrl?: string;
}

export const AD_STATUS_RU: Record<AdStatus, string> = {
  new: 'Новая', in_progress: 'В работе', done: 'Готово', cancelled: 'Отменена',
};
export const PLATFORM_LABEL: Record<string, string> = {
  avito: 'Авито', cian: 'ЦИАН', domclick: 'ДомКлик', yandex: 'Яндекс',
};

export const adRequestsApi = {
  meta: () => api.get<AdMeta>('/api/ad-requests/meta'),
  list: (kinds?: AdKind[]) => api.get<AdRequest[]>(`/api/ad-requests?mine=1${kinds?.length ? `&kinds=${kinds.join(',')}` : ''}`),
  get: (id: number) => api.get<AdRequest>(`/api/ad-requests/${id}`),
  create: (body: { kind: AdKind; objectRef?: string; region?: string; platforms?: AdPlatform[]; comment?: string; pkgEntryId?: number; pkgCategoryKey?: string; platform?: AdPlatform; connectValue?: string }) =>
    api.post<AdRequest>('/api/ad-requests', body),
  connectFilled: (id: number) => api.post<AdRequest>(`/api/ad-requests/${id}/connect-filled`, {}),
  messages: (id: number, after = 0) => api.get<AdMessage[]>(`/api/ad-requests/${id}/messages?after=${after}`),
  sendMessage: (id: number, payload: { body?: string; attachmentUrl?: string; attachmentName?: string }) => api.post<AdMessage>(`/api/ad-requests/${id}/messages`, payload),
  markRead: (id: number, lastId?: number) => api.post<{ ok: boolean }>(`/api/ad-requests/${id}/read`, lastId ? { lastId } : {}),
  events: (id: number) => api.get<AdEvent[]>(`/api/ad-requests/${id}/events`),
};
