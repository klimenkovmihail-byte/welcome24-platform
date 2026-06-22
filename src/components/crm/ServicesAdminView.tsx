// CRM → модуль «Услуги» (координаторская сторона): очередь заказов (взять/сменить статус) +
// каталог услуг с CRUD и рейтингом партнёра. Бэк — /api/services (staff-гейт).
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Card, Chip, CircularProgress, Tabs, Tab, Select, MenuItem,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Switch, Rating,
} from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  getServicesCatalog, getServiceOrders, patchServiceOrder, createService, updateService, deleteService,
  type SvcCatalogItem, type SvcOrder,
} from '../../api/mls';

const GOLD = '#C9A84C';
const ORDER_STATUS = [
  { v: 'new', l: 'Новая' }, { v: 'taken', l: 'Взята' }, { v: 'in_progress', l: 'В работе' },
  { v: 'done', l: 'Выполнена' }, { v: 'cancelled', l: 'Отменена' },
];
const sLabel = (s: string) => ORDER_STATUS.find((x) => x.v === s)?.l || s;
const sColor = (s: string): string => ({ new: '#EF4444', taken: '#F59E0B', in_progress: '#4361EE', done: '#22C55E', cancelled: '#64748B' } as Record<string, string>)[s] || '#94A3B8';
const CATEGORIES = ['legal', 'mortgage', 'insurance', 'repair', 'cleaning', 'staging', 'moving', 'other'];
const fmt = (s: string) => { try { return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return s; } };

