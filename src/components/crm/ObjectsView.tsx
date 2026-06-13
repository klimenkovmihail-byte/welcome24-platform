// CRM → модуль «Объекты»: витрина базы объектов агентства (MLS).
// Сетка карточек + фильтры + диалог карточки (галерея/характеристики/история цены/owner-lock).
// Данные — GET /api/mls/properties[/:id]. Раздел скрыт (super_admin), гейт — в роутере/сайдбаре.
import { useState, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Grid, Select, MenuItem, Button,
  Dialog, DialogContent, IconButton, Divider, CircularProgress, Stack, Tooltip,
  Autocomplete, TextField, Link,
} from '@mui/material';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import {
  listMlsProperties, getMlsProperty, getMlsFacets, type MlsListItem, type MlsDetail,
  TYPE_LABEL, DEAL_LABEL, ROOMS_LABEL, STATUS_LABEL, MARKET_LABEL, LAND_UNIT_LABEL,
  PARAM_LABEL, PARAM_ENUM_LABEL, priceFmt,
} from '../../api/mls';
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

function PropertyCard({ p, onOpen }: { p: MlsListItem; onOpen: () => void }) {
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

function DetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mls-property', id],
    queryFn: () => getMlsProperty(id),
  });
  const [active, setActive] = useState(0);
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
              </Stack>
              <Typography sx={{ fontWeight: 800, color: GOLD, fontSize: 28 }}>
                {priceFmt(d.price)}{d.deal_type === 'rent' ? <Box component="span" sx={{ fontSize: 16, color: '#94A3B8' }}> /мес</Box> : null}
              </Typography>
              <Typography sx={{ color: '#F1F5F9', fontWeight: 600, mt: 0.5 }}>{specsLine(d)}</Typography>
              <Typography sx={{ color: '#94A3B8', mt: 0.5 }}>{d.address || '—'}</Typography>
              {d.lat != null && d.lng != null && (
                <Link href={`https://yandex.ru/maps/?ll=${d.lng}%2C${d.lat}&z=17&pt=${d.lng}%2C${d.lat}`}
                  target="_blank" rel="noopener" underline="hover"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: GOLD, fontSize: 13 }}>
                  <MapRoundedIcon sx={{ fontSize: 16 }} /> На карте
                </Link>
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
                    {d.priceHistory.map((h, i) => (
                      <Typography key={i} sx={{ color: '#94A3B8', fontSize: 13 }}>
                        {h.created_at?.slice(0, 10)} — {priceFmt(h.new_price)}{h.reason ? ` (${h.reason})` : ''}
                      </Typography>
                    ))}
                  </Stack>
                </>
              )}

              <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
              <Grid container spacing={2}>
                <Spec label="Агент" value={d.agent?.name} />
                {d.owner ? (
                  <Spec label="Собственник" value={`${d.owner.name || ''} ${d.owner.phone || ''}`.trim() || '—'} />
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
      <Typography sx={{ color: '#64748B', fontSize: 13, mb: 2 }}>
        База объектов агентства (миграция со «Спутника»{data ? `, ${data.total}` : ''}). Фото — со «Спутника» до переноса в наше хранилище.
      </Typography>

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

      {openId != null && <DetailDialog id={openId} onClose={() => setOpenId(null)} />}
    </Box>
  );
}
