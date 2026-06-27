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
  buyer_side_share: number | null;
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

// Инбокс «Чаты с собственниками» (агрегат непрочитанных по объектам).
export interface OwnerChatRow { property_id: number; address: string | null; owner_name: string; preview: string; last_from: string; last_at: string; unread: number; }
export function getClientChats(): Promise<{ items: OwnerChatRow[] }> { return api.get<{ items: OwnerChatRow[] }>('/api/mls/client-chats'); }

// Маркетплейс услуг — координаторская сторона (каталог + очередь заказов).
export interface SvcCatalogItem {
  id: number; slug: string | null; category: string; name: string; description: string | null; kind: string;
  price_note: string | null; agent_share_pct: number | null; partner_commission_pct: number | null;
  city: string | null; sort: number; active: number; reviews_count: number; rating: number | null; orders_count: number;
}
export interface SvcOrder {
  id: number; status: string; service_name: string | null; note: string | null; property_id: number | null;
  created_at: string; updated_at: string; client_name: string | null; client_phone: string | null;
  agent_name: string | null; coordinator_name: string | null; review_rating: number | null; review_text: string | null;
}
export function getServicesCatalog(): Promise<{ items: SvcCatalogItem[] }> { return api.get<{ items: SvcCatalogItem[] }>('/api/services'); }
export function getServiceOrders(status?: string): Promise<{ items: SvcOrder[] }> { return api.get<{ items: SvcOrder[] }>(`/api/services/orders${status ? `?status=${status}` : ''}`); }
export function patchServiceOrder(id: number, data: { status?: string; take?: boolean }): Promise<{ ok: boolean }> { return api.patch<{ ok: boolean }>(`/api/services/orders/${id}`, data); }
export function createService(s: Partial<SvcCatalogItem>): Promise<{ id: number }> { return api.post<{ id: number }>('/api/services', s); }
export function updateService(id: number, s: Partial<SvcCatalogItem>): Promise<{ ok: boolean }> { return api.put<{ ok: boolean }>(`/api/services/${id}`, s); }
export function deleteService(id: number): Promise<{ ok: boolean }> { return api.del<{ ok: boolean }>(`/api/services/${id}`); }

// Заявки на показ объекта (покупатели) — агентская сторона.
export interface PropViewing { id: number; status: string; preferred_date: string | null; note: string | null; confirmed_at: string | null; created_at: string; buyer_name: string | null; buyer_phone: string | null; }
export function getPropertyViewings(propertyId: number): Promise<{ items: PropViewing[] }> { return api.get<{ items: PropViewing[] }>(`/api/mls/properties/${propertyId}/viewing-requests`); }
export function patchViewing(propertyId: number, vid: number, data: { status: string; preferred_date?: string }): Promise<{ ok: boolean }> { return api.patch<{ ok: boolean }>(`/api/mls/properties/${propertyId}/viewing-requests/${vid}`, data); }

// Lead-движок (Фаза 2): очередь обращений + claim + конвертация в заявку.
export interface Lead {
  id: number; status: string; source: string; name: string | null; phone: string | null; raw_text: string | null; note: string | null;
  property_id: number | null; agent_id: number | null; first_response_at: string | null; converted_request_id: number | null;
  created_at: string; contact_name: string | null; agent_name: string | null; property_address: string | null; overdue?: boolean;
}
export interface LeadEvent { type: string; detail: string | null; created_at: string; agent_name: string | null; }
export interface LeadDetail extends Lead { contact_phone: string | null; events: LeadEvent[]; }
export function getLeads(params?: { status?: string; mine?: boolean }): Promise<{ items: Lead[] }> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.mine) q.set('mine', '1');
  return api.get<{ items: Lead[] }>(`/api/mls/leads${q.toString() ? '?' + q.toString() : ''}`);
}
export function getLead(id: number): Promise<LeadDetail> { return api.get<LeadDetail>(`/api/mls/leads/${id}`); }
export function createLead(body: { name?: string; phone?: string; raw_text?: string; property_id?: number; note?: string }): Promise<{ id: number }> { return api.post<{ id: number }>('/api/mls/leads', body); }
export function patchLead(id: number, body: { claim?: boolean; first_response?: boolean; status?: string }): Promise<{ ok: boolean }> { return api.patch<{ ok: boolean }>(`/api/mls/leads/${id}`, body); }
export function convertLead(id: number, criteria: Record<string, unknown>): Promise<{ request_id: number }> { return api.post<{ request_id: number }>(`/api/mls/leads/${id}/convert`, { criteria }); }
export function getIntakeToken(): Promise<{ token: string | null }> { return api.get<{ token: string | null }>('/api/mls/leads-intake-token'); }
export function regenIntakeToken(): Promise<{ token: string }> { return api.post<{ token: string }>('/api/mls/leads-intake-token/regenerate', {}); }

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

