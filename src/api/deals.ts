/**
 * api/deals — мои сделки в портале агента.
 * Бэк сам фильтрует по auth-юзеру: агент получает только свои сделки.
 */

import { api } from './apiClient';
import type { Deal, DealStatus, DealType } from '../types/api';

type RawDeal = {
  id: number;
  agent_id: number;
  agent_name?: string;
  client_name: string;
  address: string;
  city: string;
  type: DealType;
  vkd: number;
  income: number;
  commission: number;
  status: DealStatus;
  date: string;
  notes: string;
  created_at?: string;
};

export function normalizeDeal(raw: RawDeal): Deal {
  return {
    id: raw.id,
    agentId: raw.agent_id,
    clientName: raw.client_name,
    address: raw.address || '',
    city: raw.city || '',
    type: raw.type,
    vkd: raw.vkd,
    income: raw.income,
    commission: raw.commission,
    status: raw.status,
    date: raw.date,
    notes: raw.notes || '',
  };
}

export interface DealFilter {
  agentId?: number;
  status?: DealStatus;
  year?: string | number;
  month?: string | number;
}

function buildQuery(f?: DealFilter): string {
  if (!f) return '';
  const p = new URLSearchParams();
  if (f.agentId != null) p.set('agent_id', String(f.agentId));
  if (f.status) p.set('status', f.status);
  if (f.year != null) p.set('year', String(f.year));
  if (f.month != null) p.set('month', String(f.month));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const dealsApi = {
  list: (filter?: DealFilter) =>
    api.get<RawDeal[]>(`/api/deals${buildQuery(filter)}`).then(rows => rows.map(normalizeDeal)),
};
