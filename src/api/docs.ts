/**
 * api/docs — база знаний для агента (read-only).
 */

import { api } from './apiClient';

export interface DocItem {
  id: number;
  parentId: number | null;
  type: 'folder' | 'file';
  name: string;
  description: string;
  fileUrl: string | null;
  fileKey: string | null;
  mimeType: string | null;
  fileSize: number;
  orderIdx: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Breadcrumb { id: number; name: string }

export const docsApi = {
  list:        (parentId?: number | null) =>
    api.get<DocItem[]>(`/api/docs${parentId ? `?parentId=${parentId}` : ''}`),
  breadcrumbs: (id: number) => api.get<Breadcrumb[]>(`/api/docs/breadcrumbs/${id}`),
  search:      (q: string)  => api.get<DocItem[]>(`/api/docs/search?q=${encodeURIComponent(q)}`),
};
