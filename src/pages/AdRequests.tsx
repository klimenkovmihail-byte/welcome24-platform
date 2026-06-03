import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, CircularProgress, Alert,
  Tabs, Tab, Stack, MenuItem, Select, FormControl, InputLabel, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Checkbox,
  FormControlLabel, Divider, Table, TableHead, TableRow, TableCell, TableBody, Link, Tooltip,
} from '@mui/material';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import { API_BASE_URL, getToken } from '../api/apiClient';
import {
  adRequestsApi, type AdRequest, type AdKind, type AdPlatform, type AdMeta,
  type AdMessage, type AdEvent, AD_STATUS_RU, PLATFORM_LABEL,
} from '../api/adRequests';
import {
  adPackagesApi, PKG_PLATFORM_LABEL, type Drive, type DriveDetailAgent, type Platform,
} from '../api/adPackages';
import { getCurrentAgent } from '../auth/auth';

const GOLD = '#C9A84C';
// Загрузка файла в Yandex Storage через /api/upload (для вложений в чат, напр. чеков).
async function uploadFile(file: File): Promise<{ url: string; name: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', 'doc');
  const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
  if (!res.ok) throw new Error('Не удалось загрузить файл');
  const data = await res.json();
  return { url: data.url, name: file.name };
}
// Цвет участника чата по роли (агент золото, юрист зелёный, брокер фиолет,
// листинг-менеджер циан, админ синий).
const ROLE_COLOR: Record<string, string> = {
  agent: '#C9A84C', lawyer: '#22C55E', broker: '#8B5CF6',
  listing_manager: '#06B6D4', admin: '#4361EE', super_admin: '#4361EE', manager: '#4361EE',
};
const roleColor = (r?: string | null) => ROLE_COLOR[r || ''] || '#94A3B8';
const money = (n: number) => Number(n || 0).toLocaleString('ru-RU');
function fmtDate(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtDateTime(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function statusColor(s: string): string {
  return s === 'done' ? '#22C55E' : s === 'cancelled' ? '#EF4444' : s === 'in_progress' ? GOLD : '#64748B';
}
const cardSx = { background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 3 } as const;
const ALL_PLATFORMS: AdPlatform[] = ['avito', 'cian', 'domclick', 'yandex'];

export default function AdRequests() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <CampaignRoundedIcon sx={{ color: GOLD, fontSize: 30 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>Реклама объектов</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>Заявки в отдел рекламы · участие в сборе пакетов</Typography>
        </Box>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { color: '#94A3B8', fontWeight: 700, textTransform: 'none' }, '& .Mui-selected': { color: GOLD + ' !important' }, '& .MuiTabs-indicator': { background: GOLD } }}>
        <Tab label="Мои заявки" />
        <Tab label="Сбор пакета" />
      </Tabs>
      {tab === 0 && <AdSimpleRequestsTab />}
      {tab === 1 && <AdPackagesTab />}
    </Box>
  );
}

