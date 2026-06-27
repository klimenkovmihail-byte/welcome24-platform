// CRM → модуль «Объекты»: витрина базы объектов агентства (MLS).
// Сетка карточек + фильтры + диалог карточки (галерея/характеристики/история цены/owner-lock).
// Данные — GET /api/mls/properties[/:id]. Раздел скрыт (super_admin), гейт — в роутере/сайдбаре.
import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Thread from '../Thread';
import { getCurrentAgent } from '../../auth/auth';
import {
  Box, Typography, Card, CardContent, Chip, Grid, Select, MenuItem, Button,
  Dialog, DialogContent, IconButton, Divider, CircularProgress, Stack, Tooltip,
  Autocomplete, TextField, Link, Alert, Checkbox, FormControlLabel,
  Tabs, Tab, useMediaQuery, useTheme,
} from '@mui/material';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PropertyForm from './PropertyForm';
import {
  listMlsProperties, getMlsProperty, getMlsFacets, getPlacements, publishToPlatform, unpublishFromPlatform, approvePlatform, setPremoderation, syncPlatformFeedback, getPropertyBuyers, updateMlsProperty, sellMlsProperty,
  getPortalLink, issuePortalLink, revokePortalLink, getPropertyCases, createPropertyCase,
  getPropertyDocuments, openClientDocument,
  logShowing, getPropertyClaims, releaseClaim, resolveDispute,
  type MlsListItem, type MlsDetail, type SellResult, type BuyerClaim, type PlatformPlacement,
  TYPE_LABEL, DEAL_LABEL, ROOMS_LABEL, STATUS_LABEL, MARKET_LABEL, LAND_UNIT_LABEL,
  PARAM_LABEL, PARAM_ENUM_LABEL, priceFmt, phoneFmt,
  getPropertyViewings, patchViewing,
} from '../../api/mls';
import { ApiError } from '../../api/apiClient';
import { agentsApi } from '../../api/agents';
import { ErrorState, PageSkeleton } from '../States';

const TYPES = ['apartment', 'house', 'land', 'commercial', 'room', 'garage'];
const GOLD = '#C9A84C';

function specsLine(p: MlsListItem | MlsDetail): string {
  const parts: (string | null)[] = [TYPE_LABEL[p.property_type] || p.property_type];
  if (p.rooms) parts.push(ROOMS_LABEL[p.rooms] || p.rooms);
  if (p.total_area) parts.push(`${p.total_area} м²`);
  if ((p.property_type === 'land' || p.property_type === 'house') && p.land_area)
    parts.push(`${p.land_area} ${LAND_UNIT_LABEL[p.land_unit || ''] || ''}`.trim());
  if (p.floor && p.floors) parts.push(`${p.floor}/${p.floors} эт`);
  return parts.filter(Boolean).join(' · ');
}

const photoOf = (p: MlsListItem) => p.photo_thumb || p.photo_url;

export function PropertyCard({ p, onOpen }: { p: MlsListItem; onOpen: () => void }) {
  const img = photoOf(p);
  return (
    <Card
      onClick={onOpen}
      sx={{
        cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'transform .2s, box-shadow .2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 14px 36px rgba(0,0,0,0.45)' },
      }}
    >
      <Box sx={{ position: 'relative', pt: '64%', background: 'rgba(255,255,255,0.03)' }}>
        {img ? (
          <Box component="img" src={img} loading="lazy" alt=""
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
            <ApartmentRoundedIcon sx={{ fontSize: 48 }} />
          </Box>
        )}
        <Chip label={DEAL_LABEL[p.deal_type] || p.deal_type} size="small"
          sx={{ position: 'absolute', top: 8, left: 8, height: 22, fontSize: 11, fontWeight: 700, background: 'rgba(8,12,24,0.8)', color: GOLD, border: `1px solid ${GOLD}55` }} />
        {p.photo_count > 0 && (
          <Chip icon={<PhotoLibraryRoundedIcon sx={{ fontSize: 14 }} />} label={p.photo_count} size="small"
            sx={{ position: 'absolute', top: 8, right: 8, height: 22, fontSize: 11, fontWeight: 700, background: 'rgba(8,12,24,0.8)', color: '#F1F5F9', '& .MuiChip-icon': { color: '#94A3B8' } }} />
        )}
        {p.on_showcase === 0 && (
          <Tooltip title="Не на витрине">
            <VisibilityOffRoundedIcon sx={{ position: 'absolute', bottom: 8, right: 8, fontSize: 18, color: '#94A3B8' }} />
          </Tooltip>
        )}
      </Box>
      <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5, '&:last-child': { pb: 2 } }}>
        <Typography sx={{ fontWeight: 800, color: GOLD, fontSize: 18, lineHeight: 1.2 }}>
          {priceFmt(p.price)}{p.deal_type === 'rent' ? <Box component="span" sx={{ fontSize: 12, color: '#94A3B8' }}> /мес</Box> : null}
        </Typography>
        <Typography sx={{ color: '#F1F5F9', fontWeight: 600, fontSize: 13.5 }}>{specsLine(p)}</Typography>
        <Typography sx={{ color: '#94A3B8', fontSize: 12.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 34 }}>
          {p.address || '—'}
        </Typography>
        <Box sx={{ mt: 'auto', pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.agent_name}
          </Typography>
          <Chip label={STATUS_LABEL[p.status] || p.status} size="small"
            sx={{ height: 18, fontSize: 10, fontWeight: 700, color: p.status === 'active' ? '#22C55E' : '#94A3B8', background: p.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)' }} />
        </Box>
      </CardContent>
    </Card>
  );
}

function Spec({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <Grid size={{ xs: 6, sm: 4 }}>
      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>{label}</Typography>
      <Typography sx={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14 }}>{value}</Typography>
    </Grid>
  );
}

