// CRM → модуль «Лиды» (Фаза 2, модель): очередь обращений покупателей + claim + SLA-overdue +
// смена статуса + AI-конвертация в заявку-покупателя + intake-токен (стаб под площадки).
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Stack, Card, Chip, CircularProgress, Select, MenuItem, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Alert,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import {
  getLeads, getLead, createLead, patchLead, convertLead, aiParseRequest, getIntakeToken, regenIntakeToken,
  type Lead, type LeadDetail,
} from '../../api/mls';
import { getCurrentAgent } from '../../auth/auth';

const GOLD = '#C9A84C';
const LEAD_STATUS = [
  { v: 'new', l: 'Новый' }, { v: 'claimed', l: 'Взят' }, { v: 'in_progress', l: 'В работе' },
  { v: 'qualified', l: 'Квалифицирован' }, { v: 'converted', l: 'В заявке' },
  { v: 'spam', l: 'Спам' }, { v: 'duplicate', l: 'Дубль' }, { v: 'lost', l: 'Потерян' },
];
const sl = (s: string) => LEAD_STATUS.find((x) => x.v === s)?.l || s;
const sc = (s: string): string => ({ new: '#EF4444', claimed: '#F59E0B', in_progress: '#4361EE', qualified: '#8B5CF6', converted: '#22C55E', spam: '#64748B', duplicate: '#64748B', lost: '#64748B' } as Record<string, string>)[s] || '#94A3B8';
const fmt = (s: string) => { try { return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return s; } };
const dialogPaper = { sx: { background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)', border: `1px solid ${GOLD}22` } };

function NewLeadDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ name: '', phone: '', raw_text: '', property_id: '', note: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.name && !f.phone && !f.raw_text) return;
    setBusy(true);
    try { await createLead({ name: f.name || undefined, phone: f.phone || undefined, raw_text: f.raw_text || undefined, property_id: f.property_id ? Number(f.property_id) : undefined, note: f.note || undefined }); onCreated(); onClose(); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: dialogPaper }}>
      <DialogTitle sx={{ color: '#F1F5F9' }}>Новый лид</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={2}>
            <TextField size="small" label="Имя" value={f.name} onChange={(e) => set('name', e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" label="Телефон" value={f.phone} onChange={(e) => set('phone', e.target.value)} sx={{ flex: 1 }} />
          </Stack>
          <TextField size="small" label="Текст обращения" placeholder="«ищу 2-к в Москве, вторичка, до 12 млн»" value={f.raw_text} onChange={(e) => set('raw_text', e.target.value)} fullWidth multiline minRows={2} />
          <Stack direction="row" spacing={2}>
            <TextField size="small" label="ID объекта (если по объявлению)" value={f.property_id} onChange={(e) => set('property_id', e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" label="Заметка" value={f.note} onChange={(e) => set('note', e.target.value)} sx={{ flex: 1 }} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#94A3B8', textTransform: 'none' }}>Отмена</Button>
        <Button onClick={save} disabled={busy || (!f.name && !f.phone && !f.raw_text)} variant="contained" sx={{ background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none' }}>{busy ? '…' : 'Создать'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function LeadDetailDialog({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const myId = getCurrentAgent()?.id ?? null;
  const { data, refetch } = useQuery({ queryKey: ['lead', id], queryFn: () => getLead(id) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const l = data as LeadDetail | undefined;
  if (!l) return <Dialog open onClose={onClose} slotProps={{ paper: dialogPaper }}><DialogContent><CircularProgress sx={{ color: GOLD }} /></DialogContent></Dialog>;
  const act = async (body: { claim?: boolean; first_response?: boolean; status?: string }) => { setBusy(true); try { await patchLead(id, body); await refetch(); onChanged(); } finally { setBusy(false); } };
  const convert = async () => {
    setBusy(true); setMsg('');
    try {
      let criteria: Record<string, unknown> = {};
      const txt = (l.raw_text || '').trim();
      if (txt.length >= 5) { try { criteria = (await aiParseRequest(txt)).criteria; } catch { /* пустые критерии — заявку допишут */ } }
      const r = await convertLead(id, criteria);
      setMsg(`Создана заявка-покупатель #${r.request_id} — дальше в модуле «Заявки покупателей».`);
      await refetch(); onChanged();
    } catch (e) { setMsg('Ошибка: ' + (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: dialogPaper }}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
      <DialogContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5, pr: 4, flexWrap: 'wrap' }} useFlexGap>
          <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 18 }}>{l.name || l.contact_name || 'Лид'}</Typography>
          <Chip label={sl(l.status)} size="small" sx={{ background: sc(l.status) + '22', color: sc(l.status), fontWeight: 700 }} />
          {l.overdue && <Chip label="SLA просрочен" size="small" sx={{ background: 'rgba(239,68,68,0.18)', color: '#EF4444', fontWeight: 700 }} />}
        </Stack>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {(l.phone || l.contact_phone) && <Typography sx={{ color: '#94A3B8', fontSize: 14 }}>📞 {l.phone || l.contact_phone}</Typography>}
          {l.property_address && <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Объект: {l.property_address}</Typography>}
          {l.agent_name && <Typography sx={{ color: '#64748B', fontSize: 13 }}>Агент: {l.agent_name}</Typography>}
          <Typography sx={{ color: '#64748B', fontSize: 12 }}>Источник: {l.source} · {fmt(l.created_at)}</Typography>
          {l.raw_text && <Typography sx={{ color: '#E2E8F0', fontSize: 14, mt: 1, p: 1.2, borderRadius: 1.5, background: 'rgba(0,0,0,0.25)' }}>{l.raw_text}</Typography>}
        </Stack>

        {msg && <Alert severity={msg.startsWith('Ошибка') ? 'error' : 'success'} sx={{ mb: 2 }}>{msg}</Alert>}

        {l.status !== 'converted' && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
            {l.agent_id !== myId && <Button size="small" variant="outlined" disabled={busy} onClick={() => act({ claim: true })} sx={{ color: GOLD, borderColor: `${GOLD}55`, textTransform: 'none' }}>Взять</Button>}
            {!l.first_response_at && <Button size="small" variant="outlined" disabled={busy} onClick={() => act({ first_response: true })} sx={{ color: '#22C55E', borderColor: 'rgba(34,197,94,0.4)', textTransform: 'none' }}>Отметить ответ</Button>}
            <Select size="small" value={l.status} disabled={busy} onChange={(e) => act({ status: e.target.value })} sx={{ minWidth: 150 }}>
              {LEAD_STATUS.filter((s) => s.v !== 'converted').map((s) => <MenuItem key={s.v} value={s.v}>{s.l}</MenuItem>)}
            </Select>
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="contained" disabled={busy} startIcon={<AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />} onClick={convert} sx={{ background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none' }}>AI → в заявку</Button>
          </Stack>
        )}

        <Typography sx={{ color: '#64748B', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.5 }}>История</Typography>
        <Stack spacing={0.5}>
          {l.events.map((e, i) => (
            <Typography key={i} sx={{ color: '#94A3B8', fontSize: 12.5 }}>{fmt(e.created_at)} · {e.type}{e.detail ? ` (${e.detail})` : ''}{e.agent_name ? ` — ${e.agent_name}` : ''}</Typography>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function IntakePanel() {
  const { data, refetch } = useQuery({ queryKey: ['lead-intake-token'], queryFn: getIntakeToken });
  const [open, setOpen] = useState(false);
  const token = data?.token;
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)} sx={{ color: '#64748B', textTransform: 'none' }}>Intake-токен (для площадок)</Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: dialogPaper }}>
          <DialogTitle sx={{ color: '#F1F5F9' }}>Приём лидов с площадок/форм</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: '#94A3B8', fontSize: 13, mb: 1.5 }}>Внешние источники шлют лиды на <code>POST /api/leads/buyer-intake</code> с заголовком <code>X-Intake-Token</code>. Тело: {'{ phone, name?, text?, property_id? }'}.</Typography>
            <TextField size="small" fullWidth value={token || '— не сгенерирован —'} slotProps={{ input: { readOnly: true } }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={async () => { await regenIntakeToken(); refetch(); }} sx={{ color: GOLD, textTransform: 'none' }}>{token ? 'Перевыпустить' : 'Сгенерировать'}</Button>
            <Button onClick={() => setOpen(false)} sx={{ color: '#94A3B8', textTransform: 'none' }}>Закрыть</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

export default function LeadsView() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [mine, setMine] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['leads', status, mine], queryFn: () => getLeads({ status: status || undefined, mine }), refetchInterval: 20_000 });
  const items = data?.items || [];
  const reload = () => qc.invalidateQueries({ queryKey: ['leads'] });

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }} useFlexGap>
        <Button variant="contained" onClick={() => setCreating(true)} sx={{ background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none' }}>+ Новый лид</Button>
        <Select size="small" value={status} onChange={(e) => setStatus(e.target.value)} displayEmpty sx={{ minWidth: 160 }}>
          <MenuItem value="">Все статусы</MenuItem>
          {LEAD_STATUS.map((s) => <MenuItem key={s.v} value={s.v}>{s.l}</MenuItem>)}
        </Select>
        <Chip label="Мои" onClick={() => setMine((v) => !v)} sx={{ cursor: 'pointer', background: mine ? `${GOLD}22` : 'rgba(148,163,184,0.12)', color: mine ? GOLD : '#94A3B8', fontWeight: 700 }} />
        <Box sx={{ flex: 1 }} />
        <IntakePanel />
      </Stack>

      {isLoading ? <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress sx={{ color: GOLD }} /></Box>
        : items.length === 0 ? <Typography sx={{ color: '#64748B', py: 4, textAlign: 'center' }}>Лидов нет. Создайте вручную или подключите площадки (intake-токен).</Typography>
          : (
            <Stack spacing={1.2}>
              {items.map((l: Lead) => (
                <Card key={l.id} onClick={() => setOpenId(l.id)} sx={{ p: 1.5, cursor: 'pointer', border: l.overdue ? '1px solid rgba(239,68,68,0.45)' : undefined, '&:hover': { borderColor: `${GOLD}55` } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                    <Chip label={sl(l.status)} size="small" sx={{ background: sc(l.status) + '22', color: sc(l.status), fontWeight: 700 }} />
                    {l.overdue && <Chip label="SLA" size="small" sx={{ height: 20, background: 'rgba(239,68,68,0.18)', color: '#EF4444', fontWeight: 800, fontSize: 11 }} />}
                    <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14 }}>{l.name || l.contact_name || 'Лид'}</Typography>
                    {l.phone && <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>{l.phone}</Typography>}
                    {l.property_address && <Typography sx={{ color: '#64748B', fontSize: 12.5 }}>{l.property_address}</Typography>}
                    <Box sx={{ flex: 1 }} />
                    {l.agent_name && <Typography sx={{ color: '#64748B', fontSize: 12 }}>{l.agent_name}</Typography>}
                    <Typography sx={{ color: '#64748B', fontSize: 12 }}>{fmt(l.created_at)}</Typography>
                  </Stack>
                  {l.raw_text && <Typography sx={{ color: '#94A3B8', fontSize: 13, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.raw_text}</Typography>}
                </Card>
              ))}
            </Stack>
          )}

      {creating && <NewLeadDialog onClose={() => setCreating(false)} onCreated={reload} />}
      {openId && <LeadDetailDialog id={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </Box>
  );
}
