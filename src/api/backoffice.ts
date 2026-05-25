// /api/backoffice — справочник сотрудников бэк-офиса.

import { api } from './apiClient';

export interface BackOfficeMember {
  id: number;
  name: string;
  role: string;
  description: string;
  photo: string;
  phone: string;
  email: string;
  telegram: string;
  orderIdx: number;
}

type Raw = {
  id: number;
  name: string;
  role: string;
  description: string;
  photo: string;
  phone: string;
  email: string;
  telegram: string;
  order_idx: number;
};

const norm = (r: Raw): BackOfficeMember => ({
  id: r.id,
  name: r.name,
  role: r.role,
  description: r.description || '',
  photo: r.photo || '',
  phone: r.phone || '',
  email: r.email || '',
  telegram: r.telegram || '',
  orderIdx: r.order_idx || 0,
});

export const backofficeApi = {
  list: () => api.get<Raw[]>('/api/backoffice').then(rows => rows.map(norm)),
};
