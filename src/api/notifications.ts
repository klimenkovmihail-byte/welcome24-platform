/**
 * api/notifications — push-уведомления (колокольчик).
 */

import { api } from './apiClient';

export type NotificationType = 'deal' | 'agent' | 'shares' | 'news' | 'team' | 'alert' | 'system';

export interface Notification {
  id: number;
  recipientId: number;
  type: NotificationType;
  title: string;
  description: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

type RawNotification = {
  id: number;
  recipient_id: number;
  type: NotificationType;
  title: string;
  description: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

function normalize(r: RawNotification): Notification {
  return {
    id: r.id,
    recipientId: r.recipient_id,
    type: r.type,
    title: r.title,
    description: r.description || '',
    link: r.link,
    createdAt: r.created_at,
    readAt: r.read_at,
  };
}

export const notificationsApi = {
  list:        () => api.get<RawNotification[]>('/api/notifications?scope=portal').then(rows => rows.map(normalize)),
  markRead:    (id: number) => api.post<{ ok: true }>(`/api/notifications/${id}/read`),
  markAllRead: () => api.post<{ ok: true }>('/api/notifications/read-all?scope=portal'),
};