// Диалог проведения сделки по объекту (co-broking). ВКД делится на строки-на-агента
// сервером (POST /sell); комиссия каждого — по его уровню. Объект → «Продан».
function SellDialog({ property, onClose, onDone }: { property: MlsDetail; onClose: () => void; onDone: () => void }) {
  const agentsQ = useQuery({ queryKey: ['agents-active-list'], queryFn: () => agentsApi.list({ role: 'agent', status: 'active' }), staleTime: 300_000 });
  const agents = useMemo(() => (agentsQ.data || []).filter((a) => a.id !== property.agent_id), [agentsQ.data, property.agent_id]);
  const [vkd, setVkd] = useState('');
  const [buyerAgent, setBuyerAgent] = useState<{ id: number; name: string } | null>(null);
  const [share, setShare] = useState(String(property.buyer_side_share ?? 50));
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<SellResult | null>(null);
  // Procuring cause: подсказка/предзаполнение агента из активного закрепления + override при конфликте.
  const [conflict, setConflict] = useState<{ disputed: boolean; hard: boolean } | null>(null);
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [touchedAgent, setTouchedAgent] = useState(false);
  const claimsQ = useQuery({ queryKey: ['mls-claims', property.id], queryFn: () => getPropertyClaims(property.id), staleTime: 20_000 });
  const activeClaim = useMemo<BuyerClaim | undefined>(() => (claimsQ.data?.items || []).find((c) => c.status === 'active'), [claimsQ.data]);
  // Предзаполняем агента покупателя из закрепления (если пользователь сам ещё не выбрал).
  useEffect(() => {
    if (!touchedAgent && activeClaim && !buyerAgent) setBuyerAgent({ id: activeClaim.agent_id, name: activeClaim.agent_name || `Агент #${activeClaim.agent_id}` });
  }, [activeClaim, touchedAgent, buyerAgent]);

  const vkdNum = Number(String(vkd).replace(/\s/g, ''));
  const valid = Number.isFinite(vkdNum) && vkdNum > 0;
  const fieldSx = { '& .MuiOutlinedInput-root': { color: '#F1F5F9', '& fieldset': { borderColor: `${GOLD}33` }, '&:hover fieldset': { borderColor: `${GOLD}66` } }, '& .MuiInputLabel-root': { color: '#94A3B8' }, '& .MuiFormHelperText-root': { color: '#64748B' } };

  async function submit() {
    setErr('');
    if (conflict && override && !overrideReason.trim()) { setErr('Укажите причину override'); return; }
    setBusy(true);
    try {
      const r = await sellMlsProperty(property.id, {
        vkd: vkdNum,
        date,
        buyer_agent_id: buyerAgent?.id ?? null,
        buyer_side_share: buyerAgent ? (share.trim() === '' ? 0 : Number(share)) : undefined,
        buyer: (buyerName.trim() || buyerPhone.trim()) ? { name: buyerName.trim(), phone: buyerPhone.trim() } : undefined,
        client_name: buyerName.trim() || undefined,
        notes: notes.trim() || undefined,
        override: conflict && override ? true : undefined,
        override_reason: conflict && override ? overrideReason.trim() : undefined,
      });
      setResult(r);
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && (e.body as { code?: string })?.code === 'procuring_conflict') {
        const body = e.body as { disputed?: boolean; hard?: boolean };
        setConflict({ disputed: !!body.disputed, hard: !!body.hard });
      }
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  const agentName = (aid: number) => agents.find((a) => a.id === aid)?.name || (aid === property.agent_id ? property.agent?.name : null) || `Агент #${aid}`;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { background: 'linear-gradient(135deg,#0F1629,#0A0E1A)', border: `1px solid ${GOLD}33`, borderRadius: 3 } } }}>
      <Box sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <HandshakeRoundedIcon sx={{ color: GOLD }} />
          <Typography sx={{ color: GOLD, fontWeight: 800, fontSize: 18, flex: 1 }}>Провести сделку по объекту</Typography>
          <IconButton onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
        </Stack>

        {result ? (
          <Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 2, color: '#22C55E' }}>
              <CheckCircleRoundedIcon /><Typography sx={{ fontWeight: 700 }}>Сделка проведена{result.joint ? ' (совместная)' : ''}</Typography>
            </Box>
            <Stack spacing={1}>
              {result.deals.map((row) => (
                <Box key={row.id} sx={{ p: 1.25, borderRadius: 1.5, background: `${GOLD}0E`, border: `1px solid ${GOLD}22` }}>
                  <Typography sx={{ color: '#F1F5F9', fontSize: 14 }}>{agentName(row.agent_id)}{row.is_main ? ' · листинг' : ' · покупатель'} — доля {row.share}%</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>ВКД {priceFmt(row.vkd)} · {row.commission}% · доход {priceFmt(row.income)}</Typography>
                </Box>
              ))}
            </Stack>
            <Button fullWidth variant="contained" onClick={onClose}
              sx={{ mt: 2, background: GOLD, color: '#06210F', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#B8973F' } }}>Готово</Button>
          </Box>
        ) : (
          <Stack spacing={2}>
            <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>{specsLine(property)} · {property.address || '—'}</Typography>
            <TextField label="ВКД сделки, ₽" value={vkd} onChange={(e) => setVkd(e.target.value.replace(/[^\d]/g, ''))} size="small" fullWidth sx={fieldSx}
              helperText={vkd ? priceFmt(vkdNum) : 'Валовый комиссионный доход всей сделки'} />
            <Autocomplete size="small" options={agents.map((a) => ({ id: a.id, name: a.name }))} getOptionLabel={(o) => o.name}
              value={buyerAgent} onChange={(_, v) => { setBuyerAgent(v); setTouchedAgent(true); setConflict(null); setOverride(false); setOverrideReason(''); }} loading={agentsQ.isLoading} isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => <TextField {...params} label="Агент покупателя (co-broking) — необязательно" sx={fieldSx} />} />
            {activeClaim && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1.5, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
                <GavelRoundedIcon sx={{ fontSize: 15, color: '#C084FC' }} />
                <Typography sx={{ color: '#C084FC', fontSize: 12 }}>Покупатель закреплён за {activeClaim.agent_name || `агентом #${activeClaim.agent_id}`} (procuring cause) — подставлен автоматически</Typography>
              </Box>
            )}
            {buyerAgent && (
              <TextField label="Доля агента покупателя, %" value={share} onChange={(e) => setShare(e.target.value.replace(/[^\d]/g, ''))} size="small" fullWidth sx={fieldSx}
                helperText="По умолчанию — с карточки объекта" />
            )}
            <Stack direction="row" spacing={1}>
              <TextField label="Покупатель (имя)" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} size="small" fullWidth sx={fieldSx} />
              <TextField label="Телефон" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} size="small" fullWidth sx={fieldSx} />
            </Stack>
            <TextField label="Дата сделки" type="date" value={date} onChange={(e) => setDate(e.target.value)} size="small" fullWidth sx={fieldSx} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Примечание" value={notes} onChange={(e) => setNotes(e.target.value)} size="small" fullWidth multiline minRows={2} sx={fieldSx} />
            {err && <Alert severity="error" sx={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5' }}>{err}</Alert>}
            {conflict && !conflict.hard && (
              <Box sx={{ p: 1.25, borderRadius: 1.5, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <FormControlLabel sx={{ m: 0 }} control={<Checkbox checked={override} onChange={(e) => setOverride(e.target.checked)} size="small" sx={{ color: '#F59E0B', '&.Mui-checked': { color: '#F59E0B' } }} />}
                  label={<Typography sx={{ color: '#FCD34D', fontSize: 13, fontWeight: 600 }}>Провести в обход закрепления (override)</Typography>} />
                {override && (
                  <TextField label="Причина override (для арбитра)" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} size="small" fullWidth sx={{ ...fieldSx, mt: 1 }} />
                )}
              </Box>
            )}
            {conflict?.hard && <Typography sx={{ color: '#FCA5A5', fontSize: 12 }}>Жёсткий блок включён в настройках — обойти закрепление нельзя. Разрешите спор в арбитраже (модуль «Закрепления»).</Typography>}
            <Typography sx={{ color: '#64748B', fontSize: 12 }}>
              {buyerAgent ? `Совместная сделка: ВКД делится ${100 - (Number(share) || 0)}/${Number(share) || 0}, комиссия каждого агента — по его уровню.` : 'Одиночная сделка: вся комиссия — листинг-агенту.'} Объект перейдёт в статус «Продан».
            </Typography>
            <Button fullWidth variant="contained" disabled={!valid || busy} onClick={submit}
              startIcon={busy ? <CircularProgress size={16} sx={{ color: '#06210F' }} /> : <HandshakeRoundedIcon />}
              sx={{ background: GOLD, color: '#06210F', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#B8973F' }, '&.Mui-disabled': { background: '#475569', color: '#1E293B' } }}>Провести сделку</Button>
          </Stack>
        )}
      </Box>
    </Dialog>
  );
}

// Блок «Кабинет собственника» в карточке: выдать/скопировать/отозвать персональную ссылку.
// Ссылку (сырой токен) бэк отдаёт только владельцу-агенту/super_admin (иначе link=null).
function PortalLinkBlock({ propertyId }: { propertyId: number }) {
  const { data, refetch, isLoading } = useQuery({ queryKey: ['mls-portal-link', propertyId], queryFn: () => getPortalLink(propertyId), staleTime: 30_000 });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = data?.link;
  async function issue(regenerate = false) { setBusy(true); try { await issuePortalLink(propertyId, regenerate); await refetch(); } finally { setBusy(false); } }
  async function revoke() { setBusy(true); try { await revokePortalLink(propertyId); await refetch(); } finally { setBusy(false); } }
  function copy() { if (link) { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } }
  if (isLoading || !data) return null;
  return (
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(148,163,184,0.15)' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <LinkRoundedIcon sx={{ fontSize: 18, color: '#60A5FA' }} />
        <Typography sx={{ color: '#93C5FD', fontWeight: 700, fontSize: 13 }}>Кабинет собственника</Typography>
      </Stack>
      {!data.has_owner ? (
        <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Добавьте контакт собственника, чтобы выдать ссылку в личный кабинет.</Typography>
      ) : !data.enabled ? (
        <Button size="small" variant="outlined" disabled={busy} onClick={() => issue(false)}
          sx={{ color: '#60A5FA', borderColor: 'rgba(96,165,250,0.4)', textTransform: 'none' }}>{busy ? 'Создаём…' : 'Выдать ссылку собственнику'}</Button>
      ) : (
        <>
          {link ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TextField value={link} size="small" fullWidth slotProps={{ input: { readOnly: true } }}
                sx={{ '& .MuiOutlinedInput-root': { color: '#CBD5E1', fontSize: 12, '& fieldset': { borderColor: 'rgba(96,165,250,0.3)' } } }} />
              <Button size="small" onClick={copy} sx={{ color: '#60A5FA', textTransform: 'none', minWidth: 'auto' }}>{copied ? 'Скопировано' : 'Копировать'}</Button>
            </Stack>
          ) : (
            <Typography sx={{ color: '#94A3B8', fontSize: 12, mb: 1 }}>Ссылка активна (видна только агенту объекта).</Typography>
          )}
          {data.last_seen_at && <Typography sx={{ color: '#64748B', fontSize: 11 }}>Был в кабинете: {data.last_seen_at.slice(0, 16).replace('T', ' ')}</Typography>}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" disabled={busy} onClick={() => issue(true)} sx={{ color: '#94A3B8', textTransform: 'none' }}>Обновить ссылку</Button>
            <Button size="small" disabled={busy} onClick={revoke} sx={{ color: '#FCA5A5', textTransform: 'none' }}>Отозвать</Button>
          </Stack>
        </>
      )}
    </Box>
  );
}