export interface Readiness { ready: boolean; issues: { field: string; severity: string; message: string }[]; photos: number; platform: string; }
export function getMlsReadiness(id: number, platform = 'avito'): Promise<Readiness> {
  return api.get<Readiness>(`/api/mls/properties/${id}/readiness?platform=${platform}`);
}

// ── Реклама: публикация объекта на площадках (мульти-площадочно) ──
export interface PlatformPlacement {
  key: string; label: string; active: boolean; supports: boolean; ready: boolean;
  issues: { field: string; severity: string; message: string }[];
  status: string;                       // none|pending|approved|published|error|removed
  external_url: string | null; published_until: string | null;
  views: number; contacts: number; favorites: number; moderation_note: string | null;
}
export function getPlacements(id: number): Promise<{ platforms: PlatformPlacement[] }> {
  return api.get<{ platforms: PlatformPlacement[] }>(`/api/mls/properties/${id}/placements`);
}
export function publishToPlatform(id: number, platform: string, phone?: string): Promise<{ ok: boolean; platform: string; status: string }> {
  return api.post(`/api/mls/properties/${id}/feed/${platform}`, phone ? { phone } : {});
}
export function unpublishFromPlatform(id: number, platform: string): Promise<{ ok: boolean }> {
  return api.del(`/api/mls/properties/${id}/feed/${platform}`);
}
// Синк обратной связи площадки (отчёт + статистика) → БД. Площадка-уровень (super_admin).
export function syncPlatformFeedback(platform: string): Promise<{ ok: boolean; updated?: number; statsFor?: number; report_id?: number; reason?: string }> {
  return api.post(`/api/mls/feed/${platform}/sync`, {});
}

// ── Co-broking / проведение сделки по объекту ──
export interface SellDealRow {
  id: number; agent_id: number; vkd: number; income: number; commission: number; share: number; is_main: boolean;
}
export interface SellResult {
  ok: boolean; joint: boolean; deal_group_id: number | null; property_status: string; deals: SellDealRow[];
  procuring?: { buyer_agent_id: number; auto_substituted: boolean; override: boolean } | null;
}
// body: { vkd, date?, buyer_agent_id?, buyer_side_share?, buyer:{name,phone}?, client_name?, notes?, override?, override_reason? }
export function sellMlsProperty(id: number, body: Record<string, unknown>): Promise<SellResult> {
  return api.post<SellResult>(`/api/mls/properties/${id}/sell`, body);
}

// ── Procuring cause / закрепление покупателя (co-broking) ──
export interface BuyerClaim {
  id: number; property_id: number; agent_id: number; agent_name: string | null;
  basis: string; verified: boolean; status: string;
  established_at: string; protected_until: string; note: string | null;
  buyer: { name: string | null; phone: string | null } | null; buyer_locked: boolean;
}
export interface ShowingRow {
  id: number; created_at: string; actor_id: number | null; actor_name: string | null;
  buyer_agent_id: number | null; buyer_agent_name: string | null; basis: string; cobroking: boolean; claim_id: number | null;
}
export interface MyClaim {
  id: number; property_id: number; property_address: string | null; locality: string | null;
  buyer_name: string | null; buyer_phone: string | null; basis: string; verified: boolean;
  status: string; established_at: string; protected_until: string; note: string | null;
}
export interface DisputeClaimant { claim_id: number; agent_id: number; agent_name: string | null; basis: string; verified: boolean; established_at: string; note: string | null; }
export interface DisputeGroup {
  property_id: number; property_address: string | null; locality: string | null;
  listing_agent_id: number | null; listing_agent_name: string | null;
  buyer_contact_id: number; buyer_name: string | null; buyer_phone: string | null;
  claimants: DisputeClaimant[];
}
// Залогировать показ (+ закрепить, если указан отдельный агент покупателя).
export function logShowing(id: number, body: { buyer_agent_id?: number | null; buyer?: { name?: string; phone?: string }; buyer_contact_id?: number; basis?: string; note?: string }): Promise<{ ok: boolean; cobroking: boolean; dispute: boolean; claim_id: number | null }> {
  return api.post(`/api/mls/properties/${id}/showings`, body);
}
export function getShowings(id: number): Promise<{ items: ShowingRow[] }> { return api.get(`/api/mls/properties/${id}/showings`); }
export function getPropertyClaims(id: number): Promise<{ items: BuyerClaim[] }> { return api.get(`/api/mls/properties/${id}/claims`); }
export function getMyClaims(): Promise<{ items: MyClaim[] }> { return api.get('/api/mls/claims/mine'); }
export function releaseClaim(id: number): Promise<{ ok: boolean }> { return api.post(`/api/mls/claims/${id}/release`, {}); }
export function getClaimDisputes(): Promise<{ items: DisputeGroup[] }> { return api.get('/api/mls/claims/disputes'); }
// :id = ПОБЕДИВШИЙ claim (арбитр).
export function resolveDispute(winningClaimId: number): Promise<{ ok: boolean; winner_agent_id: number }> { return api.post(`/api/mls/claims/${winningClaimId}/resolve`, {}); }

