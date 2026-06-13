// MLS (своя «Спутник») — клиент эндпоинтов объектов. Раздел скрытый (super_admin).
// Бэк: GET /api/mls/properties (список+фильтры), GET /api/mls/properties/:id (карточка),
// POST/PUT/DELETE (CRUD), :id/photos (загрузка), registry (форма), dadata/suggest, dedup-check.
import { api, API_BASE_URL, getToken } from './apiClient';

export interface MlsListItem {
  id: number;
  status: string;
  deal_type: string;
  property_type: string;
  market_type: string | null;
  address: string | null;
  locality: string | null;
  rooms: string | null;
  total_area: number | null;
  land_area: number | null;
  land_unit: string | null;
  floor: number | null;
  floors: number | null;
  price: number | null;
  currency: string;
  exclusive_type: string | null;
  on_showcase: number;
  agent_id: number;
  agent_name: string;
  photo_url: string | null;
  photo_thumb: string | null;
  photo_count: number;
}

export interface MlsListResponse {
  total: number;
  limit: number;
  offset: number;
  items: MlsListItem[];
}

export interface MlsPhoto {
  id: number;
  url: string;
  thumb_url: string | null;
  sort: number;
  is_main: number;
  is_plan: number;
  width: number | null;
  height: number | null;
}

export interface MlsContact {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
}

export interface MlsDetail extends MlsListItem {
  region: string | null;
  district: string | null;
  street: string | null;
  house: string | null;
  lat: number | null;
  lng: number | null;
  fias_id: string | null;
  living_area: number | null;
  kitchen_area: number | null;
  commission_value: number | null;
  commission_type: string | null;
  exclusive_until: string | null;
  title: string | null;
  description: string | null;
  note: string | null;
  video_url: string | null;
  cadastral_number: string | null;
  created_at: string;
  params: Record<string, unknown>;
  owner: MlsContact | null;
  owner_locked: boolean;
  agent: { id: number; name: string; phone: string | null; city: string | null };
  photos: MlsPhoto[];
  priceHistory: { old_price: number | null; new_price: number; reason: string | null; created_at: string }[];
}

export interface MlsFilters {
  deal_type?: string;
  property_type?: string;
  status?: string;
  sort?: 'new' | 'price_asc' | 'price_desc';
  price_min?: number;
  price_max?: number;
  limit?: number;
  offset?: number;
}

export function listMlsProperties(f: MlsFilters): Promise<MlsListResponse> {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
  return api.get<MlsListResponse>(`/api/mls/properties?${q.toString()}`);
}

export function getMlsProperty(id: number): Promise<MlsDetail> {
  return api.get<MlsDetail>(`/api/mls/properties/${id}`);
}

export interface MlsFacets { localities: { locality: string; n: number }[]; }
export function getMlsFacets(): Promise<MlsFacets> {
  return api.get<MlsFacets>('/api/mls/facets');
}

// ── Форма (registry) + CRUD ──
export interface RegistryField {
  key: string; label: string; group: string; kind: string; unit: string | null;
  applicableTypes: string[]; enumValues: { key: string; label: string }[] | null;
  requiredFor: string[]; requiredSeverity: string;
}
export interface RegistrySchema {
  version: number;
  dealTypes: { key: string; label: string }[];
  propertyTypes: { key: string; label: string }[];
  fields: RegistryField[];
}
export function getMlsRegistry(): Promise<RegistrySchema> { return api.get<RegistrySchema>('/api/mls/registry'); }

export function createMlsProperty(body: Record<string, unknown>): Promise<{ id: number }> {
  return api.post<{ id: number }>('/api/mls/properties', body);
}
export function updateMlsProperty(id: number, body: Record<string, unknown>): Promise<{ ok: boolean }> {
  return api.put<{ ok: boolean }>(`/api/mls/properties/${id}`, body);
}
export function deleteMlsProperty(id: number): Promise<{ ok: boolean }> {
  return api.del<{ ok: boolean }>(`/api/mls/properties/${id}`);
}
export function deleteMlsPhoto(id: number, photoId: number): Promise<{ ok: boolean }> {
  return api.del<{ ok: boolean }>(`/api/mls/properties/${id}/photos/${photoId}`);
}

