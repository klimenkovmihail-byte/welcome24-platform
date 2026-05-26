// /api/settings — глобальные настройки компании (ключ-значение).
import { api } from './apiClient';

export const settingsApi = {
  // Возвращает Map<key, value>
  get: () => api.get<Record<string, string>>('/api/settings'),
};
