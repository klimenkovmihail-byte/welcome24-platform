// CRM → модуль «Заявки покупателей» (спрос). Список заявок + карточка заявки
// с подборкой подходящих объектов (мэтчинг). Данные — /api/mls/requests[/:id/matches].
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Grid, Stack, Button, Dialog, DialogContent,
  IconButton, Divider, CircularProgress,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { PropertyCard, DetailDialog } from './ObjectsView';
import PropertyForm from './PropertyForm';
import RequestForm from './RequestForm';
import {
  listMlsRequests, getMlsRequest, getRequestMatches, type BuyerRequest,
  TYPE_LABEL, DEAL_LABEL, ROOMS_LABEL, priceFmt,
} from '../../api/mls';
import { ErrorState, PageSkeleton } from '../States';

const GOLD = '#C9A84C';

function criteriaSummary(r: BuyerRequest): string {
  const p: (string | null)[] = [];
  if (r.deal_type) p.push(DEAL_LABEL[r.deal_type] || r.deal_type);
  if (r.property_types?.length) p.push(r.property_types.map((t) => TYPE_LABEL[t] || t).join('/'));
  if (r.rooms?.length) p.push(r.rooms.map((x) => ROOMS_LABEL[x] || x).join('/'));
  if (r.price_min || r.price_max) p.push(`${r.price_min ? priceFmt(r.price_min) : '0'} – ${r.price_max ? priceFmt(r.price_max) : '∞'}`);
  if (r.area_min || r.area_max) p.push(`${r.area_min || 0}–${r.area_max || '∞'} м²`);
  if (r.localities?.length) p.push(r.localities.join(', '));
  return p.filter(Boolean).join(' · ') || 'без критериев';
}

function RequestCard({ r, onOpen }: { r: BuyerRequest; onOpen: () => void }) {
  return (
    <Card onClick={onOpen} sx={{ cursor: 'pointer', transition: 'transform .2s, box-shadow .2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 30px rgba(0,0,0,0.4)' } }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Chip icon={<ManageSearchRoundedIcon sx={{ fontSize: 14 }} />} label={`${r.match_count ?? 0} объектов`} size="small"
            sx={{ height: 22, fontSize: 12, fontWeight: 700, color: (r.match_count ?? 0) > 0 ? '#22C55E' : '#94A3B8', background: (r.match_count ?? 0) > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.1)', '& .MuiChip-icon': { color: 'inherit' } }} />
          <Chip label={r.status === 'active' ? 'Активна' : r.status === 'paused' ? 'Пауза' : 'Закрыта'} size="small"
            sx={{ height: 18, fontSize: 10, fontWeight: 700, color: r.status === 'active' ? '#22C55E' : '#94A3B8', background: 'rgba(148,163,184,0.12)' }} />
        </Stack>
        <Typography sx={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14, mb: 0.5 }}>{criteriaSummary(r)}</Typography>
        <Stack direction="row" spacing={1.5} sx={{ color: '#64748B', fontSize: 12, flexWrap: 'wrap' }}>
          {r.buyer_name && <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}><PersonRoundedIcon sx={{ fontSize: 13 }} />{r.buyer_name}</Box>}
          <Box component="span">агент: {r.agent_name}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function RequestDetail({ id, onClose, onEdit }: { id: number; onClose: () => void; onEdit: () => void }) {
  const reqQ = useQuery({ queryKey: ['mls-request', id], queryFn: () => getMlsRequest(id) });
  const matchQ = useQuery({ queryKey: ['mls-request-matches', id], queryFn: () => getRequestMatches(id) });
  const [objId, setObjId] = useState<number | null>(null);
  const [objForm, setObjForm] = useState<number | null>(null);
  const r = reqQ.data;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { backgroundColor: '#0F1629', backgroundImage: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)', border: `1px solid ${GOLD}22`, borderRadius: 3 } } }}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
      <DialogContent sx={{ p: 3 }}>
        {reqQ.isLoading && <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Box>}
        {r && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9', pr: 4 }}>Заявка покупателя</Typography>
              <Button size="small" startIcon={<EditRoundedIcon sx={{ fontSize: 16 }} />} onClick={onEdit} sx={{ color: GOLD, textTransform: 'none', flexShrink: 0 }}>Редактировать</Button>
            </Stack>
            <Typography sx={{ color: '#CBD5E1', fontWeight: 600, mb: 0.5 }}>{criteriaSummary(r)}</Typography>
            <Stack direction="row" spacing={2} sx={{ color: '#64748B', fontSize: 13, mb: 1, flexWrap: 'wrap' }}>
              <span>агент: {r.agent?.name}</span>
              {r.buyer ? <span>покупатель: {r.buyer.name} {r.buyer.phone}</span> : r.buyer_locked ? <span>покупатель скрыт</span> : null}
            </Stack>
            {r.note && <Typography sx={{ color: '#94A3B8', fontSize: 13, mb: 1 }}>{r.note}</Typography>}

            <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
            <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 14, mb: 1.5 }}>
              Подходящие объекты{matchQ.data ? ` — ${matchQ.data.total}` : ''}
            </Typography>
            {matchQ.isLoading && <CircularProgress size={24} sx={{ color: GOLD }} />}
            {matchQ.data && (matchQ.data.items.length === 0 ? (
              <Typography sx={{ color: '#64748B', fontSize: 13 }}>Пока нет объектов под эти критерии.</Typography>
            ) : (
              <Grid container spacing={2}>
                {matchQ.data.items.map((p) => (
                  <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}><PropertyCard p={p} onOpen={() => setObjId(p.id)} /></Grid>
                ))}
              </Grid>
            ))}
          </>
        )}
      </DialogContent>
      {objId != null && <DetailDialog id={objId} onClose={() => setObjId(null)} onEdit={() => { setObjForm(objId); setObjId(null); }} />}
      {objForm != null && <PropertyForm id={objForm} onClose={() => setObjForm(null)} onSaved={() => { matchQ.refetch(); }} />}
    </Dialog>
  );
}

