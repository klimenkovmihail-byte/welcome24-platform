/**
 * api/rating — общефирменный рейтинг агентов.
 */

import { api } from './apiClient';

export interface RatingAgent {
  id: number;
  name: string;
  city: string;
  level: number;
  commission: number;
  status: 'active' | 'inactive' | 'blocked';
  deals: number;
  vkd: number;
  income: number;
}

export interface RatingResponse {
  year: string | null;
  month: string | null;
  limit: number;
  agents: RatingAgent[];
}

export const ratingApi = {
  get: (opts?: { year?: string; month?: string; limit?: number }) => {
    const p = new URLSearchParams();
    if (opts?.year)  p.set('year',  opts.year);
    if (opts?.month) p.set('month', opts.month);
    if (opts?.limit) p.set('limit', String(opts.limit));
    const q = p.toString();
    return api.get<RatingResponse>(`/api/rating${q ? `?${q}` : ''}`);
  },
};