// Блок «Реклама на площадках»: строка на площадку (Авито активна; ЦИАН/ДомКлик/Яндекс — «скоро»).
// Готовность под каждую площадку + статус + публикация/снятие + ссылка на объявление + статистика.
function statusLabel(s: string): { label: string; color: string; bg: string } | null {
  switch (s) {
    case 'published': return { label: 'опубликовано', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
    case 'approved': return { label: 'одобрено', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
    case 'pending': return { label: 'на премодерации', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
    case 'error': return { label: 'ошибка', color: '#FCA5A5', bg: 'rgba(239,68,68,0.12)' };
    default: return null;
  }
}
function AdvertBlock({ property }: { property: MlsDetail }) {
  const { data, refetch, isLoading } = useQuery({ queryKey: ['mls-placements', property.id], queryFn: () => getPlacements(property.id), staleTime: 20_000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const isSuper = getCurrentAgent()?.role === 'super_admin';
  const isAdmin = isSuper || getCurrentAgent()?.role === 'listing_manager';
  const isPublished = (p: PlatformPlacement) => ['published', 'approved', 'pending'].includes(p.status);
  async function toggle(p: PlatformPlacement) {
    setBusy(p.key); setErr(null);
    try {
      if (isPublished(p)) await unpublishFromPlatform(property.id, p.key);
      else await publishToPlatform(property.id, p.key);
      await refetch();
    } catch (e) {
      const m = e instanceof ApiError ? (e.data as { error?: string })?.error || e.message : (e as Error)?.message;
      setErr(m || 'Не удалось изменить публикацию');
    } finally { setBusy(null); }
  }
  async function approve(p: PlatformPlacement) {
    setBusy(p.key); setErr(null);
    try { await approvePlatform(property.id, p.key); await refetch(); }
    catch (e) {
      const m = e instanceof ApiError ? (e.data as { error?: string })?.error || e.message : (e as Error)?.message;
      setErr(m || 'Не удалось подтвердить');
    } finally { setBusy(null); }
  }
  async function togglePremod(v: boolean) {
    setErr(null);
    try { await setPremoderation(v); await refetch(); }
    catch (e) {
      const m = e instanceof ApiError ? (e.data as { error?: string })?.error || e.message : (e as Error)?.message;
      setErr(m || 'Не удалось переключить премодерацию');
    }
  }
  async function doSync() {
    setSyncing(true); setErr(null);
    try {
      const r = await syncPlatformFeedback('avito');
      if (r && r.ok === false) setErr(r.reason === 'avito-not-configured' ? 'Avito API-креды не настроены' : r.reason === 'sync-in-progress' ? 'Синхронизация уже идёт' : 'Синхронизация не выполнена');
      await refetch();
    } catch (e) {
      const m = e instanceof ApiError ? (e.data as { error?: string })?.error || e.message : (e as Error)?.message;
      setErr(m || 'Не удалось обновить статусы');
    } finally { setSyncing(false); }
  }
  if (isLoading || !data) return null;
  return (
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: `${GOLD}0E`, border: `1px solid ${GOLD}33` }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <CampaignRoundedIcon sx={{ fontSize: 18, color: GOLD }} />
        <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 13 }}>Реклама на площадках</Typography>
        {isSuper && (
          <Tooltip title="Премодерация: при включении пометка объекта встаёт «на премодерации» и попадает в фид только после подтверждения админом">
            <Button size="small" onClick={() => togglePremod(!data.premoderation)}
              sx={{ ml: 'auto', textTransform: 'none', fontSize: 11, minWidth: 0, color: data.premoderation ? '#F59E0B' : '#64748B' }}>
              Премодерация: {data.premoderation ? 'вкл' : 'выкл'}
            </Button>
          </Tooltip>
        )}
        {isSuper && (
          <Tooltip title="Подтянуть с Авито статусы, ссылки и статистику ВСЕХ объявлений">
            <Button size="small" disabled={syncing} onClick={doSync}
              startIcon={syncing ? <CircularProgress size={12} sx={{ color: '#94A3B8' }} /> : <RefreshRoundedIcon sx={{ fontSize: 15 }} />}
              sx={{ ml: 0, color: '#94A3B8', textTransform: 'none', fontSize: 11, minWidth: 0 }}>{syncing ? 'Обновляю…' : 'Обновить'}</Button>
          </Tooltip>
        )}
      </Stack>
      {err && <Typography sx={{ color: '#FCA5A5', fontSize: 12, mb: 1 }}>{err}</Typography>}
      <Stack spacing={0.75}>
        {data.platforms.filter((p) => p.active).map((p) => {
          const published = isPublished(p);
          const chip = statusLabel(p.status);
          return (
            <Box key={p.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 1, py: 0.75, borderRadius: 1.5, background: 'rgba(255,255,255,0.03)' }}>
              <Typography sx={{ color: '#E2E8F0', fontWeight: 600, fontSize: 13, minWidth: 132 }}>{p.label}</Typography>
              {!p.supports ? (
                <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>пока только квартиры на продажу</Typography>
              ) : (
                <>
                  {chip && <Chip label={chip.label} size="small" sx={{ height: 20, fontSize: 11, background: chip.bg, color: chip.color, fontWeight: 700 }} />}
                  {p.external_id && <Typography sx={{ color: '#94A3B8', fontSize: 11 }}>№{p.external_id}</Typography>}
                  {!published && !p.ready && (
                    <Tooltip title={p.issues.filter((i) => i.severity === 'block').map((i) => i.message).join('; ')}>
                      <Typography sx={{ color: '#F59E0B', fontSize: 12 }}>не готов — чего не хватает ⓘ</Typography>
                    </Tooltip>
                  )}
                  {p.moderation_note && <Typography sx={{ color: '#FCA5A5', fontSize: 11 }}>{p.moderation_note}</Typography>}
                  {p.external_url && <Link href={p.external_url} target="_blank" rel="noreferrer" sx={{ color: GOLD, fontSize: 12, fontWeight: 600 }}>объявление ↗</Link>}
                  {(p.views > 0 || p.contacts > 0 || p.favorites > 0) && <Typography sx={{ color: '#64748B', fontSize: 11 }}>👁 {p.views} · ☎ {p.contacts} · ♡ {p.favorites}</Typography>}
                  {p.published_until && <Typography sx={{ color: '#64748B', fontSize: 11 }}>до {p.published_until.slice(0, 10).split('-').reverse().slice(0, 2).join('.')}</Typography>}
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                    {p.status === 'pending' && isAdmin && (
                      <Button size="small" disabled={busy === p.key} onClick={() => approve(p)}
                        sx={{ textTransform: 'none', fontSize: 12, color: '#22C55E', minWidth: 'auto' }}>Подтвердить</Button>
                    )}
                    <Button size="small" disabled={busy === p.key || (!published && !p.ready)} onClick={() => toggle(p)}
                      sx={{ textTransform: 'none', fontSize: 12, color: published ? '#FCA5A5' : GOLD, minWidth: 'auto' }}>
                      {busy === p.key ? '…' : published ? 'Снять' : 'Опубликовать'}
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          );
        })}
        {data.platforms.some((p) => !p.active) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 1, py: 0.75, borderRadius: 1.5, background: 'rgba(255,255,255,0.02)' }}>
            <Chip label="скоро" size="small" sx={{ height: 20, fontSize: 11, background: 'rgba(100,116,139,0.18)', color: '#94A3B8' }} />
            <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>{data.platforms.filter((p) => !p.active).map((p) => p.label).join(' · ')}</Typography>
          </Box>
        )}
      </Stack>
      <Typography sx={{ color: '#64748B', fontSize: 11, mt: 1 }}>
        Площадка забирает фид по расписанию — после публикации объявление появляется в течение ~часа.
      </Typography>
    </Box>
  );
}