function OrdersTab() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['svc-orders', status], queryFn: () => getServiceOrders(status || undefined), refetchInterval: 20_000 });
  const items = data?.items || [];
  const act = async (id: number, d: { status?: string; take?: boolean }) => {
    await patchServiceOrder(id, d);
    qc.invalidateQueries({ queryKey: ['svc-orders'] });
    qc.invalidateQueries({ queryKey: ['svc-catalog'] });
  };
  if (isLoading) return <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress sx={{ color: GOLD }} /></Box>;
  return (
    <>
      <Select size="small" value={status} onChange={(e) => setStatus(e.target.value)} displayEmpty sx={{ mb: 2, minWidth: 180 }}>
        <MenuItem value="">Все статусы</MenuItem>
        {ORDER_STATUS.map((s) => <MenuItem key={s.v} value={s.v}>{s.l}</MenuItem>)}
      </Select>
      {items.length === 0 ? <Typography sx={{ color: '#64748B', py: 4, textAlign: 'center' }}>Заказов нет.</Typography> : (
        <Stack spacing={1.2}>
          {items.map((o: SvcOrder) => (
            <Card key={o.id} sx={{ p: 1.75 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                <Chip label={sLabel(o.status)} size="small" sx={{ background: sColor(o.status) + '22', color: sColor(o.status), fontWeight: 700 }} />
                <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14 }}>{o.service_name}</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>{o.client_name || 'Клиент'}{o.client_phone ? ` · ${o.client_phone}` : ''}</Typography>
                {o.agent_name && <Typography sx={{ color: '#64748B', fontSize: 12.5 }}>агент: {o.agent_name}</Typography>}
                {o.review_rating != null && <Stack direction="row" alignItems="center" spacing={0.3}><StarRoundedIcon sx={{ fontSize: 16, color: GOLD }} /><Typography sx={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>{o.review_rating}</Typography></Stack>}
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ color: '#64748B', fontSize: 12 }}>{fmt(o.created_at)}</Typography>
              </Stack>
              {o.note && <Typography sx={{ color: '#94A3B8', fontSize: 13, mt: 0.5 }}>{o.note}</Typography>}
              <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                {o.coordinator_name && <Typography sx={{ color: '#64748B', fontSize: 12 }}>Координатор: {o.coordinator_name}</Typography>}
                {!o.coordinator_name && <Button size="small" variant="outlined" onClick={() => act(o.id, { take: true, status: 'taken' })} sx={{ color: GOLD, borderColor: `${GOLD}55`, textTransform: 'none' }}>Взять в работу</Button>}
                <Box sx={{ flex: 1 }} />
                <Select size="small" value={o.status} onChange={(e) => act(o.id, { status: e.target.value })} sx={{ minWidth: 150 }}>
                  {ORDER_STATUS.map((s) => <MenuItem key={s.v} value={s.v}>{s.l}</MenuItem>)}
                </Select>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </>
  );
}

const EMPTY: Partial<SvcCatalogItem> = { name: '', category: 'other', kind: 'partner', price_note: '', description: '', city: '', sort: 0, active: 1, agent_share_pct: 40 };

function EditDialog({ svc, onClose, onSaved }: { svc: SvcCatalogItem | 'new'; onClose: () => void; onSaved: () => void }) {
  const isNew = svc === 'new';
  const [f, setF] = useState<Partial<SvcCatalogItem>>(isNew ? { ...EMPTY } : { ...svc });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof SvcCatalogItem, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.name || !f.category) return;
    setBusy(true);
    try {
      if (isNew) await createService(f); else await updateService((svc as SvcCatalogItem).id, f);
      onSaved(); onClose();
    } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)', border: `1px solid ${GOLD}22` } } }}>
      <DialogTitle sx={{ color: '#F1F5F9' }}>{isNew ? 'Новая услуга' : 'Редактировать услугу'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField size="small" label="Название" value={f.name || ''} onChange={(e) => set('name', e.target.value)} fullWidth />
          <Stack direction="row" spacing={2}>
            <Select size="small" value={f.category || 'other'} onChange={(e) => set('category', e.target.value)} sx={{ flex: 1 }}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
            <Select size="small" value={f.kind || 'partner'} onChange={(e) => set('kind', e.target.value)} sx={{ flex: 1 }}>
              <MenuItem value="own">Welcome 24 (own)</MenuItem>
              <MenuItem value="partner">Партнёр</MenuItem>
            </Select>
          </Stack>
          <TextField size="small" label="Цена (текст)" placeholder="от 5 000 ₽ / по запросу / бесплатно для вас" value={f.price_note || ''} onChange={(e) => set('price_note', e.target.value)} fullWidth />
          <TextField size="small" label="Описание" value={f.description || ''} onChange={(e) => set('description', e.target.value)} fullWidth multiline minRows={2} />
          <Stack direction="row" spacing={2}>
            {f.kind === 'own'
              ? <TextField size="small" type="number" label="Доля агенту, %" value={f.agent_share_pct ?? ''} onChange={(e) => set('agent_share_pct', e.target.value)} sx={{ flex: 1 }} />
              : <TextField size="small" type="number" label="Комиссия партнёра, %" value={f.partner_commission_pct ?? ''} onChange={(e) => set('partner_commission_pct', e.target.value)} sx={{ flex: 1 }} />}
            <TextField size="small" label="Город (пусто = все)" value={f.city || ''} onChange={(e) => set('city', e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" type="number" label="Сорт." value={f.sort ?? 0} onChange={(e) => set('sort', Number(e.target.value) || 0)} sx={{ width: 90 }} />
          </Stack>
          <FormControlLabel control={<Switch checked={!!f.active} onChange={(e) => set('active', e.target.checked ? 1 : 0)} />} label="Активна (видна клиентам)" sx={{ color: '#94A3B8' }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#94A3B8', textTransform: 'none' }}>Отмена</Button>
        <Button onClick={save} disabled={busy || !f.name || !f.category} variant="contained" sx={{ background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none' }}>{busy ? '…' : 'Сохранить'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function CatalogTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['svc-catalog'], queryFn: getServicesCatalog });
  const [edit, setEdit] = useState<SvcCatalogItem | 'new' | null>(null);
  const items = data?.items || [];
  const reload = () => qc.invalidateQueries({ queryKey: ['svc-catalog'] });
  const deactivate = async (id: number) => { if (window.confirm('Деактивировать услугу? Из каталога клиентов уйдёт, история заказов сохранится.')) { await deleteService(id); reload(); } };
  if (isLoading) return <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress sx={{ color: GOLD }} /></Box>;
  return (
    <>
      <Button variant="contained" onClick={() => setEdit('new')} sx={{ mb: 2, background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none' }}>+ Новая услуга</Button>
      <Stack spacing={1.2}>
        {items.map((s: SvcCatalogItem) => (
          <Card key={s.id} sx={{ p: 1.75, opacity: s.active ? 1 : 0.5 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14 }}>{s.name}</Typography>
              <Chip label={s.kind === 'own' ? 'Welcome 24' : 'Партнёр'} size="small" sx={{ background: s.kind === 'own' ? `${GOLD}1A` : 'rgba(148,163,184,0.14)', color: s.kind === 'own' ? GOLD : '#94A3B8', fontWeight: 700, fontSize: 11 }} />
              <Typography sx={{ color: '#64748B', fontSize: 12.5 }}>{s.category}</Typography>
              {s.price_note && <Typography sx={{ color: GOLD, fontSize: 13 }}>{s.price_note}</Typography>}
              {s.rating != null && <Stack direction="row" alignItems="center" spacing={0.3}><StarRoundedIcon sx={{ fontSize: 16, color: GOLD }} /><Typography sx={{ color: GOLD, fontSize: 13, fontWeight: 700 }}>{s.rating}</Typography><Typography sx={{ color: '#64748B', fontSize: 12 }}>({s.reviews_count})</Typography></Stack>}
              <Typography sx={{ color: '#64748B', fontSize: 12 }}>заказов: {s.orders_count}</Typography>
              {!s.active && <Chip label="неактивна" size="small" sx={{ background: 'rgba(148,163,184,0.14)', color: '#64748B', fontSize: 11 }} />}
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={() => setEdit(s)} sx={{ color: GOLD, textTransform: 'none' }}>Редактировать</Button>
              {!!s.active && <Button size="small" onClick={() => deactivate(s.id)} sx={{ color: '#EF4444', textTransform: 'none' }}>Деактивировать</Button>}
            </Stack>
          </Card>
        ))}
      </Stack>
      {edit && <EditDialog svc={edit} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}

export default function ServicesAdminView() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', color: '#94A3B8' }, '& .Mui-selected': { color: GOLD }, '& .MuiTabs-indicator': { background: GOLD } }}>
        <Tab label="Заказы" /><Tab label="Каталог" />
      </Tabs>
      {tab === 0 ? <OrdersTab /> : <CatalogTab />}
    </Box>
  );
}
