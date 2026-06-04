/**
 * api/cases — Заявки специалистам (Фаза 2 / Блок A: юрист + брокер).
 * Агент создаёт заявку и стартовую задачу; специалисты берут в работу и двигают статусы.
 */

import { api } from './apiClient';

export type TaskTrack = 'legal' | 'mortgage';
export type TaskType = 'doc_check' | 'contract' | 'deposit' | 'dkp' | 'mortgage';

export interface CaseTask {
  id: number;
  case_id: number;
  type: TaskType;
  track: TaskTrack;
  assignee_id: number | null;
  assignee_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CaseAttachment {
  id: number;
  case_id: number;
  uploader_id: number | null;
  uploader_name: string | null;
  name: string;
  url: string;
  size: number;
  created_at: string;
}

export interface CaseItem {
  id: number;
  agent_id: number;
  agent_name?: string;
  client_name: string;
  object_address: string;
  city: string;
  note: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  tasks: CaseTask[];
  attachments: CaseAttachment[];
  unread?: number;
}

export interface TaskTypeMeta {
  key: TaskType;
  track: TaskTrack;
  label: string;
}

// Русские подписи статусов (совпадают с бэком statusLabel).
export const STATUS_RU: Record<string, string> = {
  check: 'Проверка документов', contract: 'Договор', deposit: 'Задаток / аванс',
  dkp: 'ДКП', deal: 'Сделка', act: 'Акт', done: 'Завершено',
  new: 'Новая', in_progress: 'В работе', cancelled: 'Отменена',
  consultation: 'Консультация', approval: 'Заявка на одобрение',
  approved: 'Одобрено', rejected: 'Отказ', issued: 'Ипотека выдана',
};

// Допустимые следующие статусы для исполнителя (UI кнопки), по дорожке.
export const NEXT_STATUSES: Record<TaskTrack, string[]> = {
  legal: ['new', 'in_progress', 'done', 'cancelled'],
  mortgage: ['consultation', 'approval', 'approved', 'rejected', 'issued', 'cancelled'],
};

export const casesApi = {
  // Агент: мои заявки (в портале всегда только свои — ?mine=1).
  list: () => api.get<CaseItem[]>('/api/cases?mine=1'),
  get: (id: number) => api.get<CaseItem>(`/api/cases/${id}`),
  create: (body: { clientName: string; objectAddress?: string; city?: string; note?: string; taskType: TaskType }) =>
    api.post<CaseItem>('/api/cases', body),
  addTask: (caseId: number, taskType: TaskType) =>
    api.post<CaseItem>(`/api/cases/${caseId}/tasks`, { taskType }),
  types: () => api.get<TaskTypeMeta[]>('/api/cases/meta/types'),
  addAttachment: (caseId: number, body: { name: string; url: string; size?: number }) =>
    api.post<CaseItem>(`/api/cases/${caseId}/attachments`, body),
  deleteAttachment: (caseId: number, attId: number) =>
    api.del<CaseItem>(`/api/cases/${caseId}/attachments/${attId}`),
  messages: (caseId: number, after = 0) =>
    api.get<CaseMessage[]>(`/api/cases/${caseId}/messages?after=${after}`),
  sendMessage: (caseId: number, payload: { body?: string; attachmentUrl?: string; attachmentName?: string }) =>
    api.post<CaseMessage>(`/api/cases/${caseId}/messages`, payload),
  markRead: (caseId: number, lastId?: number) =>
    api.post<{ ok: boolean }>(`/api/cases/${caseId}/read`, lastId ? { lastId } : {}),
  events: (caseId: number) => api.get<CaseEvent[]>(`/api/cases/${caseId}/events`),

  // Специалист/админ.
  queue: (track?: TaskTrack) =>
    api.get<QueueTask[]>(`/api/cases/queue/list${track ? `?track=${track}` : ''}`),
  assigned: () => api.get<QueueTask[]>('/api/cases/assigned/list'),
  take: (taskId: number) => api.post<CaseItem>(`/api/cases/tasks/${taskId}/take`, {}),
  updateTask: (taskId: number, body: { status?: string; assigneeId?: number | null }) =>
    api.patch<CaseItem>(`/api/cases/tasks/${taskId}`, body),
};

export interface QueueTask {
  task_id: number;
  case_id: number;
  type: TaskType;
  track: TaskTrack;
  status: string;
  client_name: string;
  object_address: string;
  city: string;
  agent_id?: number;
  created_at?: string;
}

export interface CaseEvent {
  id: number;
  kind: string;
  text: string;
  actor_name: string | null;
  created_at: string;
}

export interface CaseMessage {
  id: number;
  case_id: number;
  sender_id: number | null;
  sender_name: string | null;
  sender_role: string | null;
  body: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}
