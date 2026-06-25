// Файлы заявок: приватная загрузка и открытие.
// Новые файлы лежат в приватном бакете (url пустой), отдаются только через
// авторизованный прокси /api/cases/:id/attachments/:attId/download. Старые публичные
// файлы (url заполнен) открываем напрямую — обратная совместимость.
import { API_BASE_URL, getToken } from '../api/apiClient';
import type { CaseItem, CaseAttachment } from '../api/cases';
import { uploadErr } from './uploadError';

// Приватная загрузка файла заявки через бэк. Возвращает обновлённую заявку.
export async function uploadCaseAttachment(
  caseId: number,
  file: File,
  opts?: { participantId?: number; category?: string },
): Promise<CaseItem> {
  const fd = new FormData();
  fd.append('file', file);
  if (opts?.participantId != null) fd.append('participantId', String(opts.participantId));
  if (opts?.category) fd.append('category', opts.category);
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/attachments/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  if (!res.ok) throw new Error(await uploadErr(res));
  return res.json();
}

// Открыть файл заявки в новой вкладке.
export async function openCaseAttachment(
  caseId: number,
  att: Pick<CaseAttachment, 'id' | 'url'>,
): Promise<void> {
  if (att.url) { window.open(att.url, '_blank', 'noopener'); return; }
  const res = await fetch(`${API_BASE_URL}/api/cases/${caseId}/attachments/${att.id}/download`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Не удалось открыть файл');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
