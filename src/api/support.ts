import { api } from './apiClient';

export type TicketStatus = 'open' | 'replied' | 'closed';

export interface SupportTicketSummary {
  id: number;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  messages_count: number;
  last_message: string | null;
}

export interface SupportMessage {
  id: number;
  author_id: number;
  author_role: 'agent' | 'admin';
  author_name: string;
  text: string;
  created_at: string;
}

export interface SupportTicketFull extends SupportTicketSummary {
  messages: SupportMessage[];
}

export const supportApi = {
  list: () => api.get<SupportTicketSummary[]>('/api/support'),
  get: (id: number) => api.get<SupportTicketFull>(`/api/support/${id}`),
  create: (subject: string, message: string) =>
    api.post<SupportTicketFull>('/api/support', { subject, message }),
  reply: (id: number, text: string) =>
    api.post<SupportTicketFull>(`/api/support/${id}/messages`, { text }),
};