export default function RequestsView() {
  const [status, setStatus] = useState('active');
  const [formId, setFormId] = useState<number | null | undefined>(undefined);
  const [detailId, setDetailId] = useState<number | null>(null);
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['mls-requests'] });

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['mls-requests', status], queryFn: () => listMlsRequests({ status, limit: 60 }) });

  const chip = (label: string, on: boolean, onClick: () => void) => (
    <Chip label={label} onClick={onClick} size="small" sx={{ fontWeight: 600, cursor: 'pointer', color: on ? '#0A0E1A' : '#94A3B8', background: on ? GOLD : 'rgba(148,163,184,0.1)', border: `1px solid ${on ? GOLD : 'rgba(148,163,184,0.15)'}` }} />
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 2 }}>
        <Typography sx={{ color: '#64748B', fontSize: 13 }}>Заявки-спрос покупателей. Система подбирает объекты под критерии (мэтчинг) — и наоборот, на объект показывает покупателей.</Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setFormId(null)} sx={{ flexShrink: 0, background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#E2C97E' } }}>Создать заявку</Button>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
        {chip('Активные', status === 'active', () => setStatus('active'))}
        {chip('Все', status === '', () => setStatus(''))}
        {chip('Закрытые', status === 'closed', () => setStatus('closed'))}
      </Stack>

      {isLoading && <PageSkeleton />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {data && (data.items.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
          <ManageSearchRoundedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography>Заявок пока нет — создайте первую.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {data.items.map((r) => (
            <Grid key={r.id} size={{ xs: 12, sm: 6, lg: 4 }}><RequestCard r={r} onOpen={() => setDetailId(r.id)} /></Grid>
          ))}
        </Grid>
      ))}

      {detailId != null && <RequestDetail id={detailId} onClose={() => setDetailId(null)} onEdit={() => { setFormId(detailId); setDetailId(null); }} />}
      {formId !== undefined && <RequestForm id={formId} onClose={() => setFormId(undefined)} onSaved={refresh} />}
    </Box>
  );
}