// ── Агрегированный вид «Сделки» (MLS, co-broking сгруппированы) ──
export interface MlsDealAgent { deal_id: number; agent_id: number; agent_name: string | null; vkd: number; income: number; commission: number; }
export interface MlsDealGroup {
  group_id: number; joint: boolean; property_id: number | null; property_address: string | null; locality: string | null;
  date: string; status: string; client_name: string | null; total_vkd: number; total_income: number; agents: MlsDealAgent[];
}
export function getMlsDeals(f?: { status?: string; agent_id?: number; year?: string }): Promise<{ items: MlsDealGroup[] }> {
  const p = new URLSearchParams();
  if (f?.status) p.set('status', f.status);
  if (f?.agent_id) p.set('agent_id', String(f.agent_id));
  if (f?.year) p.set('year', f.year);
  const qs = p.toString();
  return api.get(`/api/mls/deals${qs ? `?${qs}` : ''}`);
}
// Отмена сделки (group-aware на бэке): передаём любой deal_id группы. Гейт — раздел /deals (admin).
export function cancelMlsDeal(dealId: number): Promise<{ ok: boolean; cancelled: number }> { return api.post(`/api/deals/${dealId}/cancel`, {}); }

// ── Агрегированный вид «Клиенты» (контакты: роли + счётчики) ──
export interface MlsContact { id: number; name: string | null; phone: string | null; email: string | null; owned: number; requests: number; leads: number; buy_deals: number; }
export function getMlsContacts(q?: string): Promise<{ items: MlsContact[]; total: number }> { return api.get(`/api/mls/contacts${q ? `?q=${encodeURIComponent(q)}` : ''}`); }
export interface MlsContactDetail {
  contact: { id: number; name: string | null; phone: string | null; email: string | null; note: string | null; created_at: string };
  properties: { id: number; address: string | null; locality: string | null; status: string; price: number | null }[];
  requests: { id: number; status: string; deal_type: string | null; price_min: number | null; price_max: number | null }[];
  leads: { id: number; status: string; source: string; created_at: string }[];
  deals: { id: number; property_id: number | null; vkd: number; status: string; date: string }[];
}
export function getMlsContact(id: number): Promise<MlsContactDetail> { return api.get(`/api/mls/contacts/${id}`); }

// ── Управление доступом к MLS/CRM (whitelist, super_admin) ──
export interface WhitelistAgent { id: number; name: string; role: string; city: string | null; status: string; }
export function getMlsWhitelist(): Promise<{ ids: number[]; items: WhitelistAgent[] }> { return api.get('/api/mls/whitelist'); }
export function updateMlsWhitelist(body: { add?: number; remove?: number; ids?: number[] }): Promise<{ ids: number[]; items: WhitelistAgent[] }> {
  return api.post('/api/mls/whitelist', body);
}

// ── Кабинет собственника (персональная ссылка) ──
export interface PortalLink { has_owner: boolean; enabled: boolean; token: string | null; link: string | null; last_seen_at?: string | null; }
export function getPortalLink(id: number): Promise<PortalLink> {
  return api.get<PortalLink>(`/api/mls/properties/${id}/portal-link`);
}
export function issuePortalLink(id: number, regenerate = false): Promise<PortalLink> {
  return api.post<PortalLink>(`/api/mls/properties/${id}/portal-link${regenerate ? '?regenerate=1' : ''}`, {});
}
export function revokePortalLink(id: number): Promise<{ ok: boolean }> {
  return api.del<{ ok: boolean }>(`/api/mls/properties/${id}/portal-link`);
}

