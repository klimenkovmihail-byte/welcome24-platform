/**
 * api/agents — обёртка над /api/agents/* для портала агента.
 *
 * Бэк отдаёт snake_case (parent_id, team_level, reviews_count, ...).
 * Здесь нормализуем в camelCase, чтобы фронт работал со своим типом Agent.
 *
 * Также адаптируем agent_reviews → формат AgentReview, понятный странице.
 */

import { api } from './apiClient';
import type { Agent, AgentSocials, AgentLevel } from '../types/api';
import type { AgentReview } from '../data/mockData';

type RawAgent = {
  id: number;
  email: string;
  name: string;
  phone: string;
  city: string;
  photo: string | null;
  bio: string;
  role: 'admin' | 'agent';
  status: 'active' | 'inactive' | 'blocked';
  level: number;
  commission: number;
  parent_id: number | null;
  team_level: number;
  join_date: string;
  experience_years: number;
  specialization: string[];
  socials: AgentSocials;
  rating: number;
  reviews_count: number;
  // Вычисляемые из deals на бэке (агрегаты)
  year_deals?: number;
  year_vkd?: number;
  year_income?: number;
  total_deals?: number;
  total_vkd?: number;
  total_income?: number;
};

type RawReview = {
  id: number;
  agent_id: number;
  author_id: number | null;
  author_name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  moderation: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export function normalizeAgent(raw: RawAgent): Agent {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    phone: raw.phone || '',
    city: raw.city || '',
    photo: raw.photo,
    bio: raw.bio || '',
    role: raw.role,
    status: raw.status,
    level: (raw.level || 1) as AgentLevel,
    commission: (raw.commission || 80) as 80 | 90 | 95,
    parentId: raw.parent_id,
    teamLevel: raw.team_level || 1,
    joinDate: raw.join_date,
    experienceYears: raw.experience_years || 0,
    totalDeals: raw.total_deals || 0,
    totalVkd: raw.total_vkd || 0,
    totalIncome: raw.total_income || 0,
    yearDeals: raw.year_deals || 0,
    yearVkd: raw.year_vkd || 0,
    yearIncome: raw.year_income || 0,
    specialization: raw.specialization || [],
    socials: raw.socials || {},
    rating: raw.rating || 0,
    reviewsCount: raw.reviews_count || 0,
  };
}

export function normalizeReview(raw: RawReview): AgentReview {
  const initials = (raw.author_name || 'А')
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return {
    id: raw.id,
    author: raw.author_name,
    initials,
    rating: raw.rating,
    date: (raw.created_at || '').slice(0, 10),
    text: raw.text,
  };
}

export const agentsApi = {
  list: (opts?: { status?: 'active' | 'inactive' | 'blocked'; role?: 'agent' | 'manager' | 'admin' | 'super_admin' }) => {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.role)   params.set('role', opts.role);
    const q = params.toString() ? `?${params.toString()}` : '';
    return api.get<RawAgent[]>(`/api/agents${q}`).then(rows => rows.map(normalizeAgent));
  },
  get:     (id: number) => api.get<RawAgent>(`/api/agents/${id}`).then(normalizeAgent),
  reviews: (id: number) => api.get<RawReview[]>(`/api/agents/${id}/reviews`).then(rows => rows.map(normalizeReview)),
  createReview: (id: number, rating: number, text: string) =>
    api.post<RawReview>(`/api/agents/${id}/reviews`, { rating, text }).then(normalizeReview),

  // Telegram-бот: статус привязки + deep-link, отвязка.
  telegramLink: () =>
    api.get<{ linked: boolean; available: boolean; deepLink?: string; botUsername?: string }>('/api/agents/me/telegram-link'),
  telegramUnlink: () =>
    api.post<{ ok: boolean }>('/api/agents/me/telegram-unlink', {}),

  // MAX-бот: статус привязки + ссылка на бота и код (привязка по коду).
  maxLink: () =>
    api.get<{ linked: boolean; available: boolean; botLink?: string; botUsername?: string; code?: string }>('/api/agents/me/max-link'),
  maxUnlink: () =>
    api.post<{ ok: boolean }>('/api/agents/me/max-unlink', {}),

  // Web Push (PWA-уведомления в браузер): VAPID-ключ + подписка/отписка устройства.
  pushKey: () =>
    api.get<{ enabled: boolean; publicKey: string }>('/api/agents/me/push-key'),
  pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) =>
    api.post<{ ok: boolean }>('/api/agents/me/push-subscribe', sub),
  pushUnsubscribe: (endpoint: string) =>
    api.post<{ ok: boolean }>('/api/agents/me/push-unsubscribe', { endpoint }),
};
