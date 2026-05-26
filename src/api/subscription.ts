/**
 * api/subscription — абонентская плата 4990 ₽/мес.
 */

import { api } from './apiClient';

export type PeriodStatus =
  | 'paid'
  | 'pending_review'
  | 'unpaid'
  | 'overdue'
  | 'exempt_quarter'
  | 'exempt_lifetime'
  | 'refunded'
  | 'rejected';

export interface PeriodEntry {
  period: string;       // 'YYYY-MM'
  year: number;
  quarter: number;
  quarterVkd: number;
  status: PeriodStatus;
  paymentId: number | null;
  paidAt: string | null;
}

export interface SubscriptionStatus {
  fee: number;
  exempt: 'lifetime' | 'staff' | null;
  lifetimeVkd: number;
  lifetimeThreshold: number;
  quarterThreshold: number;
  firstBillingMonth: string | null;
  joinDate?: string | null;
  currentQuarter?: number;
  currentYear?: number;
  currentQuarterVkd?: number;
  today: string;
  periods: PeriodEntry[];
  unpaidCount: number;
  overdueCount: number;
  totalDue: number;
  blocked: boolean;
}

export const subscriptionApi = {
  me:    () => api.get<SubscriptionStatus>('/api/subscription/me'),
  claim: (period: string) =>
    api.post<{ id: number; period: string; status: string }>('/api/subscription/claim', { period }),
};

// Базовая ссылка YooKassa (твоя статическая платёжная ссылка).
// Можем добавлять ?value=4990&label=agent_<id>_<period> чтобы метка пришла в HTTP-уведомлении.
const YK_BASE = 'https://yookassa.ru/my/i/aeDu2nnruWHo/l';

export function buildYookassaUrl(agentId: number, period: string, amount: number): string {
  const params = new URLSearchParams({
    value: String(amount),
    label: `agent_${agentId}_${period}`,
  });
  return `${YK_BASE}?${params.toString()}`;
}