/* ============ МОИ ЗАЯВКИ ============ */
export function AdSimpleRequestsTab() {
  const [items, setItems] = useState<AdRequest[]>([]);
  const [meta, setMeta] = useState<AdMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<AdRequest | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AdStatus>('all');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([adRequestsApi.list().catch(() => []), adRequestsApi.meta().catch(() => null)])
      .then(([l, m]) => { setItems(l); setMeta(m); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: GOLD }} /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={() => setCreateOpen(true)}
        sx={{ mb: 2, background: GOLD, color: '#0A0E1A', fontWeight: 700, '&:hover': { background: '#E2C97E' } }}>Новая заявка</Button>

      {items.length > 0 && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
          <TextField size="small" placeholder="Поиск по объекту / региону" value={q} onChange={e => setQ(e.target.value)} sx={{ minWidth: 220, flex: 1 }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Статус</InputLabel>
            <Select label="Статус" value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | AdStatus)}>
              <MenuItem value="all">Все статусы</MenuItem>
              <MenuItem value="new">Новые</MenuItem>
              <MenuItem value="in_progress">В работе</MenuItem>
              <MenuItem value="done">Готово</MenuItem>
              <MenuItem value="cancelled">Отменена</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      )}

      <Stack spacing={1.2}>
        {(() => {
          const term = q.trim().toLowerCase();
          const filtered = items.filter(r =>
            (statusFilter === 'all' || r.status === statusFilter) &&
            (!term || (r.object_ref || '').toLowerCase().includes(term) || (r.region || '').toLowerCase().includes(term)
              || (r.kind_label || '').toLowerCase().includes(term) || (r.comment || '').toLowerCase().includes(term))
          );
          if (items.length === 0) return <Typography sx={{ color: '#64748B', py: 4, textAlign: 'center' }}>Заявок пока нет. Создайте первую.</Typography>;
          if (filtered.length === 0) return <Typography sx={{ color: '#64748B', py: 4, textAlign: 'center' }}>Ничего не найдено по фильтру.</Typography>;
          return filtered.map(r => (
          <Card key={r.id} sx={{ ...cardSx, cursor: 'pointer', border: (r.unread || 0) > 0 ? '1px solid rgba(239,68,68,0.4)' : cardSx.border, '&:hover': { borderColor: 'rgba(201,168,76,0.3)' } }} onClick={() => setDetail(r)}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Chip label={r.kind_label} size="small" sx={{ background: 'rgba(201,168,76,0.15)', color: GOLD, fontWeight: 700 }} />
                {(r.unread || 0) > 0 && <Chip label={`+${r.unread}`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, background: 'rgba(239,68,68,0.18)', color: '#EF4444' }} />}
                {r.object_ref && <Typography sx={{ color: '#E2E8F0', fontWeight: 600 }}>{r.object_ref}</Typography>}
                {r.region && <Typography sx={{ color: '#94A3B8', fontSize: 14 }}>{r.region}</Typography>}
                <Stack direction="row" spacing={0.5}>{r.platforms.map(p => <Chip key={p} label={PLATFORM_LABEL[p]} size="small" variant="outlined" sx={{ height: 20, fontSize: 11, color: '#94A3B8', borderColor: 'rgba(148,163,184,0.3)' }} />)}</Stack>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ color: '#CBD5E1', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtDateTime(r.created_at)}</Typography>
                {r.assignee_name && <Typography sx={{ color: '#64748B', fontSize: 12 }}>{r.assignee_name}</Typography>}
                <Chip label={AD_STATUS_RU[r.status]} size="small" sx={{ background: statusColor(r.status) + '22', color: statusColor(r.status), fontWeight: 700 }} />
              </Stack>
            </CardContent>
          </Card>
          ));
        })()}
      </Stack>

      {createOpen && meta && <CreateDialog meta={meta} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} setError={setError} />}
      {detail && <RequestDetail request={detail} onClose={() => setDetail(null)} />}
    </Box>
  );
}