// ── Заявки специалистам по объекту (этапы сделки) ──
export interface PropertyCaseTrack { track: string; track_label: string; status: string; stage_label: string; }
export interface PropertyCase { id: number; status: string; created_at: string; tracks: PropertyCaseTrack[]; }
export function getPropertyCases(id: number): Promise<{ items: PropertyCase[] }> {
  return api.get<{ items: PropertyCase[] }>(`/api/mls/properties/${id}/cases`);
}
// Создать заявку специалисту по объекту. taskType: doc_check (юрист) | mortgage (ипотека).
export function createPropertyCase(id: number, taskType: string): Promise<{ id: number }> {
  return api.post<{ id: number }>(`/api/cases`, { propertyId: id, taskType });
}

// ── Документы клиента по объекту (загружены клиентом из кабинета) ──
export interface ClientDocMeta { id: number; name: string; content_type: string | null; size_bytes: number | null; created_at: string; }
export function getPropertyDocuments(id: number): Promise<{ items: ClientDocMeta[] }> {
  return api.get<{ items: ClientDocMeta[] }>(`/api/mls/properties/${id}/documents`);
}
// Приватное скачивание через blob (заголовок авторизации нельзя поставить на <a>).
export async function openClientDocument(id: number): Promise<void> {
  const r = await fetch(`${API_BASE_URL}/api/mls/documents/${id}/file`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!r.ok) throw new Error('Не удалось открыть документ');
  const url = URL.createObjectURL(await r.blob());
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// AI-описание объекта (переиспользует инструмент listing из /api/ai).
export function generateAiListing(input: Record<string, unknown>): Promise<{ text: string }> {
  return api.post<{ text: string }>('/api/ai/generate', { tool: 'listing', input });
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
  active: 'Активен', draft: 'Черновик', deposit: 'Задаток', sold: 'Продан', sold_external: 'Продано не нами', withdrawn: 'Снят с продажи', archived: 'Архив',
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

// ── Заявки покупателей (спрос) + мэтчинг ──
export interface BuyerRequest {
  id: number; agent_id: number; agent_name?: string; contact_id: number | null;
  status: string; deal_type: string | null;
  property_types: string[] | null; rooms: string[] | null; localities: string[] | null;
  market_type: string | null;
  price_min: number | null; price_max: number | null; area_min: number | null; area_max: number | null;
  land_area_min: number | null; land_area_max: number | null;
  note: string | null; source: string; raw_text: string | null;
  buyer_name?: string | null; created_at: string; updated_at: string; match_count?: number;
}
export interface BuyerRequestDetail extends BuyerRequest {
  agent: { id: number; name: string; phone: string | null };
  buyer: MlsContact | null; buyer_locked: boolean;
}
export function listMlsRequests(f: { status?: string; deal_type?: string; limit?: number; offset?: number }): Promise<{ total: number; limit: number; offset: number; items: BuyerRequest[] }> {
  const q = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
  return api.get(`/api/mls/requests?${q.toString()}`);
}
export function getMlsRequest(id: number): Promise<BuyerRequestDetail> { return api.get(`/api/mls/requests/${id}`); }
export function getRequestMatches(id: number): Promise<{ total: number; items: MlsListItem[] }> { return api.get(`/api/mls/requests/${id}/matches`); }
export function createMlsRequest(body: Record<string, unknown>): Promise<{ id: number }> { return api.post('/api/mls/requests', body); }
export function updateMlsRequest(id: number, body: Record<string, unknown>): Promise<{ ok: boolean }> { return api.put(`/api/mls/requests/${id}`, body); }
export function deleteMlsRequest(id: number): Promise<{ ok: boolean }> { return api.del(`/api/mls/requests/${id}`); }
export function aiParseRequest(text: string): Promise<{ criteria: Record<string, unknown>; raw_text: string }> { return api.post('/api/mls/requests/ai-parse', { text }); }
export interface PropertyBuyer { id: number; agent_id: number; agent_name: string; deal_type: string | null; property_types: string[] | null; rooms: string[] | null; localities: string[] | null; price_min: number | null; price_max: number | null; note: string | null; }
export function getPropertyBuyers(id: number): Promise<{ total: number; items: PropertyBuyer[] }> { return api.get(`/api/mls/properties/${id}/buyers`); }

export function phoneFmt(raw: string | null | undefined): string {
  if (!raw) return '';
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
  return String(raw);
}