// Заявки специалистам (юрист/брокер) по объекту — этапы сделки: показ текущего этапа + создание.
function CasesBlock({ propertyId }: { propertyId: number }) {
  const { data, refetch, isLoading } = useQuery({ queryKey: ['mls-property-cases', propertyId], queryFn: () => getPropertyCases(propertyId), staleTime: 30_000 });
  const [busy, setBusy] = useState('');
  async function create(taskType: string) {
    setBusy(taskType);
    try { await createPropertyCase(propertyId, taskType); await refetch(); } finally { setBusy(''); }
  }
  if (isLoading || !data) return null;
  return (
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(148,163,184,0.15)' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <AssignmentRoundedIcon sx={{ fontSize: 18, color: '#22C55E' }} />
        <Typography sx={{ color: '#86EFAC', fontWeight: 700, fontSize: 13 }}>Заявки специалистам (этапы сделки)</Typography>
      </Stack>
      {data.items.length > 0 ? (
        <Stack spacing={1} sx={{ mb: 1 }}>
          {data.items.map((c) => (
            <Box key={c.id} sx={{ p: 1, borderRadius: 1.5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.12)' }}>
              <Typography sx={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>Заявка #{c.id}</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75} sx={{ mt: 0.5 }}>
                {c.tracks.length ? c.tracks.map((t) => (
                  <Chip key={t.track} size="small" label={`${t.track_label}: ${t.stage_label}`} sx={{ fontSize: 11, color: '#CBD5E1', background: 'rgba(148,163,184,0.12)' }} />
                )) : <Typography sx={{ color: '#64748B', fontSize: 12 }}>в очереди</Typography>}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography sx={{ color: '#94A3B8', fontSize: 13, mb: 1 }}>Заявок по объекту пока нет.</Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" disabled={!!busy} onClick={() => create('doc_check')}
          sx={{ color: '#22C55E', borderColor: 'rgba(34,197,94,0.4)', textTransform: 'none' }}>{busy === 'doc_check' ? '…' : '+ Юрист'}</Button>
        <Button size="small" variant="outlined" disabled={!!busy} onClick={() => create('mortgage')}
          sx={{ color: '#22C55E', borderColor: 'rgba(34,197,94,0.4)', textTransform: 'none' }}>{busy === 'mortgage' ? '…' : '+ Ипотека'}</Button>
      </Stack>
    </Box>
  );
}

// Документы, загруженные КЛИЕНТОМ по объекту (для агента/юриста). Скачивание — приватно через blob.
function ClientDocsBlock({ propertyId }: { propertyId: number }) {
  const { data, isLoading } = useQuery({ queryKey: ['mls-property-docs', propertyId], queryFn: () => getPropertyDocuments(propertyId), staleTime: 30_000 });
  if (isLoading || !data || data.items.length === 0) return null;
  return (
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(148,163,184,0.15)' }}>
      <Typography sx={{ color: '#C4B5FD', fontWeight: 700, fontSize: 13, mb: 1 }}>Документы от клиента</Typography>
      <Stack spacing={0.75}>
        {data.items.map((d) => (
          <Stack key={d.id} direction="row" alignItems="center" spacing={1}>
            <Link component="button" onClick={() => openClientDocument(d.id).catch(() => {})} underline="hover" sx={{ color: '#C4B5FD', fontSize: 13, textAlign: 'left' }}>{d.name}</Link>
            <Typography sx={{ color: '#64748B', fontSize: 11 }}>{d.created_at?.slice(0, 10)}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// Чат с собственником по объекту (агентская сторона) — переиспользует портальный Thread.
function OwnerChatBlock({ propertyId, myId }: { propertyId: number; myId: number | null }) {
  return (
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(148,163,184,0.15)' }}>
      <Typography sx={{ color: '#4ade80', fontWeight: 700, fontSize: 13, mb: 1 }}>Чат с собственником</Typography>
      <Thread apiBase={`/mls/properties/${propertyId}/client-chat`} myId={myId} myRole="agent" maxHeight={300} privateFiles emptyText="Сообщений пока нет. Напишите собственнику." />
    </Box>
  );
}

// Заявки на показ объекта от покупателей (агентская сторона) — подтвердить/отклонить.
function ViewingsBlock({ propertyId }: { propertyId: number }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['mls-viewings', propertyId], queryFn: () => getPropertyViewings(propertyId), refetchInterval: 30_000 });
  const items = (data?.items || []).filter((v) => v.status === 'pending' || v.status === 'confirmed');
  if (items.length === 0) return null;
  const act = async (vid: number, status: string) => { await patchViewing(propertyId, vid, { status }); qc.invalidateQueries({ queryKey: ['mls-viewings', propertyId] }); };
  return (
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(148,163,184,0.15)' }}>
      <Typography sx={{ color: '#93C5FD', fontWeight: 700, fontSize: 13, mb: 1 }}>Заявки на показ от покупателей</Typography>
      <Stack spacing={1}>
        {items.map((v) => (
          <Stack key={v.id} direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <Typography sx={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>{v.buyer_name || 'Покупатель'}</Typography>
            {v.buyer_phone && <Link href={`tel:${v.buyer_phone.replace(/\s/g, '')}`} underline="hover" sx={{ color: GOLD, fontSize: 13 }}>{v.buyer_phone}</Link>}
            <Chip label={v.status === 'confirmed' ? 'Подтверждён' : 'Ожидает'} size="small" sx={{ background: v.status === 'confirmed' ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.14)', color: v.status === 'confirmed' ? '#22C55E' : '#F59E0B', fontSize: 11, fontWeight: 700 }} />
            {v.preferred_date && <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>{v.preferred_date}</Typography>}
            <Box sx={{ flex: 1 }} />
            {v.status === 'pending' && <Button size="small" onClick={() => act(v.id, 'confirmed')} sx={{ color: '#22C55E', textTransform: 'none', minWidth: 0 }}>Подтвердить</Button>}
            <Button size="small" onClick={() => act(v.id, 'cancelled')} sx={{ color: '#EF4444', textTransform: 'none', minWidth: 0 }}>{v.status === 'confirmed' ? 'Отменить' : 'Отклонить'}</Button>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

const CLAIM_STATUS = {
  active: { label: 'Закреплён', color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
  disputed: { label: 'Спор', color: '#F59E0B', bg: 'rgba(245,158,11,0.16)' },
  honored: { label: 'Реализован', color: '#60A5FA', bg: 'rgba(96,165,250,0.14)' },
} as const;
const BASIS_LABEL: Record<string, string> = { showing: 'Показ', viewing_request: 'Заявка на показ', buyer_request: 'Заявка покупателя', manual: 'Вручную' };

// Блок «Показы и закрепление покупателя» (procuring cause). Закрепление даёт агенту
// покупателя право на co-broking-долю; защита окно N дней; спор решает арбитр (листинг-
// менеджер/super_admin). Контакт покупателя виден только своему агенту/арбитру (152-ФЗ).
function ProcuringBlock({ property }: { property: MlsDetail }) {
  const qc = useQueryClient();
  const me = getCurrentAgent();
  const isArbiter = me?.role === 'super_admin' || me?.role === 'listing_manager';
  const sellable = property.status === 'active' || property.status === 'deposit';
  const { data } = useQuery({ queryKey: ['mls-claims', property.id], queryFn: () => getPropertyClaims(property.id), staleTime: 20_000 });
  const claims = data?.items || [];

  const agentsQ = useQuery({ queryKey: ['agents-active-list'], queryFn: () => agentsApi.list({ role: 'agent', status: 'active' }), staleTime: 300_000, enabled: sellable });
  const agents = useMemo(() => (agentsQ.data || []).filter((a) => a.id !== property.agent_id), [agentsQ.data, property.agent_id]);

  const [open, setOpen] = useState(false);
  const [buyerAgent, setBuyerAgent] = useState<{ id: number; name: string } | null>(null);
  const [bName, setBName] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const invalidate = () => { ['mls-claims', 'mls-showings'].forEach((k) => qc.invalidateQueries({ queryKey: [k, property.id] })); };

  async function submitShowing() {
    setErr('');
    if (!buyerAgent) { setErr('Выберите агента покупателя'); return; }
    if (!bName.trim() && !bPhone.trim()) { setErr('Укажите покупателя (имя/телефон)'); return; }
    setBusy(true);
    try {
      await logShowing(property.id, { buyer_agent_id: buyerAgent.id, buyer: { name: bName.trim(), phone: bPhone.trim() } });
      setOpen(false); setBuyerAgent(null); setBName(''); setBPhone(''); invalidate();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function doRelease(claimId: number) { await releaseClaim(claimId); invalidate(); }
  async function doResolve(claimId: number) { await resolveDispute(claimId); invalidate(); }

  if (!sellable && claims.length === 0) return null;
  const fieldSx = { '& .MuiOutlinedInput-root': { color: '#F1F5F9', '& fieldset': { borderColor: `${GOLD}33` } }, '& .MuiInputLabel-root': { color: '#94A3B8' } };

  return (
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(148,163,184,0.15)' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: claims.length || open ? 1 : 0 }}>
        <GavelRoundedIcon sx={{ fontSize: 18, color: '#C084FC' }} />
        <Typography sx={{ color: '#C084FC', fontWeight: 700, fontSize: 13, flex: 1 }}>Показы и закрепление покупателя</Typography>
        {sellable && <Button size="small" onClick={() => setOpen((v) => !v)} sx={{ color: '#C084FC', textTransform: 'none', minWidth: 0 }}>{open ? 'Скрыть' : 'Записать показ'}</Button>}
      </Stack>

      {open && (
        <Stack spacing={1} sx={{ mb: claims.length ? 1.5 : 0 }}>
          <Autocomplete size="small" options={agents.map((a) => ({ id: a.id, name: a.name }))} getOptionLabel={(o) => o.name}
            value={buyerAgent} onChange={(_, v) => setBuyerAgent(v)} loading={agentsQ.isLoading} isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Агент покупателя" sx={fieldSx} />} />
          <Stack direction="row" spacing={1}>
            <TextField label="Покупатель (имя)" value={bName} onChange={(e) => setBName(e.target.value)} size="small" fullWidth sx={fieldSx} />
            <TextField label="Телефон" value={bPhone} onChange={(e) => setBPhone(e.target.value)} size="small" fullWidth sx={fieldSx} />
          </Stack>
          {err && <Typography sx={{ color: '#FCA5A5', fontSize: 12 }}>{err}</Typography>}
          <Button size="small" variant="contained" disabled={busy} onClick={submitShowing}
            sx={{ background: '#A855F7', color: '#fff', fontWeight: 700, textTransform: 'none', alignSelf: 'flex-start', '&:hover': { background: '#9333EA' } }}>
            {busy ? 'Закрепляю…' : 'Зафиксировать показ + закрепить'}
          </Button>
          <Typography sx={{ color: '#64748B', fontSize: 11 }}>Закрепление даёт агенту покупателя право на co-broking-долю. Если покупатель уже закреплён за другим — откроется спор для арбитра.</Typography>
        </Stack>
      )}

      <Stack spacing={1}>
        {claims.map((c) => {
          const st = CLAIM_STATUS[c.status as keyof typeof CLAIM_STATUS] || { label: c.status, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
          const mine = me?.id === c.agent_id;
          return (
            <Box key={c.id} sx={{ p: 1, borderRadius: 1.5, background: 'rgba(15,22,41,0.5)', border: '1px solid rgba(168,85,247,0.16)' }}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={st.label} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg }} />
                <Typography sx={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>{c.agent_name || `Агент #${c.agent_id}`}</Typography>
                {c.verified && <Tooltip title="Подтверждённый показ"><CheckCircleRoundedIcon sx={{ fontSize: 14, color: '#22C55E' }} /></Tooltip>}
                <Typography sx={{ color: '#64748B', fontSize: 11 }}>{BASIS_LABEL[c.basis] || c.basis}{c.status === 'active' ? ` · до ${c.protected_until?.slice(0, 10)}` : ''}</Typography>
                <Box sx={{ flex: 1 }} />
                {mine && (c.status === 'active' || c.status === 'disputed') && (
                  <Button size="small" onClick={() => doRelease(c.id)} sx={{ color: '#EF4444', textTransform: 'none', minWidth: 0, fontSize: 12 }}>Отпустить</Button>
                )}
                {isArbiter && c.status === 'disputed' && (
                  <Button size="small" onClick={() => doResolve(c.id)} sx={{ color: '#22C55E', textTransform: 'none', minWidth: 0, fontSize: 12 }}>Признать победителем</Button>
                )}
              </Stack>
              {c.buyer_locked ? (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#94A3B8', mt: 0.25 }}>
                  <LockRoundedIcon sx={{ fontSize: 12 }} /><Typography sx={{ fontSize: 12 }}>Контакт покупателя скрыт</Typography>
                </Stack>
              ) : c.buyer ? (
                <Typography sx={{ color: '#94A3B8', fontSize: 12, mt: 0.25 }}>
                  {c.buyer.name || 'Покупатель'}{c.buyer.phone ? ` · ${phoneFmt(c.buyer.phone)}` : ''}
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

export function DetailDialog({ id, onClose, onEdit }: { id: number; onClose: () => void; onEdit: () => void }) {
  const myId = getCurrentAgent()?.id ?? null;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mls-property', id],
    queryFn: () => getMlsProperty(id),
  });
  const buyersQ = useQuery({ queryKey: ['mls-property-buyers', id], queryFn: () => getPropertyBuyers(id), staleTime: 60_000 });
  const buyers = buyersQ.data;
  const placementsQ = useQuery({ queryKey: ['mls-placements', id], queryFn: () => getPlacements(id), staleTime: 20_000 });
  const casesQ = useQuery({ queryKey: ['mls-property-cases', id], queryFn: () => getPropertyCases(id), staleTime: 30_000 });
  const qc = useQueryClient();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [statusBusy, setStatusBusy] = useState(false);
  const [tab, setTab] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  async function changeStatus(s: string) {
    setStatusBusy(true);
    try {
      await updateMlsProperty(id, { _status: s });
      await refetch();
      ['mls-properties', 'mls-count', 'mls-request-matches', 'mls-property-buyers'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } finally { setStatusBusy(false); }
  }
  const d = data as MlsDetail | undefined;
  const photos = d?.photos || [];
  const main = photos[photoIdx] || photos[0];
  const pubCount = (placementsQ.data?.platforms || []).filter((p) => ['published', 'approved', 'pending'].includes(p.status)).length;
  const casesCount = casesQ.data?.items?.length || 0;
  const movePhoto = (dir: number) => { if (photos.length) setPhotoIdx((i) => (i + dir + photos.length) % photos.length); };
  const tabLabel = (text: string, count: number) => (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      {text}
      {count > 0 && <Box component="span" sx={{ fontSize: 10, lineHeight: '16px', minWidth: 16, textAlign: 'center', px: 0.5, borderRadius: 5, background: `${GOLD}33`, color: GOLD, fontWeight: 700 }}>{count}</Box>}
    </Box>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}
      slotProps={{ paper: { sx: { background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)', border: `1px solid ${GOLD}22`, borderRadius: fullScreen ? 0 : 3, height: fullScreen ? '100%' : '80vh', paddingTop: fullScreen ? 'env(safe-area-inset-top)' : 0, paddingBottom: fullScreen ? 'env(safe-area-inset-bottom)' : 0 } } }}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: fullScreen ? 'calc(env(safe-area-inset-top) + 8px)' : 8, right: 8, zIndex: 5, color: '#94A3B8', background: 'rgba(8,12,24,0.6)', '&:hover': { color: '#F1F5F9' } }}>
        <CloseRoundedIcon />
      </IconButton>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isLoading && <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Box>}
        {error && <Box sx={{ p: 4 }}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></Box>}
        {d && (
          <>
            {/* ── Закреплённая шапка: идентификация объекта + статус публикации + действия ── */}
            <Box sx={{ flexShrink: 0, background: '#0B1120', borderBottom: `1px solid ${GOLD}1A` }}>
              <Box sx={{ display: 'flex', gap: 1.5, p: 2, pr: 6, alignItems: 'center' }}>
                <Box onClick={() => main && setLightbox(true)}
                  sx={{ width: 56, height: 56, borderRadius: 1.5, overflow: 'hidden', flexShrink: 0, cursor: main ? 'pointer' : 'default', background: '#05070F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {main ? <Box component="img" src={main.thumb_url || main.url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ApartmentRoundedIcon sx={{ color: '#334155' }} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, color: GOLD, fontSize: 20, lineHeight: 1.15 }}>
                    {priceFmt(d.price)}{d.deal_type === 'rent' ? <Box component="span" sx={{ fontSize: 13, color: '#94A3B8' }}> /мес</Box> : null}
                  </Typography>
                  <Typography noWrap sx={{ color: '#F1F5F9', fontSize: 13 }}>{specsLine(d)}</Typography>
                  <Typography noWrap sx={{ color: '#94A3B8', fontSize: 12 }}>{d.address || '—'}</Typography>
                </Box>
                <Stack spacing={0.75} alignItems="flex-end">
                  {pubCount > 0 && (
                    <Chip size="small" label={`в рекламе · ${pubCount}`} sx={{ alignSelf: 'flex-end', width: 'fit-content', height: 22, fontSize: 11, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.12)' }} />
                  )}
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end" useFlexGap>
                    {d.status !== 'sold' && (
                      <Select size="small" value={d.status} disabled={statusBusy} onChange={(e) => changeStatus(e.target.value as string)}
                        sx={{ minWidth: 130, height: 30, color: '#F1F5F9', fontSize: 12, '& .MuiOutlinedInput-notchedOutline': { borderColor: `${GOLD}33` }, '& .MuiSvgIcon-root': { color: '#94A3B8' } }}>
                        {['draft', 'active', 'deposit', 'withdrawn', 'sold_external', 'archived'].map((s) => (
                          <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{STATUS_LABEL[s]}</MenuItem>
                        ))}
                      </Select>
                    )}
                    <Tooltip title="Редактировать">
                      <IconButton size="small" onClick={onEdit} sx={{ color: GOLD, '&:hover': { background: `${GOLD}11` } }}><EditRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
                sx={{ minHeight: 42, px: 1, borderTop: '1px solid rgba(148,163,184,0.08)', '& .MuiTab-root': { minHeight: 42, textTransform: 'none', color: '#94A3B8', fontSize: 13, fontWeight: 600, py: 0 }, '& .Mui-selected': { color: `${GOLD} !important` }, '& .MuiTabs-indicator': { background: GOLD } }}>
                <Tab icon={<ApartmentRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Обзор" />
                <Tab icon={<CampaignRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label={tabLabel('Реклама', pubCount)} />
                <Tab icon={<HandshakeRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Сделка" />
                <Tab icon={<AssignmentRoundedIcon sx={{ fontSize: 17 }} />} iconPosition="start" label={tabLabel('Клиент', casesCount)} />
              </Tabs>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {/* ── Вкладка: Обзор ── */}
            {tab === 0 && (
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  <Chip label={DEAL_LABEL[d.deal_type] || d.deal_type} size="small" sx={{ fontWeight: 700, color: GOLD, background: `${GOLD}22` }} />
                  {d.market_type && <Chip label={MARKET_LABEL[d.market_type] || d.market_type} size="small" sx={{ fontWeight: 600, color: '#94A3B8', background: 'rgba(148,163,184,0.12)' }} />}
                  {d.exclusive_type && d.exclusive_type !== 'none' && <Chip label="Эксклюзив" size="small" sx={{ fontWeight: 700, color: '#3B82F6', background: 'rgba(59,130,246,0.12)' }} />}
                </Stack>
                <Box sx={{ position: 'relative', background: '#05070F', borderRadius: 2, overflow: 'hidden' }}>
                  {main ? (
                    <Box component="img" src={main.url} alt="" onClick={() => setLightbox(true)}
                      sx={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', cursor: 'zoom-in' }} />
                  ) : (
                    <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}><ApartmentRoundedIcon sx={{ fontSize: 56 }} /></Box>
                  )}
                  {photos.length > 1 && (
                    <Box sx={{ position: 'absolute', bottom: 8, right: 8, px: 1, py: 0.25, borderRadius: 5, background: 'rgba(5,7,15,0.7)', color: '#E2E8F0', fontSize: 12 }}>{photoIdx + 1} / {photos.length}</Box>
                  )}
                </Box>
                {photos.length > 1 && (
                  <Stack direction="row" spacing={1} sx={{ pt: 1.5, overflowX: 'auto', '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(201,168,76,0.3)', borderRadius: 3 } }}>
                    {photos.map((ph, i) => (
                      <Box key={ph.id} component="img" src={ph.thumb_url || ph.url} loading="lazy" onClick={() => setPhotoIdx(i)}
                        sx={{ width: 72, height: 54, flexShrink: 0, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', border: i === photoIdx ? `2px solid ${GOLD}` : '2px solid transparent', opacity: i === photoIdx ? 1 : 0.7 }} />
                    ))}
                  </Stack>
                )}

                {d.lat != null && d.lng != null && (
                  <Box sx={{ mt: 2 }}>
                    <Box component="iframe" title="Карта" loading="lazy"
                      src={`https://yandex.ru/map-widget/v1/?ll=${d.lng}%2C${d.lat}&z=16&pt=${d.lng}%2C${d.lat},pm2rdm`}
                      sx={{ width: '100%', height: 240, border: 0, borderRadius: 2, display: 'block' }} />
                    <Link href={`https://yandex.ru/maps/?ll=${d.lng}%2C${d.lat}&z=17&pt=${d.lng}%2C${d.lat}`} target="_blank" rel="noopener" underline="hover"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: GOLD, fontSize: 13 }}>
                      <MapRoundedIcon sx={{ fontSize: 16 }} /> Открыть в Яндекс.Картах
                    </Link>
                  </Box>
                )}

                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
                <Grid container spacing={2}>
                  <Spec label="Общая площадь" value={d.total_area ? `${d.total_area} м²` : null} />
                  <Spec label="Жилая" value={d.living_area ? `${d.living_area} м²` : null} />
                  <Spec label="Кухня" value={d.kitchen_area ? `${d.kitchen_area} м²` : null} />
                  <Spec label="Участок" value={d.land_area ? `${d.land_area} ${LAND_UNIT_LABEL[d.land_unit || ''] || ''}`.trim() : null} />
                  <Spec label="Комнаты" value={d.rooms ? (ROOMS_LABEL[d.rooms] || d.rooms) : null} />
                  <Spec label="Этаж" value={d.floor && d.floors ? `${d.floor} из ${d.floors}` : (d.floors ? `${d.floors} эт.` : null)} />
                  {Object.entries(PARAM_LABEL).map(([key, label]) => {
                    const raw = d.params?.[key];
                    if (raw == null || raw === '') return null;
                    const val = PARAM_ENUM_LABEL[key]?.[String(raw)] || String(raw);
                    return <Spec key={key} label={label} value={val} />;
                  })}
                  <Spec label="Кадастр" value={d.cadastral_number} />
                </Grid>

                {d.description && (
                  <>
                    <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Описание</Typography>
                    <Typography sx={{ color: '#CBD5E1', fontSize: 14, whiteSpace: 'pre-line', mt: 0.5 }}>{d.description}</Typography>
                  </>
                )}

                {d.priceHistory.length > 0 && (
                  <>
                    <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
                    <Typography variant="caption" sx={{ color: '#64748B' }}>История цены</Typography>
                    <Stack sx={{ mt: 0.5 }}>
                      {d.priceHistory.map((h, i) => {
                        const tech = h.reason === 'manual' || h.reason === 'sputnik_import';
                        return (
                          <Typography key={i} sx={{ color: '#94A3B8', fontSize: 13 }}>
                            {h.created_at?.slice(0, 10)} — {priceFmt(h.new_price)}{h.reason && !tech ? ` (${h.reason})` : ''}
                          </Typography>
                        );
                      })}
                    </Stack>
                  </>
                )}

                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
                <Grid container spacing={2}>
                  {d.owner ? (
                    <Spec label="Собственник" value={
                      <Box component="span">
                        {d.owner.name || ''}{d.owner.name && d.owner.phone ? ' · ' : ''}
                        {d.owner.phone && <Link href={`tel:${d.owner.phone.replace(/\s/g, '')}`} underline="hover" sx={{ color: GOLD }}>{phoneFmt(d.owner.phone)}</Link>}
                      </Box>
                    } />
                  ) : d.owner_locked ? (
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Собственник</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#94A3B8' }}>
                        <LockRoundedIcon sx={{ fontSize: 14 }} /><Typography sx={{ fontSize: 13 }}>Контакт скрыт</Typography>
                      </Stack>
                    </Grid>
                  ) : null}
                </Grid>
              </Box>
            )}

            {/* ── Вкладка: Реклама ── */}
            {tab === 1 && <Box sx={{ p: { xs: 2, sm: 2.5 } }}><AdvertBlock property={d} /></Box>}

            {/* ── Вкладка: Сделка ── */}
            {tab === 2 && (
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ p: 1.5, borderRadius: 2, background: `${GOLD}0E`, border: `1px solid ${GOLD}33` }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Box>
                      <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>Комиссия агенту покупателя (co-broking)</Typography>
                      <Typography sx={{ color: GOLD, fontWeight: 800, fontSize: 22 }}>{d.buyer_side_share != null ? `${d.buyer_side_share}%` : '—'}</Typography>
                    </Box>
                    {d.agent && (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>Агент объекта</Typography>
                        <Typography sx={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14 }}>{d.agent.name}</Typography>
                        {d.agent.phone && <Link href={`tel:${d.agent.phone.replace(/\s/g, '')}`} underline="hover" sx={{ color: GOLD, fontSize: 14, fontWeight: 700 }}>{phoneFmt(d.agent.phone)}</Link>}
                      </Box>
                    )}
                  </Stack>
                  {(d.status === 'active' || d.status === 'deposit') && (
                    <Button fullWidth variant="contained" onClick={() => setSellOpen(true)} startIcon={<HandshakeRoundedIcon />}
                      sx={{ mt: 1.5, background: GOLD, color: '#06210F', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#B8973F' } }}>Провести сделку</Button>
                  )}
                </Box>
                <ProcuringBlock property={d} />
                {buyers && buyers.total > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 14, mb: 1 }}>Покупатели на этот объект — {buyers.total}</Typography>
                    <Stack spacing={1}>
                      {buyers.items.map((b) => (
                        <Box key={b.id} sx={{ p: 1.25, borderRadius: 1.5, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
                          <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                            {[b.deal_type && DEAL_LABEL[b.deal_type], b.property_types?.map((t) => TYPE_LABEL[t] || t).join('/'), b.rooms?.map((r) => ROOMS_LABEL[r] || r).join('/'), (b.price_min || b.price_max) ? `${b.price_min ? priceFmt(b.price_min) : '0'}–${b.price_max ? priceFmt(b.price_max) : '∞'}` : '', b.localities?.join(', ')].filter(Boolean).join(' · ')}
                          </Typography>
                          <Typography sx={{ color: '#64748B', fontSize: 11 }}>агент: {b.agent_name}{b.note ? ` · ${b.note}` : ''}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            )}

            {/* ── Вкладка: Клиент ── */}
            {tab === 3 && (
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <CasesBlock propertyId={d.id} />
                <PortalLinkBlock propertyId={d.id} />
                {(d.owner || d.owner_locked) && <OwnerChatBlock propertyId={d.id} myId={myId} />}
                <ClientDocsBlock propertyId={d.id} />
                <ViewingsBlock propertyId={d.id} />
              </Box>
            )}
            </Box>

            {sellOpen && (
              <SellDialog property={d} onClose={() => setSellOpen(false)}
                onDone={() => { refetch(); ['mls-properties', 'mls-count', 'mls-property-buyers', 'mls-placements'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }} />
            )}

            {lightbox && main && (
              <Dialog open fullScreen onClose={() => setLightbox(false)} slotProps={{ paper: { sx: { background: 'rgba(5,7,15,0.97)' } } }}>
                <IconButton onClick={() => setLightbox(false)} sx={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 12px)', right: 12, zIndex: 5, color: '#E2E8F0', background: 'rgba(0,0,0,0.5)' }}><CloseRoundedIcon /></IconButton>
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Box component="img" src={main.url} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  {photos.length > 1 && (
                    <>
                      <IconButton onClick={() => movePhoto(-1)} sx={{ position: 'absolute', left: 8, color: '#E2E8F0', background: 'rgba(0,0,0,0.4)', '&:hover': { background: 'rgba(0,0,0,0.6)' } }}><ChevronLeftRoundedIcon sx={{ fontSize: 32 }} /></IconButton>
                      <IconButton onClick={() => movePhoto(1)} sx={{ position: 'absolute', right: 8, color: '#E2E8F0', background: 'rgba(0,0,0,0.4)', '&:hover': { background: 'rgba(0,0,0,0.6)' } }}><ChevronRightRoundedIcon sx={{ fontSize: 32 }} /></IconButton>
                      <Box sx={{ position: 'absolute', bottom: 16, px: 1.5, py: 0.5, borderRadius: 5, background: 'rgba(0,0,0,0.5)', color: '#E2E8F0', fontSize: 13 }}>{photoIdx + 1} / {photos.length}</Box>
                    </>
                  )}
                </Box>
              </Dialog>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ObjectsView() {
  const [dealType, setDealType] = useState('');
  const [propType, setPropType] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<'new' | 'price_asc' | 'price_desc'>('new');
  const [limit, setLimit] = useState(24);
  const [openId, setOpenId] = useState<number | null>(null);
  const [formId, setFormId] = useState<number | null | undefined>(undefined); // undefined=закрыта, null=создание, N=правка
  const qc = useQueryClient();
  const refresh = () => { ['mls-properties', 'mls-facets', 'mls-count'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };

  const facetsQ = useQuery({ queryKey: ['mls-facets'], queryFn: getMlsFacets, staleTime: 300_000 });
  const cities = facetsQ.data?.localities || [];

  const filters = useMemo(() => ({ deal_type: dealType, property_type: propType, locality: city, sort, limit }), [dealType, propType, city, sort, limit]);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['mls-properties', filters],
    queryFn: () => listMlsProperties(filters),
    placeholderData: (prev) => prev,
  });

  const chip = (label: string, selected: boolean, onClick: () => void) => (
    <Chip label={label} onClick={onClick} size="small"
      sx={{
        fontWeight: 600, cursor: 'pointer',
        color: selected ? '#0A0E1A' : '#94A3B8',
        background: selected ? GOLD : 'rgba(148,163,184,0.1)',
        border: `1px solid ${selected ? GOLD : 'rgba(148,163,184,0.15)'}`,
        '&:hover': { background: selected ? GOLD : 'rgba(201,168,76,0.15)' },
      }} />
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2, gap: 2 }}>
        <Typography sx={{ color: '#64748B', fontSize: 13 }}>
          База объектов агентства (миграция со «Спутника»{data ? `, ${data.total}` : ''}). Фото — со «Спутника» до переноса в наше хранилище.
        </Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setFormId(null)}
          sx={{ flexShrink: 0, background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#E2C97E' } }}>
          Создать объект
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }} alignItems="center">
        {chip('Все', propType === '', () => setPropType(''))}
        {TYPES.map(t => chip(TYPE_LABEL[t], propType === t, () => setPropType(propType === t ? '' : t)))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }} alignItems="center">
        {chip('Продажа и аренда', dealType === '', () => setDealType(''))}
        {chip('Продажа', dealType === 'sale', () => setDealType('sale'))}
        {chip('Аренда', dealType === 'rent', () => setDealType('rent'))}
        <Box sx={{ flex: 1 }} />
        <Autocomplete
          size="small" options={cities} disabled={!cities.length}
          getOptionLabel={(o) => `${o.locality} (${o.n})`}
          isOptionEqualToValue={(o, v) => o.locality === v.locality}
          value={cities.find((c) => c.locality === city) || null}
          onChange={(_, v) => { setCity(v?.locality || ''); setLimit(24); }}
          sx={{ minWidth: 200 }}
          renderInput={(params) => <TextField {...params} placeholder="Все города" />}
        />
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} size="small"
          sx={{ minWidth: 150, color: '#F1F5F9', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' } }}>
          <MenuItem value="new">Сначала новые</MenuItem>
          <MenuItem value="price_desc">Сначала дороже</MenuItem>
          <MenuItem value="price_asc">Сначала дешевле</MenuItem>
        </Select>
      </Stack>

      {isLoading && <PageSkeleton />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {data && (
        <>
          {data.items.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
              <ApartmentRoundedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography>Ничего не найдено по фильтрам</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {data.items.map(p => (
                <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <PropertyCard p={p} onOpen={() => setOpenId(p.id)} />
                </Grid>
              ))}
            </Grid>
          )}
          {data.items.length < data.total && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button variant="outlined" disabled={isFetching} onClick={() => setLimit(l => l + 24)}
                sx={{ color: GOLD, borderColor: `${GOLD}55`, '&:hover': { borderColor: GOLD, background: `${GOLD}11` } }}>
                {isFetching ? 'Загрузка…' : `Показать ещё (${data.total - data.items.length})`}
              </Button>
            </Box>
          )}
        </>
      )}

      {openId != null && <DetailDialog id={openId} onClose={() => setOpenId(null)} onEdit={() => { setFormId(openId); setOpenId(null); }} />}
      {formId !== undefined && <PropertyForm id={formId} onClose={() => setFormId(undefined)} onSaved={refresh} />}
    </Box>
  );
}
