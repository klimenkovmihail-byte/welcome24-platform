// CRM → форма создания/редактирования объекта. Динамическая по registry (63 поля,
// фильтр по типу объекта), автоподсказка адреса DaData, собственник (контакт),
// проверка на дубль, загрузка фото. Бэк: POST/PUT /api/mls/properties + :id/photos.
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Grid, Stack,
  TextField, Select, MenuItem, Switch, FormControlLabel, Button, IconButton, Chip,
  Autocomplete, CircularProgress, Alert, Divider, InputAdornment,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  getMlsRegistry, getMlsProperty, createMlsProperty, updateMlsProperty, deleteMlsProperty,
  suggestMlsAddress, dedupCheck, uploadMlsPhotos, deleteMlsPhoto,
  type RegistryField, type AddressSuggestion, type MlsPhoto,
} from '../../api/mls';

const GOLD = '#C9A84C';
const ADDR_KEYS = ['region', 'locality', 'district', 'street', 'house', 'apartment'];

export default function PropertyForm({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: () => void }) {
  const regQ = useQuery({ queryKey: ['mls-registry'], queryFn: getMlsRegistry, staleTime: 600_000 });
  const detailQ = useQuery({ queryKey: ['mls-property', id], queryFn: () => getMlsProperty(id as number), enabled: id != null });

  const [editId, setEditId] = useState<number | null>(id);
  const [vals, setVals] = useState<Record<string, unknown>>({ property_type: 'apartment', deal_type: 'sale' });
  const [meta, setMeta] = useState<{ address?: string; lat?: number; lng?: number; fias_id?: string; address_json?: unknown }>({});
  const [status, setStatus] = useState('draft');
  const [owner, setOwner] = useState({ name: '', phone: '' });
  const [photos, setPhotos] = useState<MlsPhoto[]>([]);
  const [addrOpts, setAddrOpts] = useState<AddressSuggestion[]>([]);
  const [addrInput, setAddrInput] = useState('');
  const [dups, setDups] = useState<{ id: number; reason: string; address: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Префилл при правке.
  useEffect(() => {
    const d = detailQ.data;
    if (!d) return;
    const v: Record<string, unknown> = {};
    for (const f of (regQ.data?.fields || [])) {
      const raw = (d as Record<string, unknown>)[f.key] ?? (d.params as Record<string, unknown>)?.[f.key];
      if (raw != null) v[f.key] = raw;
    }
    v.property_type = d.property_type; v.deal_type = d.deal_type;
    setVals(v);
    setStatus(d.status || 'draft');
    setMeta({ address: d.address || '', lat: d.lat ?? undefined, lng: d.lng ?? undefined, fias_id: d.fias_id ?? undefined });
    setAddrInput(d.address || '');
    setPhotos(d.photos || []);
    if (d.owner) setOwner({ name: d.owner.name || '', phone: d.owner.phone || '' });
  }, [detailQ.data, regQ.data]);

  const propertyType = String(vals.property_type || 'apartment');
  const set = (k: string, val: unknown) => setVals((s) => ({ ...s, [k]: val }));

  // Поля по типу, сгруппированные (без deal_type/property_type — они сверху).
  const groups = useMemo(() => {
    const fields = (regQ.data?.fields || []).filter((f) =>
      !['deal_type', 'property_type'].includes(f.key) &&
      (!f.applicableTypes.length || f.applicableTypes.includes(propertyType)));
    const g: Record<string, RegistryField[]> = {};
    for (const f of fields) (g[f.group] ||= []).push(f);
    return g;
  }, [regQ.data, propertyType]);

  // DaData подсказки (дебаунс).
  useEffect(() => {
    if (addrInput.trim().length < 3) { setAddrOpts([]); return; }
    const t = setTimeout(async () => {
      try { setAddrOpts((await suggestMlsAddress(addrInput)).suggestions); } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [addrInput]);

  function pickAddress(s: AddressSuggestion | null) {
    if (!s) return;
    const d = s.data;
    setMeta({ address: s.value, lat: d.geo_lat ? Number(d.geo_lat) : undefined, lng: d.geo_lon ? Number(d.geo_lon) : undefined, fias_id: d.fias_id || undefined, address_json: s });
    setVals((v) => ({
      ...v,
      region: d.region_with_type || d.region || v.region,
      locality: d.city || d.settlement || v.locality,
      district: d.area_with_type || d.city_district_with_type || v.district,
      street: d.street_with_type || v.street,
      house: d.house || v.house,
    }));
    runDedup({ fias_id: d.fias_id, lat: d.geo_lat, lng: d.geo_lon });
  }

  async function runDedup(extra: Record<string, unknown> = {}) {
    try {
      const r = await dedupCheck({
        cadastral_number: vals.cadastral_number as string, exclude_id: editId ?? undefined,
        rooms: vals.rooms as string, total_area: vals.total_area as string, apartment: vals.apartment as string,
        ...extra,
      } as Record<string, string | number | null | undefined>);
      setDups(r.duplicates || []);
    } catch { /* ignore */ }
  }

  function buildBody() {
    const body: Record<string, unknown> = { ...vals, _status: status };
    if (meta.address != null) body._address = meta.address;
    if (meta.lat != null) body._lat = meta.lat;
    if (meta.lng != null) body._lng = meta.lng;
    if (meta.fias_id != null) body._fias_id = meta.fias_id;
    if (meta.address_json != null) body._address_json = meta.address_json;
    if (owner.name || owner.phone) body._owner = owner;
    return body;
  }

  async function save() {
    setSaving(true); setErr('');
    try {
      if (editId == null) {
        const r = await createMlsProperty(buildBody());
        setEditId(r.id); // переходим в режим правки → станет доступна загрузка фото
      } else {
        await updateMlsProperty(editId, buildBody());
      }
      onSaved();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  async function onUpload(files: FileList | null) {
    if (!files || !files.length || editId == null) return;
    setSaving(true); setErr('');
    try {
      const r = await uploadMlsPhotos(editId, Array.from(files));
      setPhotos((p) => [...p, ...r.photos]);
    } catch (e) { setErr('Фото: ' + (e as Error).message); }
    finally { setSaving(false); }
  }

  async function removePhoto(photoId: number) {
    if (editId == null) return;
    await deleteMlsPhoto(editId, photoId);
    setPhotos((p) => p.filter((x) => x.id !== photoId));
  }

  async function onDelete() {
    if (editId == null) return;
    if (!confirm('Удалить объект?')) return;
    setSaving(true);
    try { await deleteMlsProperty(editId); onSaved(); onClose(); }
    catch (e) { setErr((e as Error).message); setSaving(false); }
  }

  const inputSx = { '& .MuiOutlinedInput-root': { color: '#F1F5F9' }, '& .MuiInputLabel-root': { color: '#94A3B8' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.2)' } };

  function renderField(f: RegistryField) {
    const v = vals[f.key];
    if (f.kind === 'enum' && f.enumValues) {
      return (
        <TextField select size="small" fullWidth label={f.label} value={(v as string) ?? ''} onChange={(e) => set(f.key, e.target.value)} sx={inputSx}>
          <MenuItem value=""><em>—</em></MenuItem>
          {f.enumValues.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
        </TextField>
      );
    }
    if (f.kind === 'bool') {
      return <FormControlLabel control={<Switch checked={!!v} onChange={(e) => set(f.key, e.target.checked)} />} label={f.label} sx={{ color: '#94A3B8' }} />;
    }
    if (f.kind === 'tags') {
      return <TextField size="small" fullWidth label={f.label + ' (через запятую)'} value={Array.isArray(v) ? (v as string[]).join(', ') : (v as string) ?? ''} onChange={(e) => set(f.key, e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} sx={inputSx} />;
    }
    const multiline = f.kind === 'multiline';
    return (
      <TextField size="small" fullWidth label={f.label} value={(v as string) ?? ''} type={f.kind === 'number' ? 'number' : 'text'}
        multiline={multiline} minRows={multiline ? 3 : undefined} onChange={(e) => set(f.key, e.target.value)}
        onBlur={f.key === 'cadastral_number' ? () => runDedup() : undefined}
        slotProps={{ input: f.unit ? { endAdornment: <InputAdornment position="end"><span style={{ color: '#64748B', fontSize: 12 }}>{f.unit}</span></InputAdornment> } : undefined }}
        sx={inputSx} />
    );
  }

  const dlgPaper = { sx: { background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)', border: `1px solid ${GOLD}22`, borderRadius: 3, backgroundImage: 'none' } };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: dlgPaper }}>
      <DialogTitle sx={{ color: '#F1F5F9', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editId == null ? 'Новый объект' : 'Редактирование объекта'}
        <IconButton onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        {regQ.isLoading ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Box> : (
          <Stack spacing={2.5}>
            {/* Тип / сделка / статус */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select size="small" fullWidth label="Тип объекта" value={propertyType} onChange={(e) => set('property_type', e.target.value)} sx={inputSx}>
                  {(regQ.data?.propertyTypes || []).map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select size="small" fullWidth label="Сделка" value={String(vals.deal_type || 'sale')} onChange={(e) => set('deal_type', e.target.value)} sx={inputSx}>
                  {(regQ.data?.dealTypes || []).map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select size="small" fullWidth label="Статус" value={status} onChange={(e) => setStatus(e.target.value)} sx={inputSx}>
                  <MenuItem value="draft">Черновик</MenuItem>
                  <MenuItem value="active">Активен</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Адрес (DaData) */}
            <Box>
              <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 13, mb: 1 }}>Адрес</Typography>
              <Autocomplete
                freeSolo size="small" options={addrOpts} filterOptions={(x) => x}
                getOptionLabel={(o) => typeof o === 'string' ? o : o.value}
                inputValue={addrInput} onInputChange={(_, v) => { setAddrInput(v); setMeta((m) => ({ ...m, address: v })); }}
                onChange={(_, v) => typeof v !== 'string' && pickAddress(v)}
                renderInput={(params) => <TextField {...params} placeholder="Начните вводить адрес…" sx={inputSx} />}
              />
              {meta.lat != null && <Typography sx={{ color: '#64748B', fontSize: 12, mt: 0.5 }}>координаты: {meta.lat?.toFixed(5)}, {meta.lng?.toFixed(5)}{meta.fias_id ? ' · ФИАС ✓' : ''}</Typography>}
              {dups.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Возможный дубль: {dups.map((d) => `#${d.id} (${d.reason})`).join(', ')}
                </Alert>
              )}
            </Box>

            {/* Собственник */}
            <Box>
              <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 13, mb: 1 }}>Собственник (скрыт от других агентов)</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}><TextField size="small" fullWidth label="Имя" value={owner.name} onChange={(e) => setOwner((o) => ({ ...o, name: e.target.value }))} sx={inputSx} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField size="small" fullWidth label="Телефон" value={owner.phone} onChange={(e) => setOwner((o) => ({ ...o, phone: e.target.value }))} sx={inputSx} /></Grid>
              </Grid>
            </Box>

            {/* Динамические поля по группам */}
            {Object.entries(groups).map(([group, fields]) => (
              <Box key={group}>
                <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 13, mb: 1 }}>{group}</Typography>
                <Grid container spacing={2}>
                  {fields.map((f) => (
                    <Grid key={f.key} size={{ xs: 12, sm: f.kind === 'multiline' ? 12 : 6, md: f.kind === 'multiline' ? 12 : 4 }}>
                      {renderField(f)}
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}

            {/* Фото */}
            <Box>
              <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 13, mb: 1 }}>Фото</Typography>
              {editId == null ? (
                <Typography sx={{ color: '#64748B', fontSize: 13 }}>Сохраните объект — затем появится загрузка фото.</Typography>
              ) : (
                <>
                  <Button component="label" startIcon={<AddPhotoAlternateRoundedIcon />} variant="outlined" size="small"
                    disabled={saving} sx={{ color: GOLD, borderColor: `${GOLD}55`, mb: 1.5 }}>
                    Добавить фото
                    <input hidden type="file" accept="image/*" multiple onChange={(e) => onUpload(e.target.files)} />
                  </Button>
                  <Grid container spacing={1}>
                    {photos.map((ph) => (
                      <Grid key={ph.id} size={{ xs: 4, sm: 3, md: 2 }}>
                        <Box sx={{ position: 'relative', pt: '75%', borderRadius: 1, overflow: 'hidden', border: ph.is_main ? `2px solid ${GOLD}` : '1px solid rgba(148,163,184,0.2)' }}>
                          <Box component="img" src={ph.thumb_url || ph.url} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          {!!ph.is_main && <StarRoundedIcon sx={{ position: 'absolute', top: 2, left: 2, fontSize: 16, color: GOLD }} />}
                          <IconButton size="small" onClick={() => removePhoto(ph.id)} sx={{ position: 'absolute', top: 2, right: 2, p: 0.25, background: 'rgba(8,12,24,0.7)', color: '#EF4444' }}>
                            <DeleteRoundedIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </Box>

            {err && <Alert severity="error">{err}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box>
          {editId != null && <Button color="error" startIcon={<DeleteRoundedIcon />} onClick={onDelete} disabled={saving} sx={{ textTransform: 'none' }}>Удалить</Button>}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} sx={{ color: '#94A3B8', textTransform: 'none' }}>Закрыть</Button>
          <Button variant="contained" onClick={save} disabled={saving}
            sx={{ background: GOLD, color: '#0A0E1A', fontWeight: 700, textTransform: 'none', '&:hover': { background: '#E2C97E' } }}>
            {saving ? 'Сохранение…' : editId == null ? 'Создать' : 'Сохранить'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
