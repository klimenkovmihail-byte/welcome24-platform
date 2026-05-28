/**
 * api/ai — AI-инструменты для риелтора.
 */

import { api } from './apiClient';

export type AiTier = 'starter' | 'growth' | 'top' | 'unlimited';

export interface AiUsage {
  unlimited: boolean;
  tier: AiTier;
  limit: number | null;
  used: number;
  remaining: number | null;
  day: string;
  ytdIncome: number | null;
  ytdVkd: number | null;
  thresholds: { incomeGrowth: number; vkdTop: number };
}

export interface AiResult {
  text: string;
  stub: boolean;
  usage: AiUsage;
}

export type AiTool = 'listing' | 'social_post' | 'legal_advisor' | 'mlm_recruiter' | 'shares_advisor';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Персистентный чат с историей (ai_chats + ai_chat_messages в БД).
export interface ChatSummary {
  id: number;
  tool: AiTool;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface StoredMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatFull extends ChatSummary {
  messages: StoredMessage[];
}

export interface SendResponse {
  chat: ChatFull;
  text: string;
  usage: AiUsage;
}

export const aiApi = {
  usage:    () => api.get<AiUsage>('/api/ai/usage'),
  tools:    () => api.get<Array<{ key: AiTool; label: string }>>('/api/ai/tools'),
  generate: (tool: AiTool, input: Record<string, unknown>) =>
    api.post<AiResult>('/api/ai/generate', { tool, input }),
  chat: (tool: AiTool, messages: ChatMessage[]) =>
    api.post<AiResult>('/api/ai/chat', { tool, messages }),

  // История чатов в БД
  listChats:   (tool: AiTool) => api.get<ChatSummary[]>(`/api/ai/chats?tool=${encodeURIComponent(tool)}`),
  getChat:     (id: number)   => api.get<ChatFull>(`/api/ai/chats/${id}`),
  createChat:  (tool: AiTool) => api.post<ChatFull>('/api/ai/chats', { tool }),
  sendMessage: (chatId: number, content: string) =>
    api.post<SendResponse>(`/api/ai/chats/${chatId}/messages`, { content }),
  deleteChat:  (id: number)   => api.del<{ ok: true }>(`/api/ai/chats/${id}`),
  renameChat:  (id: number, title: string) =>
    api.patch<{ ok: true }>(`/api/ai/chats/${id}`, { title }),
};
