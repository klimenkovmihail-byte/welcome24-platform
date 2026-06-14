// CRM → модуль «Объекты»: витрина базы объектов агентства (MLS).
// Сетка карточек + фильтры + диалог карточки (галерея/характеристики/история цены/owner-lock).
// Данные — GET /api/mls/properties[/:id]. Раздел скрыт (super_admin), гейт — в роутере/сайдбаре.
import { useState, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Thread from '../Thread';
import { getCurrentAgent } from '../../auth/auth';
import {
  Box, Typography, Card, CardContent, Chip, Grid, Select, MenuItem, Button,
  Dialog, DialogContent, IconButton, Divider, CircularProgress, Stack, Tooltip,
  Autocomplete, TextField, Link, Alert,
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
import PropertyForm from './PropertyForm';
import {
  listMlsProperties, getMlsProperty, getMlsFacets, getMlsReadiness, getPropertyBuyers, updateMlsProperty, sellMlsProperty,
  getPortalLink, issuePortalLink, revokePortalLink, getPropertyCases, createPropertyCase,
  getPropertyDocuments, openClientDocument,
  type MlsListItem, type MlsDetail, type SellResult,
  TYPE_LABEL, DEAL_LABEL, ROOMS_LABEL, STATUS_LABEL, MARKET_LABEL, LAND_UNIT_LABEL,
  PARAM_LABEL, PARAM_ENUM_LABEL, priceFmt, phoneFmt,
  getPropertyViewings, patchViewing,
} from '../../api/mls';
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

  const vkdNum = Number(String(vkd).replace(/\s/g, ''));
  const valid = Number.isFinite(vkdNum) && vkdNum > 0;
  const fieldSx = { '& .MuiOutlinedInput-root': { color: '#F1F5F9', '& fieldset': { borderColor: `${GOLD}33` }, '&:hover fieldset': { borderColor: `${GOLD}66` } }, '& .MuiInputLabel-root': { color: '#94A3B8' }, '& .MuiFormHelperText-root': { color: '#64748B' } };

  async function submit() {
    setErr(''); setBusy(true);
    try {
      const r = await sellMlsProperty(property.id, {
        vkd: vkdNum,
        date,
        buyer_agent_id: buyerAgent?.id ?? null,
        buyer_side_share: buyerAgent ? Number(share) : undefined,
        buyer: (buyerName.trim() || buyerPhone.trim()) ? { name: buyerName.trim(), phone: buyerPhone.trim() } : undefined,
        client_name: buyerName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setResult(r);
      onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
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
              value={buyerAgent} onChange={(_, v) => setBuyerAgent(v)} loading={agentsQ.isLoading} isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => <TextField {...params} label="Агент покупателя (co-broking) — необязательно" sx={fieldSx} />} />
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
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)' }}>
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
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
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
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)' }}>
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
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.22)' }}>
      <Typography sx={{ color: '#4ade80', fontWeight: 700, fontSize: 13, mb: 1 }}>Чат с собственником</Typography>
      <Thread apiBase={`/mls/properties/${propertyId}/client-chat`} myId={myId} myRole="agent" maxHeight={300} emptyText="Сообщений пока нет. Напишите собственнику." />
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
    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.25)' }}>
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

export function DetailDialog({ id, onClose, onEdit }: { id: number; onClose: () => void; onEdit: () => void }) {
  const myId = getCurrentAgent()?.id ?? null;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mls-property', id],
    queryFn: () => getMlsProperty(id),
  });
  const readyQ = useQuery({ queryKey: ['mls-readiness', id], queryFn: () => getMlsReadiness(id), staleTime: 60_000 });
  const readiness = readyQ.data;
  const buyersQ = useQuery({ queryKey: ['mls-property-buyers', id], queryFn: () => getPropertyBuyers(id), staleTime: 60_000 });
  const buyers = buyersQ.data;
  const qc = useQueryClient();
  const [statusBusy, setStatusBusy] = useState(false);
  const [active, setActive] = useState(0);
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
  const main = photos[active] || photos[0];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth
      slotProps={{ paper: { sx: { background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)', border: `1px solid ${GOLD}22`, borderRadius: 3 } } }}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: '#94A3B8', background: 'rgba(8,12,24,0.6)', '&:hover': { color: '#F1F5F9' } }}>
        <CloseRoundedIcon />
      </IconButton>
      <DialogContent sx={{ p: 0 }}>
        {isLoading && <Box sx={{ p: 8, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Box>}
        {error && <Box sx={{ p: 4 }}><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></Box>}
        {d && (
          <>
            <Box sx={{ position: 'relative', background: '#05070F' }}>
              {main ? (
                <Box component="img" src={main.url} alt=""
                  sx={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block' }} />
              ) : (
                <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
                  <ApartmentRoundedIcon sx={{ fontSize: 64 }} />
                </Box>
              )}
            </Box>
            {photos.length > 1 && (
              <Stack direction="row" spacing={1} sx={{ p: 1.5, overflowX: 'auto', '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(201,168,76,0.3)', borderRadius: 3 } }}>
                {photos.map((ph, i) => (
                  <Box key={ph.id} component="img" src={ph.thumb_url || ph.url} loading="lazy" onClick={() => setActive(i)}
                    sx={{ width: 72, height: 54, flexShrink: 0, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', border: i === active ? `2px solid ${GOLD}` : '2px solid transparent', opacity: i === active ? 1 : 0.7 }} />
                ))}
              </Stack>
            )}

            <Box sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Chip label={DEAL_LABEL[d.deal_type] || d.deal_type} size="small" sx={{ fontWeight: 700, color: GOLD, background: `${GOLD}22` }} />
                <Chip label={STATUS_LABEL[d.status] || d.status} size="small" sx={{ fontWeight: 700, color: d.status === 'active' ? '#22C55E' : '#94A3B8', background: d.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)' }} />
                {d.market_type && <Chip label={MARKET_LABEL[d.market_type] || d.market_type} size="small" sx={{ fontWeight: 600, color: '#94A3B8', background: 'rgba(148,163,184,0.12)' }} />}
                {d.exclusive_type && d.exclusive_type !== 'none' && <Chip label="Эксклюзив" size="small" sx={{ fontWeight: 700, color: '#3B82F6', background: 'rgba(59,130,246,0.12)' }} />}
                <Box sx={{ flex: 1 }} />
                {d.status !== 'sold' && (
                  <Select size="small" value={d.status} disabled={statusBusy} onChange={(e) => changeStatus(e.target.value as string)}
                    sx={{ minWidth: 160, height: 32, color: '#F1F5F9', fontSize: 13, '& .MuiOutlinedInput-notchedOutline': { borderColor: `${GOLD}33` }, '& .MuiSvgIcon-root': { color: '#94A3B8' } }}>
                    {['draft', 'active', 'deposit', 'withdrawn', 'sold_external', 'archived'].map((s) => (
                      <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{STATUS_LABEL[s]}</MenuItem>
                    ))}
                  </Select>
                )}
                {(d.status === 'active' || d.status === 'deposit') && (
                  <Button size="small" variant="contained" onClick={() => setSellOpen(true)}
                    startIcon={<HandshakeRoundedIcon sx={{ fontSize: 16 }} />}
                    sx={{ background: GOLD, color: '#06210F', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#B8973F' } }}>Провести сделку</Button>
                )}
                <Button size="small" startIcon={<EditRoundedIcon sx={{ fontSize: 16 }} />} onClick={onEdit}
                  sx={{ color: GOLD, textTransform: 'none', '&:hover': { background: `${GOLD}11` } }}>Редактировать</Button>
              </Stack>
              <Typography sx={{ fontWeight: 800, color: GOLD, fontSize: 28 }}>
                {priceFmt(d.price)}{d.deal_type === 'rent' ? <Box component="span" sx={{ fontSize: 16, color: '#94A3B8' }}> /мес</Box> : null}
              </Typography>
              <Typography sx={{ color: '#F1F5F9', fontWeight: 600, mt: 0.5 }}>{specsLine(d)}</Typography>
              <Typography sx={{ color: '#94A3B8', mt: 0.5 }}>{d.address || '—'}</Typography>
              {d.lat != null && d.lng != null && (
                <Box sx={{ mt: 1 }}>
                  <Box component="iframe" title="Карта" loading="lazy"
                    src={`https://yandex.ru/map-widget/v1/?ll=${d.lng}%2C${d.lat}&z=16&pt=${d.lng}%2C${d.lat},pm2rdm`}
                    sx={{ width: '100%', height: 260, border: 0, borderRadius: 2, display: 'block' }} />
                  <Link href={`https://yandex.ru/maps/?ll=${d.lng}%2C${d.lat}&z=17&pt=${d.lng}%2C${d.lat}`} target="_blank" rel="noopener" underline="hover"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: GOLD, fontSize: 13 }}>
                    <MapRoundedIcon sx={{ fontSize: 16 }} /> Открыть в Яндекс.Картах
                  </Link>
                </Box>
              )}

              {/* Готовность к публикации на площадке */}
              {readiness && (readiness.ready ? (
                <Box sx={{ mt: 2, display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderRadius: 2, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#22C55E' }} />
                  <Typography sx={{ color: '#22C55E', fontWeight: 700, fontSize: 13 }}>Готов к публикации на Авито</Typography>
                </Box>
              ) : (
                <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <Typography sx={{ color: '#F59E0B', fontWeight: 700, fontSize: 13, mb: 0.5 }}>Готовность к Авито — не хватает:</Typography>
                  {readiness.issues.map((iss, i) => (
                    <Typography key={i} sx={{ color: iss.severity === 'block' ? '#FCA5A5' : '#FCD34D', fontSize: 13 }}>• {iss.message}{iss.severity === 'warn' ? ' (необязательно)' : ''}</Typography>
                  ))}
                </Box>
              ))}

              {/* Co-broking: условия для агента покупателя + контакт агента объекта */}
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: `${GOLD}0E`, border: `1px solid ${GOLD}33` }}>
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
              </Box>

              <CasesBlock propertyId={d.id} />
              <ClientDocsBlock propertyId={d.id} />
              <PortalLinkBlock propertyId={d.id} />
              {(d.owner || d.owner_locked) && <OwnerChatBlock propertyId={d.id} myId={myId} />}
              <ViewingsBlock propertyId={d.id} />

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

              {/* Покупатели на этот объект (reverse-match: «на твой объект N покупателей») */}
              {buyers && buyers.total > 0 && (
                <>
                  <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
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
            {sellOpen && (
              <SellDialog property={d} onClose={() => setSellOpen(false)}
                onDone={() => { refetch(); ['mls-properties', 'mls-count', 'mls-property-buyers', 'mls-readiness'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }} />
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