export interface AddressSuggestion { value: string; data: Record<string, string | null> }
export function suggestMlsAddress(q: string): Promise<{ suggestions: AddressSuggestion[] }> {
  return api.get<{ suggestions: AddressSuggestion[] }>(`/api/mls/dadata/suggest?q=${encodeURIComponent(q)}`);
}

export interface DedupHit { id: number; address: string | null; price: number | null; reason: string }
export function dedupCheck(params: Record<string, string | number | null | undefined>): Promise<{ duplicates: DedupHit[] }> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
  return api.get<{ duplicates: DedupHit[] }>(`/api/mls/properties/dedup-check?${q.toString()}`);
}

// Загрузка фото — multipart (apiClient шлёт JSON, поэтому свой fetch с токеном).
export async function uploadMlsPhotos(id: number, files: File[]): Promise<{ photos: MlsPhoto[] }> {
  const fd = new FormData();
  files.forEach((f) => fd.append('photos', f));
  const res = await fetch(`${API_BASE_URL}/api/mls/properties/${id}/photos`, {
    method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Словари меток (Спутник-ключи → человеческие подписи) ──
export const TYPE_LABEL: Record<string, string> = {
  apartment: 'Квартира', room: 'Комната', house: 'Дом', land: 'Участок', commercial: 'Коммерция', garage: 'Гараж',
};
export const DEAL_LABEL: Record<string, string> = { sale: 'Продажа', rent: 'Аренда' };
export const ROOMS_LABEL: Record<string, string> = {
  studio: 'Студия', '1': '1-комн', '2': '2-комн', '3': '3-комн', '4': '4-комн', '5plus': '5+ комн', free: 'Своб. план.',
};
export const STATUS_LABEL: Record<string, string> = {
  active: 'Активен', draft: 'Черновик', deposit: 'Задаток', sold: 'Продан', withdrawn: 'Снят', archived: 'Архив',
};
export const MARKET_LABEL: Record<string, string> = { secondary: 'Вторичка', newbuilding: 'Новостройка' };
export const LAND_UNIT_LABEL: Record<string, string> = { sotka: 'сот.', hectare: 'га', sqm: 'м²' };

// Метки для отдельных enum-полей params (показ в карточке).
export const PARAM_ENUM_LABEL: Record<string, Record<string, string>> = {
  renovation: { standard: 'Обычный', good: 'Хороший', quality: 'Качественный', designer: 'Дизайнерский', move_in: 'Заходи и живи', needs_repair: 'Требует ремонта', fine_finish: 'Чистовая', rough_finish: 'Черновая', pre_finish: 'Под отделку' },
  house_material: { brick: 'Кирпич', panel: 'Панель', block: 'Блок', monolith: 'Монолит', monolith_brick: 'Монолит-кирпич', old_fund: 'Старый фонд', stalin: 'Сталинский', aerated_block: 'Газо/пеноблок', wood: 'Дерево', frame: 'Каркас', panel_board: 'Щитовой' },
  bathroom: { combined: 'Совмещённый', separated: 'Раздельный', '2plus': '2 и более' },
  electricity: { '220': '220 В', '380': '380 В', possibility: 'Есть возможность', no: 'Нет' },
  land_type: { izhs: 'ИЖС', snt_gardening: 'СНТ', ogorod: 'Огородничество', lph: 'ЛПХ', dnp: 'ДНП', agricultural: 'С/х', low_rise: 'Малоэтажная ЖЗ', mid_rise: 'Среднеэтажная ЖЗ', high_rise: 'Многоэтажная ЖЗ' },
  property_subtype: { flat: 'Квартира', apartments: 'Апартаменты', living_premises: 'Жилое помещение', share: 'Доля в квартире' },
  commercial_object_type: { office: 'Офис', trade: 'Торговое', free_purpose: 'Своб. назначения', warehouse: 'Склад', production: 'Производство', catering: 'Общепит', hotel: 'Гостиница', autoservice: 'Автосервис', building: 'Здание', ready_business: 'Готовый бизнес' },
};
// Подписи строк характеристик из params.
export const PARAM_LABEL: Record<string, string> = {
  year_built: 'Год постройки', house_material: 'Материал', renovation: 'Ремонт', bathroom: 'Санузел',
  electricity: 'Электричество', land_type: 'Назначение земли', ceiling_height: 'Потолки, м',
  property_subtype: 'Вид объекта', commercial_object_type: 'Тип коммерции',
};

export function priceFmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}
