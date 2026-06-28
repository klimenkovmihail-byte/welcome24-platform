// React Query хуки портала — кэш/дедуп/ретраи поверх существующего api.
// Общие данные (котировки/пакеты акций, команда) переиспользуются между
// страницами → второй заход берёт из кэша мгновенно.

import { useQuery } from '@tanstack/react-query';
import { dealsApi } from './deals';
import { teamApi } from './team';
import { sharesApi } from './shares';
import { ratingApi } from './rating';
import { agentsApi } from './agents';
import { backofficeApi } from './backoffice';
import { settingsApi } from './settings';
import { onboardingApi } from './onboarding';

export const useDeals = (agentId?: number) =>
  useQuery({ queryKey: ['deals', agentId ?? 'me'], queryFn: () => dealsApi.list({ agentId }) });

export const useTeam = (opts?: { year?: string; month?: string; agentId?: number }) =>
  useQuery({ queryKey: ['team', opts ?? {}], queryFn: () => teamApi.get(opts) });

export const useSharePackets = () =>
  useQuery({ queryKey: ['shares', 'packets'], queryFn: () => sharesApi.myPackets() });

export const useShareQuotes = () =>
  useQuery({ queryKey: ['shares', 'quotes'], queryFn: () => sharesApi.quotes() });

export const useRating = (opts?: { year?: string; month?: string; limit?: number }) =>
  useQuery({ queryKey: ['rating', opts ?? {}], queryFn: () => ratingApi.get(opts) });

export const useAgents = (opts?: { status?: 'active' | 'inactive' | 'blocked'; role?: 'agent' | 'manager' | 'admin' | 'super_admin' }) =>
  useQuery({ queryKey: ['agents', opts ?? {}], queryFn: () => agentsApi.list(opts) });

export const useBackoffice = () =>
  useQuery({ queryKey: ['backoffice'], queryFn: () => backofficeApi.list() });

// Глобальные настройки компании (пороги уровней комиссии и пр.) — единый источник с бэка.
export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get() });

// Онбординг нового агента: показывать ли блок приветствия + статусы шагов чек-листа.
export const useOnboarding = () =>
  useQuery({ queryKey: ['onboarding'], queryFn: () => onboardingApi.get() });