function CreateDialog({ meta, onClose, onCreated, setError }: { meta: AdMeta; onClose: () => void; onCreated: () => void; setError: (e: string) => void }) {
  const [kind, setKind] = useState<AdKind>('quota');
  const [objectRef, setObjectRef] = useState('');
  const [region, setRegion] = useState('');
  const [platforms, setPlatforms] = useState<AdPlatform[]>([]);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const needObject = kind === 'quota' || kind === 'fix';
  const needRegion = kind === 'connect';
  const togglePlatform = (p: AdPlatform) => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const submit = async () => {
    if (needObject && !objectRef.trim()) { setError('Укажите номер объекта'); return; }
    if (!platforms.length) { setError('Выберите хотя бы одну площадку'); return; }
    setSaving(true);
    try {
      const created = await adRequestsApi.create({ kind, objectRef, region, platforms, comment });
      // Прикрепляем выбранные файлы в тред заявки (чек/скрин/документ).
      for (const f of files) {
        try { const up = await uploadFile(f); await adRequestsApi.sendMessage(created.id, { attachmentUrl: up.url, attachmentName: up.name }); }
        catch { /* один файл не загрузился — заявка всё равно создана */ }
      }
      onCreated();
    } catch (e) {
      setError((e as Error)?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { background: '#0B1120', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 3 } }}>
      <DialogTitle sx={{ color: '#F1F5F9' }}>Новая заявка в отдел рекламы</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: '#94A3B8' }}>Тип заявки</InputLabel>
            <Select label="Тип заявки" value={kind} onChange={e => setKind(e.target.value as AdKind)} sx={{ color: '#E2E8F0' }}>
              {meta.kinds.map(k => <MenuItem key={k.key} value={k.key}>{k.label}</MenuItem>)}
            </Select>
          </FormControl>
          {needObject && (
            <TextField size="small" label="Номер объекта" value={objectRef} onChange={e => setObjectRef(e.target.value)} placeholder="№ 12345"
              InputLabelProps={{ sx: { color: '#94A3B8' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#E2E8F0' } }} />
          )}
          {needRegion && (
            <TextField size="small" label="Регион / город" value={region} onChange={e => setRegion(e.target.value)}
              InputLabelProps={{ sx: { color: '#94A3B8' } }} sx={{ '& .MuiOutlinedInput-root': { color: '#E2E8F0' } }} />
          )}
          <Box>
            <Typography sx={{ color: '#94A3B8', fontSize: 13, mb: 0.5 }}>Площадки</Typography>
            <Stack direction="row" flexWrap="wrap">
              {ALL_PLATFORMS.map(p => (
                <FormControlLabel key={p} control={<Checkbox size="small" checked={platforms.includes(p)} onChange={() => togglePlatform(p)} sx={{ color: '#64748B', '&.Mui-checked': { color: GOLD } }} />}
                  label={PLATFORM_LABEL[p]} sx={{ color: '#E2E8F0', mr: 1 }} />
              ))}
            </Stack>
          </Box>
          <TextField size="small" label="Комментарий" value={comment} onChange={e => setComment(e.target.value)} multiline minRows={2}
            placeholder="Напр.: квартира в городе, продажа — поднять в топ на неделю"
            slotProps={{ inputLabel: { shrink: true, sx: { color: '#94A3B8' } } }}
            sx={{ '& .MuiOutlinedInput-root': { color: '#E2E8F0' } }} />
          <Box>
            <Button component="label" size="small" startIcon={<AttachFileRoundedIcon />} sx={{ color: GOLD, textTransform: 'none' }}>
              Прикрепить файлы
              <input type="file" hidden multiple onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
            </Button>
            {files.length > 0 && (
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {files.map((f, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</Typography>
                    <Button size="small" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} sx={{ minWidth: 0, color: '#EF4444', p: 0.3 }}>✕</Button>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#94A3B8' }}>Отмена</Button>
        <Button onClick={submit} disabled={saving} variant="contained" sx={{ background: GOLD, color: '#0A0E1A', fontWeight: 700 }}>
          {saving ? 'Отправка…' : 'Отправить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RequestDetail({ request, onClose }: { request: AdRequest; onClose: () => void }) {
  const [messages, setMessages] = useState<AdMessage[]>([]);
  const [events, setEvents] = useState<AdEvent[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const agent = getCurrentAgent();

  const reload = useCallback(() => {
    adRequestsApi.messages(request.id).then(setMessages).catch(() => {});
    adRequestsApi.events(request.id).then(setEvents).catch(() => {});
  }, [request.id]);
  useEffect(() => { reload(); adRequestsApi.markRead(request.id).catch(() => {}); }, [reload, request.id]);
  // Поллинг чата — новые сообщения от отдела видны без переоткрытия.
  useEffect(() => {
    const iv = setInterval(() => { adRequestsApi.messages(request.id).then(setMessages).catch(() => {}); }, 4000);
    return () => clearInterval(iv);
  }, [request.id]);
  // Автоскролл вниз — только при первом открытии или новом сообщении, и только если
  // пользователь уже внизу. Прокрутил вверх (читает историю) — не дёргаем.
  const chatRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const first = prevCount.current === 0;
    const grew = messages.length > prevCount.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (first || (grew && nearBottom)) el.scrollTop = el.scrollHeight;
    prevCount.current = messages.length;
  }, [messages]);

  const [uploading, setUploading] = useState(false);
  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { const up = await uploadFile(file); await adRequestsApi.sendMessage(request.id, { attachmentUrl: up.url, attachmentName: up.name }); reload(); }
    catch { /* tolerate */ } finally { setUploading(false); e.target.value = ''; }
  };
  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try { await adRequestsApi.sendMessage(request.id, { body: text.trim() }); setText(''); reload(); }
    finally { setSending(false); }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { background: '#0B1120', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 3 } }}>
      <DialogTitle sx={{ color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 1 }}>
        {request.kind_label}
        <Chip label={AD_STATUS_RU[request.status]} size="small" sx={{ background: statusColor(request.status) + '22', color: statusColor(request.status), fontWeight: 700 }} />
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose} sx={{ color: '#64748B' }}><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {request.object_ref && <Info label="Объект" value={request.object_ref} />}
          {request.region && <Info label="Регион" value={request.region} />}
          <Info label="Подана" value={fmtDateTime(request.created_at)} />
          {request.platforms.length > 0 && <Info label="Площадки" value={request.platforms.map(p => PLATFORM_LABEL[p]).join(', ')} />}
          {request.comment && <Info label="Комментарий" value={request.comment} />}
          <Info label="Исполнитель" value={request.assignee_name || 'ещё не взяли в работу'} />
        </Stack>
        {events.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: '#64748B', fontSize: 12, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>История</Typography>
            {events.map(e => <Typography key={e.id} sx={{ color: '#94A3B8', fontSize: 12.5 }}><span style={{ color: '#475569' }}>{fmtDate(e.created_at)}</span> · {e.text}</Typography>)}
          </Box>
        )}
        <Divider sx={{ borderColor: 'rgba(148,163,184,0.1)', mb: 1 }} />
        <Typography sx={{ color: '#64748B', fontSize: 12, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Чат с отделом рекламы</Typography>
        <Box ref={chatRef} sx={{ maxHeight: 240, overflowY: 'auto', background: 'rgba(2,6,23,0.5)', borderRadius: 2, p: 1.5, mb: 1 }}>
          {messages.length === 0 && <Typography sx={{ color: '#475569', fontSize: 13, textAlign: 'center', py: 2 }}>Сообщений нет</Typography>}
          {messages.map(m => {
            const mine = m.sender_id === agent?.id;
            const c = roleColor(m.sender_role);
            return (
              <Box key={m.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 0.8 }}>
                <Box sx={{ maxWidth: '80%', background: c + '2E', border: `1px solid ${c}44`, borderRadius: 2, px: 1.3, py: 0.7 }}>
                  {!mine && <Typography sx={{ color: c, fontSize: 11, fontWeight: 700 }}>{m.sender_name}</Typography>}
                  {m.body && <Typography sx={{ color: '#E2E8F0', fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{m.body}</Typography>}
                  {m.attachment_url && (
                    <Link href={m.attachment_url} target="_blank" rel="noopener" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#E2C97E', fontSize: 13, textDecoration: 'none', mt: 0.3, '&:hover': { textDecoration: 'underline' } }}>
                      <AttachFileRoundedIcon sx={{ fontSize: 14 }} /> {m.attachment_name || 'файл'}
                    </Link>
                  )}
                  <Typography sx={{ color: '#475569', fontSize: 10, textAlign: 'right' }}>{fmtDate(m.created_at)}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Прикрепить файл (чек, скрин)">
            <IconButton component="label" disabled={uploading} sx={{ color: '#94A3B8', '&:hover': { color: GOLD } }}>
              {uploading ? <CircularProgress size={18} sx={{ color: GOLD }} /> : <AttachFileRoundedIcon />}
              <input type="file" hidden onChange={handleAttach} />
            </IconButton>
          </Tooltip>
          <TextField size="small" fullWidth placeholder="Сообщение…" value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            sx={{ '& .MuiOutlinedInput-root': { color: '#E2E8F0' } }} />
          <IconButton onClick={send} disabled={sending || !text.trim()} sx={{ color: GOLD }}><SendRoundedIcon /></IconButton>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return <Typography sx={{ fontSize: 13.5 }}><span style={{ color: '#64748B' }}>{label}:</span> <span style={{ color: '#E2E8F0' }}>{value}</span></Typography>;
}

/* ============ СБОР ПАКЕТА ============ */
export function AdPackagesTab() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adPackagesApi.drives().then(setDrives).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: GOLD }} /></Box>;
  if (openId) return <DriveForm id={openId} onBack={() => { setOpenId(null); load(); }} />;

  return (
    <Stack spacing={1.2}>
      {drives.length === 0 && <Typography sx={{ color: '#64748B', py: 4, textAlign: 'center' }}>Активных сборов нет</Typography>}
      {drives.map(d => (
        <Card key={d.id} sx={{ ...cardSx, cursor: 'pointer', '&:hover': { borderColor: 'rgba(201,168,76,0.3)' } }} onClick={() => setOpenId(d.id)}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Chip label={d.platform_label} size="small" sx={{ background: 'rgba(201,168,76,0.15)', color: GOLD, fontWeight: 700 }} />
              <Typography sx={{ color: '#F1F5F9', fontWeight: 700 }}>{d.title}</Typography>
              <Chip label={d.status === 'open' ? 'Открыт' : d.status === 'closed' ? 'Закрыт' : 'Оплачен'} size="small"
                sx={{ background: (d.status === 'open' ? '#22C55E' : '#64748B') + '22', color: d.status === 'open' ? '#22C55E' : '#94A3B8', fontWeight: 700 }} />
              {d.deadline && <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>до {fmtDate(d.deadline)}</Typography>}
              <Box sx={{ flex: 1 }} />
              {d.mine && d.mine.entries > 0
                ? <Chip label={`моя заявка: ${money(d.mine.cost)} ₽`} size="small" sx={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontWeight: 700 }} />
                : <Typography sx={{ color: '#64748B', fontSize: 12 }}>нажмите, чтобы подать</Typography>}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function DriveForm({ id, onBack }: { id: number; onBack: () => void }) {
  const [drive, setDrive] = useState<DriveDetailAgent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [qty, setQty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => { adPackagesApi.drive(id).then(setDrive).catch(e => setError(e?.message)); }, [id]);
  useEffect(() => { load(); }, [load]);

  // При выборе города — подтягиваем цены площадки и считаем суммы live.
  useEffect(() => {
    if (!drive || !city) { setPrices({}); return; }
    adPackagesApi.cityPrices(drive.platform as Platform, city).then(setPrices).catch(() => setPrices({}));
  }, [drive, city]);

  const total = useMemo(() => {
    const cats = drive?.categories || [];
    return cats.reduce((sum, c) => sum + (qty[c.key] || 0) * (prices[c.key] || 0), 0);
  }, [drive, qty, prices]);
  const totalQty = useMemo(() => Object.values(qty).reduce((a, b) => a + (b || 0), 0), [qty]);

  if (!drive) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: GOLD }} /></Box>;
  const open = drive.status === 'open';

  const submit = () => {
    const lines = (drive.categories || []).filter(c => qty[c.key] > 0).map(c => ({ categoryKey: c.key, qty: qty[c.key] }));
    if (!city) { setError('Выберите город'); return; }
    if (!lines.length) { setError('Укажите количество хотя бы по одной категории'); return; }
    setSaving(true);
    adPackagesApi.submitEntry(id, { city, lines })
      .then(() => { setQty({}); setCity(''); load(); })
      .catch(e => setError(e?.message)).finally(() => setSaving(false));
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Button onClick={onBack} sx={{ color: '#94A3B8' }}>← Назад</Button>
        <Chip label={drive.platform_label} size="small" sx={{ background: 'rgba(201,168,76,0.15)', color: GOLD, fontWeight: 700 }} />
        <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 18 }}>{drive.title}</Typography>
        {drive.deadline && <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>до {fmtDate(drive.deadline)}</Typography>}
      </Stack>

      {/* Мои поданные заявки */}
      {drive.myEntries.length > 0 && (
        <Card sx={{ ...cardSx, mb: 2 }}>
          <CardContent>
            <Typography sx={{ color: '#94A3B8', fontSize: 13, mb: 1, fontWeight: 700 }}>Мои заявки в этом сборе</Typography>
            <Stack spacing={0.8}>
              {drive.myEntries.map(e => (
                <Stack key={e.id} direction="row" alignItems="center" spacing={1.5}>
                  <Typography sx={{ color: '#E2E8F0', fontWeight: 600, minWidth: 130 }}>{e.city}</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>{e.total_qty} квот</Typography>
                  <Typography sx={{ color: GOLD, fontWeight: 700 }}>{money(e.total_cost)} ₽</Typography>
                  <Chip label={e.paid ? 'оплачено' : 'ожидает оплаты'} size="small" sx={{ background: (e.paid ? '#22C55E' : '#F59E0B') + '22', color: e.paid ? '#22C55E' : '#F59E0B', fontWeight: 700 }} />
                  {open && !e.paid && <Button size="small" sx={{ color: '#EF4444', textTransform: 'none' }} onClick={() => adPackagesApi.removeEntry(id, e.id).then(load)}>удалить</Button>}
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!open ? (
        <Alert severity="info" sx={{ background: 'rgba(148,163,184,0.1)', color: '#CBD5E1' }}>Сбор закрыт — подача новых заявок недоступна.</Alert>
      ) : (
        <Card sx={cardSx}>
          <CardContent>
            <Typography sx={{ color: '#F1F5F9', fontWeight: 700, mb: 1.5 }}>Подать заявку</Typography>
            <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
              <InputLabel sx={{ color: '#94A3B8' }}>Город</InputLabel>
              <Select label="Город" value={city} onChange={e => setCity(e.target.value)} sx={{ color: '#E2E8F0' }}>
                {drive.pricedCities.length === 0 && <MenuItem disabled value="">Прайс по городам ещё не задан</MenuItem>}
                {drive.pricedCities.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>

            {city && (
              <Table size="small" sx={{ '& td, & th': { borderColor: 'rgba(148,163,184,0.1)' } }}>
                <TableHead><TableRow>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700 }}>Категория</TableCell>
                  <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700 }}>Цена за квоту</TableCell>
                  <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700 }}>Кол-во</TableCell>
                  <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700 }}>Сумма</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {drive.categories.map(c => {
                    const price = prices[c.key] || 0;
                    const q = qty[c.key] || 0;
                    return (
                      <TableRow key={c.key}>
                        <TableCell sx={{ color: '#E2E8F0' }}>{c.label}</TableCell>
                        <TableCell align="center" sx={{ color: price ? '#94A3B8' : '#475569' }}>{price ? money(price) + ' ₽' : 'нет цены'}</TableCell>
                        <TableCell align="center">
                          <TextField variant="standard" type="number" value={q || ''} onChange={e => setQty(prev => ({ ...prev, [c.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                            inputProps={{ min: 0 }} sx={{ width: 64, '& input': { color: '#E2E8F0', textAlign: 'center' } }} disabled={!price} />
                        </TableCell>
                        <TableCell align="right" sx={{ color: q ? GOLD : '#475569', fontWeight: 600 }}>{q ? money(q * price) + ' ₽' : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {city && (
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2, p: 1.5, background: 'rgba(201,168,76,0.08)', borderRadius: 2 }}>
                <Typography sx={{ color: '#E2E8F0', fontWeight: 700 }}>Итого: {totalQty} квот</Typography>
                <Typography sx={{ color: GOLD, fontWeight: 800, fontSize: 20 }}>{money(total)} ₽</Typography>
              </Stack>
            )}
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Button onClick={submit} disabled={saving || !city || totalQty === 0} variant="contained" sx={{ background: GOLD, color: '#0A0E1A', fontWeight: 700, '&:hover': { background: '#E2C97E' } }}>Подать заявку</Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
