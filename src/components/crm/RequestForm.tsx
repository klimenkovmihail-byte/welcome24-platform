// CRM → форма создания/редактирования заявки покупателя (спрос).
// Критерии поиска + AI-разбор свободного текста + контакт покупателя.
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Grid, Stack,
  TextField, MenuItem, Button, IconButton, Chip, Autocomplete, CircularProgress, Alert,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import {
  getMlsRequest, createMlsRequest, updateMlsRequest, deleteMlsRequest, aiParseRequest, getMlsFacets,
  TYPE_LABEL, ROOMS_LABEL,
} from '../../api/mls';

const GOLD = '#C9A84C';
const TYPES = ['apartment', 'house', 'land', 'commercial', 'room', 'garage'];
const ROOMS = ['studio', '1', '2', '3', '4', '5plus', 'free'];

export default function RequestForm({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: () => void }) {
  const detailQ = useQuery({ queryKey: ['mls-request', id], queryFn: () => getMlsRequest(id as number), enabled: id != null });
  const facetsQ = useQuery({ queryKey: ['mls-facets'], queryFn: getMlsFacets, staleTime: 300_000 });
  const cities = facetsQ.data?.localities || [];

  const [dealType, setDealType] = useState('');
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [localities, setLocalities] = useState<string[]>([]);
  const [market, setMarket] = useState('');
  const [priceMin, setPriceMin] = useState(''); const [priceMax, setPriceMax] = useState('');
  const [areaMin, setAreaMin] = useState(''); const [areaMax, setAreaMax] = useState('');
  const [note, setNote] = useState('');
  const [buyer, setBuyer] = useState({ name: '', phone: '' });
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const d = detailQ.data; if (!d) return;
    setDealType(d.deal_type || ''); setPropTypes(d.property_types || []); setRooms(d.rooms || []);
    setLocalities(d.localities || []); setMarket(d.market_type || '');
    setPriceMin(d.price_min != null ? String(d.price_min) : ''); setPriceMax(d.price_max != null ? String(d.price_max) : '');
    setAreaMin(d.area_min != null ? String(d.area_min) : ''); setAreaMax(d.area_max != null ? String(d.area_max) : '');
    setNote(d.note || '');
    if (d.buyer) setBuyer({ name: d.buyer.name || '', phone: d.buyer.phone || '' });
  }, [detailQ.data]);

  const toggle = (list: string[], set: (v: string[]) => void, key: string) =>
    set(list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);

  async function aiParse() {
    if (rawText.trim().length < 5) return;
    setParsing(true); setErr('');
    try {
      const { criteria: c } = await aiParseRequest(rawText);
      if (c.deal_type) setDealType(String(c.deal_type));
      if (Array.isArray(c.property_types)) setPropTypes(c.property_types as string[]);
      if (Array.isArray(c.rooms)) setRooms((c.rooms as (string | number)[]).map(String));
      if (Array.isArray(c.localities)) setLocalities(c.localities as string[]);
      if (c.market_type) setMarket(String(c.market_type));
      if (c.price_min != null) setPriceMin(String(c.price_min));
      if (c.price_max != null) setPriceMax(String(c.price_max));
      if (c.area_min != null) setAreaMin(String(c.area_min));
      if (c.area_max != null) setAreaMax(String(c.area_max));
      if (c.note) setNote(String(c.note));
    } catch (e) { setErr('AI: ' + (e as Error).message); }
    finally { setParsing(false); }
  }

  function body() {
    return {
      deal_type: dealType || null, property_types: propTypes, rooms, localities,
      market_type: market || null,
      price_min: priceMin || null, price_max: priceMax || null, area_min: areaMin || null, area_max: areaMax || null,
      note: note || null, raw_text: rawText || null,
      ...(buyer.name || buyer.phone ? { _buyer: buyer } : {}),
    };
  }

  async function save() {
    setSaving(true); setErr('');
    try {
      if (id == null) await createMlsRequest(body()); else await updateMlsRequest(id, body());
      onSaved(); onClose();
    } catch (e) { setErr((e as Error).message); setSaving(false); }
  }
  async function onDelete() {
    if (id == null || !confirm('Закрыть заявку?')) return;
    setSaving(true);
    try { await deleteMlsRequest(id); onSaved(); onClose(); } catch (e) { setErr((e as Error).message); setSaving(false); }
  }

  const inputSx = { '& .MuiOutlinedInput-root': { color: '#F1F5F9' }, '& .MuiInputLabel-root': { color: '#94A3B8' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' } };
  const chip = (label: string, on: boolean, onClick: () => void) => (
    <Chip label={label} onClick={onClick} size="small" sx={{ fontWeight: 600, cursor: 'pointer', color: on ? '#0A0E1A' : '#94A3B8', background: on ? GOLD : 'rgba(148,163,184,0.1)', border: `1px solid ${on ? GOLD : 'rgba(148,163,184,0.15)'}`, '&:hover': { background: on ? GOLD : 'rgba(201,168,76,0.15)' } }} />
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { backgroundColor: '#0F1629', backgroundImage: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)', border: `1px solid ${GOLD}22`, borderRadius: 3 } } }}>
      <DialogTitle sx={{ color: '#F1F5F9', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {id == null ? 'Новая заявка покупателя' : 'Редактирование заявки'}
        <IconButton onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <Stack spacing={2.5}>
          {/* AI-разбор */}
          <Box>
            <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 13, mb: 0.5 }}>Разобрать текст (AI)</Typography>
            <TextField size="small" fullWidth multiline minRows={2} placeholder="Вставьте сообщение покупателя: «ищу 2-к в Москве, вторичка, до 12 млн, от 50 м²»" value={rawText} onChange={(e) => setRawText(e.target.value)} sx={inputSx} />
            <Button size="small" startIcon={parsing ? <CircularProgress size={14} sx={{ color: GOLD }} /> : <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />} onClick={aiParse} disabled={parsing || rawText.trim().length < 5} sx={{ color: GOLD, textTransform: 'none', mt: 0.5 }}>
              {parsing ? 'Разбираю…' : 'Разобрать в критерии'}
            </Button>
          </Box>

          {/* Критерии */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField select size="small" fullWidth label="Сделка" value={dealType} onChange={(e) => setDealType(e.target.value)} sx={inputSx}>
                <MenuItem value=""><em>любая</em></MenuItem><MenuItem value="sale">Продажа</MenuItem><MenuItem value="rent">Аренда</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select size="small" fullWidth label="Рынок" value={market} onChange={(e) => setMarket(e.target.value)} sx={inputSx}>
                <MenuItem value=""><em>любой</em></MenuItem><MenuItem value="secondary">Вторичка</MenuItem><MenuItem value="newbuilding">Новостройка</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Box>
            <Typography sx={{ color: '#94A3B8', fontSize: 12, mb: 0.75 }}>Тип объекта</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>{TYPES.map((t) => chip(TYPE_LABEL[t], propTypes.includes(t), () => toggle(propTypes, setPropTypes, t)))}</Stack>
          </Box>
          <Box>
            <Typography sx={{ color: '#94A3B8', fontSize: 12, mb: 0.75 }}>Комнаты</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>{ROOMS.map((r) => chip(ROOMS_LABEL[r], rooms.includes(r), () => toggle(rooms, setRooms, r)))}</Stack>
          </Box>

          <Autocomplete multiple size="small" options={cities.map((c) => c.locality)} value={localities} onChange={(_, v) => setLocalities(v)}
            renderInput={(params) => <TextField {...params} label="Города" sx={inputSx} />} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}><TextField size="small" fullWidth label="Цена от, ₽" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} sx={inputSx} /></Grid>
            <Grid size={{ xs: 6 }}><TextField size="small" fullWidth label="Цена до, ₽" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} sx={inputSx} /></Grid>
            <Grid size={{ xs: 6 }}><TextField size="small" fullWidth label="Площадь от, м²" type="number" value={areaMin} onChange={(e) => setAreaMin(e.target.value)} sx={inputSx} /></Grid>
            <Grid size={{ xs: 6 }}><TextField size="small" fullWidth label="Площадь до, м²" type="number" value={areaMax} onChange={(e) => setAreaMax(e.target.value)} sx={inputSx} /></Grid>
          </Grid>

          <TextField size="small" fullWidth label="Заметка" value={note} onChange={(e) => setNote(e.target.value)} sx={inputSx} />

          <Box>
            <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 13, mb: 1 }}>Покупатель (скрыт от других агентов)</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}><TextField size="small" fullWidth label="Имя" value={buyer.name} onChange={(e) => setBuyer((o) => ({ ...o, name: e.target.value }))} sx={inputSx} /></Grid>
              <Grid size={{ xs: 6 }}><TextField size="small" fullWidth label="Телефон" value={buyer.phone} onChange={(e) => setBuyer((o) => ({ ...o, phone: e.target.value }))} sx={inputSx} /></Grid>
            </Grid>
          </Box>

          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box>{id != null && <Button color="error" startIcon={<DeleteRoundedIcon />} onClick={onDelete} disabled={saving} sx={{ textTransform: 'none' }}>Закрыть заявку</Button>}</Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} sx={{ color: '#94A3B8', textTransform: 'none' }}>Отмена</Button>
          <Button variant="contained" onClick={save} disabled={saving} sx={{ background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#E2C97E' } }}>{saving ? 'Сохранение…' : id == null ? 'Создать' : 'Сохранить'}</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
