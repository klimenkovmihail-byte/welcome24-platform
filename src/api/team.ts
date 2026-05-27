/**
 * api/team — MLM-команда текущего пользователя.
 */

import { api } from './apiClient';

export interface TeamMember {
  id: number;
  name: string;
  phone: string;
  city: string;
  email: string;
  status: 'active' | 'inactive' | 'blocked';
  level: number;       // commission level (1..3)
  commission: number;  // 80 | 90 | 95
  joinDate: string;
  terminatedAt: string | null;
  specialization: string[];
  socials: Record<string, string>;
  teamLevel: number;   // 1..7 (depth in MLM tree)
  deals: number;
  vkd: number;
  income: number;
}

export interface TeamLevelStats {
  level: number;
  count: number;
  activeCount: number;
  withDealCount: number;
  totalVkd: number;
  totalIncome: number;
}

export interface MarketingPlanLevel {
  level: number;
  protected: number;
  growing: number | null;
  required: number | null;
  capPerAgent: number;
}

export interface TeamResponse {
  targetAgentId: number;
  year: string | null;
  month: string | null;
  self: TeamMember | null;
  totals: { agents: number; active: number; deals: number; vkd: number; income: number };
  levels: TeamLevelStats[];
  agents: TeamMember[];
  marketingPlan: MarketingPlanLevel[];
}

export interface TeamHistoryEntry {
  id: number;
  agentId: number;
  agentName: string;
  agentEmail: string;
  agentPhoto: string | null;
  agentCity: string;
  agentStatus: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isCurrent: boolean;
  days: number;
  periodDeals: number;
  periodVkd: number;
  periodIncome: number;
}

export const teamApi = {
  get: (opts?: { year?: string; month?: string; agentId?: number }) => {
    const p = new URLSearchParams();
    if (opts?.year) p.set('year', opts.year);
    if (opts?.month) p.set('month', opts.month);
    if (opts?.agentId) p.set('agentId', String(opts.agentId));
    const q = p.toString();
    return api.get<TeamResponse>(`/api/team${q ? `?${q}` : ''}`);
  },
  history: (opts?: { agentId?: number }) => {
    const p = new URLSearchParams();
    if (opts?.agentId) p.set('agentId', String(opts.agentId));
    const q = p.toString();
    return api.get<TeamHistoryEntry[]>(`/api/team/history${q ? `?${q}` : ''}`);
  },
};
