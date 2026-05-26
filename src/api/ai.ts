/**
 * api/ai — AI-инструменты для риелтора.
 */

import { api } from './apiClient';

export interface AiUsage {
  unlimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  day: string;
}

export interface AiResult {
  text: string;
  stub: boolean;
  usage: AiUsage;
}

export type AiTool = 'listing' | 'social_post';

export const aiApi = {
  usage:    () => api.get<AiUsage>('/api/ai/usage'),
  tools:    () => api.get<Array<{ key: AiTool; label: string }>>('/api/ai/tools'),
  generate: (tool: AiTool, input: Record<string, unknown>) =>
    api.post<AiResult>('/api/ai/generate', { tool, input }),
};
