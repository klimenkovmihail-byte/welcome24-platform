// CRM → модуль «Клиенты»: агрегированный вид контактов (собственники/покупатели/лиды).
// Один контакт (дедуп по телефону) может быть собственником объектов, автором заявок-спроса,
// лидом и покупателем в сделках. Раньше эти связи были разбросаны по модулям — здесь единый
// CRM-список с ролями + поиск + карточка со связанными сущностями.
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Chip, Stack, TextField, CircularProgress, Dialog, DialogContent, IconButton, Divider, Link,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { getMlsContacts, getMlsContact, priceFmt, phoneFmt, DEAL_LABEL, STATUS_LABEL, type MlsContact } from '../../api/mls';

const GOLD = '#C9A84C';
const useDebounced = (v: string, ms = 300) => {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
};

function RoleBadges({ c }: { c: MlsContact }) {
  const b: { label: string; color: string }[] = [];
  if (c.owned) b.push({ label: `Собственник · ${c.owned}`, color: '#C9A84C' });
  if (c.requests) b.push({ label: `Заявки · ${c.requests}`, color: '#22C55E' });
  if (c.leads) b.push({ label: `Лиды · ${c.leads}`, color: '#F59E0B' });
  if (c.buy_deals) b.push({ label: `Сделки · ${c.buy_deals}`, color: '#60A5FA' });
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {b.map((x) => <Chip key={x.label} label={x.label} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: x.color, background: `${x.color}1A` }} />)}
    </Stack>
  );
}

function ContactDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['mls-contact', id], queryFn: () => getMlsContact(id), staleTime: 20_000 });
  const sectionTitle = (t: string) => <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 13, mt: 1.5, mb: 0.5 }}>{t}</Typography>;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { background: 'linear-gradient(135deg,#0F1629,#0A0E1A)', border: `1px solid ${GOLD}33`, borderRadius: 3 } } }}>
      <DialogContent sx={{ p: 3 }}>
        {isLoading || !data ? <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Box> : (
          <>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <PersonRoundedIcon sx={{ color: GOLD }} />
              <Typography sx={{ color: '#F1F5F9', fontWeight: 800, fontSize: 18, flex: 1 }}>{data.contact.name || 'Без имени'}</Typography>
              <IconButton onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
            </Stack>
            <Stack direction="row" spacing={2}>
              {data.contact.phone && <Link href={`tel:${data.contact.phone.replace(/\s/g, '')}`} underline="hover" sx={{ color: GOLD, fontSize: 14, fontWeight: 700 }}>{phoneFmt(data.contact.phone)}</Link>}
              {data.contact.email && <Typography sx={{ color: '#94A3B8', fontSize: 14 }}>{data.contact.email}</Typography>}
            </Stack>

            {data.properties.length > 0 && <>{sectionTitle('Объекты (собственник)')}
              <Stack spacing={0.5}>{data.properties.map((p) => (
                <Typography key={p.id} sx={{ color: '#CBD5E1', fontSize: 13 }}>{p.address || `#${p.id}`}{p.locality ? ` · ${p.locality}` : ''} — {STATUS_LABEL[p.status] || p.status}{p.price ? ` · ${priceFmt(p.price)}` : ''}</Typography>
              ))}</Stack></>}

            {data.requests.length > 0 && <>{sectionTitle('Заявки-спрос')}
              <Stack spacing={0.5}>{data.requests.map((r) => (
                <Typography key={r.id} sx={{ color: '#CBD5E1', fontSize: 13 }}>{r.deal_type ? (DEAL_LABEL[r.deal_type] || r.deal_type) : 'Заявка'} · {(r.price_min || r.price_max) ? `${r.price_min ? priceFmt(r.price_min) : '0'}–${r.price_max ? priceFmt(r.price_max) : '∞'}` : 'без бюджета'} — {r.status}</Typography>
              ))}</Stack></>}

            {data.leads.length > 0 && <>{sectionTitle('Лиды')}
              <Stack spacing={0.5}>{data.leads.map((l) => (
                <Typography key={l.id} sx={{ color: '#CBD5E1', fontSize: 13 }}>{l.source} · {l.status} · {l.created_at?.slice(0, 10)}</Typography>
              ))}</Stack></>}

            {data.deals.length > 0 && <>{sectionTitle('Сделки (покупатель)')}
              <Stack spacing={0.5}>{data.deals.map((d) => (
                <Typography key={d.id} sx={{ color: '#CBD5E1', fontSize: 13 }}>Объект #{d.property_id} · ВКД {priceFmt(d.vkd)} · {d.status} · {d.date}</Typography>
              ))}</Stack></>}

            {!data.properties.length && !data.requests.length && !data.leads.length && !data.deals.length && (
              <Typography sx={{ color: '#64748B', fontSize: 13, mt: 2 }}>Нет связанных сущностей.</Typography>
            )}
            <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
            {data.contact.note && <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>{data.contact.note}</Typography>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsView() {
  const [q, setQ] = useState('');
  const qd = useDebounced(q);
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['mls-contacts', qd], queryFn: () => getMlsContacts(qd), staleTime: 20_000 });
  const items = data?.items || [];

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center">
        <TextField size="small" placeholder="Поиск по имени или телефону" value={q} onChange={(e) => setQ(e.target.value)}
          sx={{ flex: 1, maxWidth: 360, '& .MuiOutlinedInput-root': { color: '#F1F5F9', '& fieldset': { borderColor: `${GOLD}33` } } }} />
        <Typography sx={{ color: '#64748B', fontSize: 13 }}>{data?.total ?? items.length} контактов</Typography>
      </Stack>

      {isLoading ? <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Box>
        : items.length === 0 ? <Typography sx={{ color: '#64748B', fontSize: 14, py: 4, textAlign: 'center' }}>Контактов нет (появляются как собственники объектов, авторы заявок, лиды, покупатели).</Typography>
        : (
          <Stack spacing={1}>
            {items.map((c) => (
              <Box key={c.id} onClick={() => setOpenId(c.id)}
                sx={{ p: 1.5, borderRadius: 1.5, background: 'rgba(15,22,41,0.6)', border: '1px solid rgba(201,168,76,0.14)', cursor: 'pointer', transition: 'border-color .15s', '&:hover': { borderColor: `${GOLD}44` } }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography sx={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14 }}>{c.name || 'Без имени'}</Typography>
                  {c.phone && <Typography sx={{ color: GOLD, fontSize: 13 }}>{phoneFmt(c.phone)}</Typography>}
                  <Box sx={{ flex: 1 }} />
                  <RoleBadges c={c} />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      {openId != null && <ContactDialog id={openId} onClose={() => setOpenId(null)} />}
    </Box>
  );
}
