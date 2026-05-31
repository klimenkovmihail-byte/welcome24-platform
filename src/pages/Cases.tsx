import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Alert, Stack, Divider,
  FormControl, Select,
} from '@mui/material';
import { motion } from 'framer-motion';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { Link } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { casesApi, type CaseItem, type TaskTypeMeta, type TaskType, STATUS_RU } from '../api/cases';
import { API_BASE_URL, getToken } from '../api/apiClient';
import { getCurrentAgent } from '../auth/auth';
import CaseChat from '../components/CaseChat';

// Загрузка файла в Yandex Storage через /api/upload.
async function uploadCaseFile(file: File): Promise<{ url: string; name: string; size: number }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', 'doc');
  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd,
  });
  if (!res.ok) throw new Error('Не удалось загрузить файл');
  const data = await res.json();
  return { url: data.url, name: file.name, size: file.size };
}

// Цвет статуса задачи.
function statusColor(status: string): string {
  switch (status) {
    case 'done': case 'approved': case 'issued': return '#22C55E';
    case 'cancelled': case 'rejected': return '#EF4444';
    case 'in_progress': case 'approval': case 'consultation': return '#F59E0B';
    default: return '#64748B'; // new
  }
}

const trackIcon = (track: string) =>
  track === 'mortgage'
    ? <AccountBalanceRoundedIcon sx={{ fontSize: 18, color: '#8B5CF6' }} />
    : <GavelRoundedIcon sx={{ fontSize: 18, color: '#C9A84C' }} />;

export default function Cases() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [types, setTypes] = useState<TaskTypeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Диалог новой заявки.
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ clientName: string; objectAddress: string; city: string; note: string; taskType: TaskType | '' }>(
    { clientName: '', objectAddress: '', city: '', note: '', taskType: '' },
  );

  const load = useCallback(() => {
    setLoading(true);
    casesApi.list()
      .then(setCases)
      .catch(e => setError(e?.message || 'Ошибка загрузки заявок'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { casesApi.types().then(setTypes).catch(() => setTypes([])); }, []);

  const handleCreate = () => {
    if (!form.clientName.trim() || !form.taskType) return;
    setSaving(true);
    casesApi.create({
      clientName: form.clientName.trim(),
      objectAddress: form.objectAddress.trim() || undefined,
      city: form.city.trim() || undefined,
      note: form.note.trim() || undefined,
      taskType: form.taskType as TaskType,
    })
      .then(() => {
        setOpen(false);
        setForm({ clientName: '', objectAddress: '', city: '', note: '', taskType: '' });
        load();
      })
      .catch(e => setError(e?.message || 'Не удалось создать заявку'))
      .finally(() => setSaving(false));
  };

  const handleAddTask = (caseId: number, taskType: TaskType) => {
    casesApi.addTask(caseId, taskType).then(load).catch(() => { /* tolerate */ });
  };

  const myId = getCurrentAgent()?.id ?? null;
  const [chatOpenId, setChatOpenId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const handleUpload = async (caseId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(caseId);
    try {
      const meta = await uploadCaseFile(file);
      await casesApi.addAttachment(caseId, meta);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  const q = search.trim().toLowerCase();
  const filteredCases = cases.filter(c => {
    const matchQ = !q || c.client_name.toLowerCase().includes(q)
      || (c.object_address || '').toLowerCase().includes(q)
      || (c.city || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || c.tasks.some(t => t.type === typeFilter);
    return matchQ && matchType;
  });

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>Заявки специалистам</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Проверка документов, договор, задаток, ипотека — юристы и брокеры Welcome 24
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}
          sx={{ background: 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', fontWeight: 700 }}
        >
          Новая заявка
        </Button>
      </Box>

      {/* Фильтры и поиск */}
      {cases.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Поиск: клиент, объект, город…"
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: '1 1 240px', minWidth: 180 }}
            slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ fontSize: 18, color: '#64748B', mr: 1 }} /> } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <MenuItem value="all">Все типы</MenuItem>
              {types.map(t => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#C9A84C' }} /></Box>
      ) : cases.length === 0 ? (
        <Card><CardContent sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ color: '#64748B' }}>У вас пока нет заявок. Создайте первую — специалист возьмёт её в работу.</Typography>
        </CardContent></Card>
      ) : filteredCases.length === 0 ? (
        <Card><CardContent sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ color: '#64748B' }}>Ничего не найдено по фильтру.</Typography>
        </CardContent></Card>
      ) : (
        <Stack spacing={2}>
          {filteredCases.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F1F5F9' }}>{c.client_name}</Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                        {[c.object_address, c.city].filter(Boolean).join(' · ') || 'Объект не указан'}
                      </Typography>
                      {c.note && <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>{c.note}</Typography>}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Chip label={c.status === 'open' ? 'Открыта' : 'Закрыта'} size="small"
                        sx={{ background: c.status === 'open' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)', color: c.status === 'open' ? '#22C55E' : '#64748B', fontWeight: 700 }} />
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5, fontSize: 11 }}>
                        {new Date(c.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.08)' }} />

                  {/* Задачи внутри заявки */}
                  <Stack spacing={1}>
                    {c.tasks.map(t => {
                      const meta = types.find(x => x.key === t.type);
                      return (
                        <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          {trackIcon(t.track)}
                          <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 600, flex: '1 1 auto' }}>
                            {meta?.label || t.type}
                          </Typography>
                          <Chip label={STATUS_RU[t.status] || t.status} size="small"
                            sx={{ background: `${statusColor(t.status)}22`, color: statusColor(t.status), fontWeight: 700 }} />
                          <Typography variant="caption" sx={{ color: '#64748B', minWidth: 120, textAlign: 'right' }}>
                            {t.assignee_name ? t.assignee_name : 'ждёт специалиста'}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>

                  {/* Вложения */}
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Файлы</Typography>
                      <Button component="label" size="small" disabled={uploadingId === c.id}
                        startIcon={uploadingId === c.id ? <CircularProgress size={14} /> : <AttachFileRoundedIcon />}
                        sx={{ color: '#C9A84C', textTransform: 'none' }}>
                        Прикрепить
                        <input type="file" hidden onChange={e => handleUpload(c.id, e)} />
                      </Button>
                    </Box>
                    {c.attachments?.length > 0 && (
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {c.attachments.map(at => (
                          <Box key={at.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5, background: 'rgba(255,255,255,0.03)' }}>
                            <DescriptionRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                            <Link href={at.url} target="_blank" rel="noopener" sx={{ color: '#E2C97E', flex: 1, fontSize: 13, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                              {at.name}
                            </Link>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>{at.uploader_name}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  {/* Обсуждение (чат заявки) */}
                  <Box sx={{ mt: 2 }}>
                    <Button size="small" startIcon={<ChatBubbleOutlineRoundedIcon />}
                      onClick={() => setChatOpenId(chatOpenId === c.id ? null : c.id)}
                      sx={{ color: '#C9A84C', textTransform: 'none' }}>
                      {chatOpenId === c.id ? 'Скрыть обсуждение' : 'Обсуждение со специалистом'}
                    </Button>
                    {chatOpenId === c.id && (
                      <Box sx={{ mt: 1 }}><CaseChat caseId={c.id} myId={myId} /></Box>
                    )}
                  </Box>

                  {/* Добавить ипотеку, если её ещё нет */}
                  {!c.tasks.some(t => t.type === 'mortgage') && (
                    <Button size="small" startIcon={<AccountBalanceRoundedIcon />} onClick={() => handleAddTask(c.id, 'mortgage')}
                      sx={{ mt: 1.5, color: '#8B5CF6', textTransform: 'none', display: 'block' }}>
                      Добавить ипотеку (брокер)
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Stack>
      )}

      {/* Диалог новой заявки */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"
        slotProps={{ paper: { sx: { background: 'linear-gradient(135deg, #0F1629, #0A0E1A)', border: '1px solid rgba(201,168,76,0.15)' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#F1F5F9' }}>Новая заявка</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Клиент (ФИО)" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} fullWidth size="small" required />
            <TextField label="Объект / адрес" value={form.objectAddress} onChange={e => setForm({ ...form, objectAddress: e.target.value })} fullWidth size="small" />
            <TextField label="Город" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} fullWidth size="small" />
            <TextField select label="Что нужно?" value={form.taskType} onChange={e => setForm({ ...form, taskType: e.target.value as TaskType })} fullWidth size="small" required>
              {types.map(t => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
            </TextField>
            <TextField label="Комментарий" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} fullWidth size="small" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748B' }}>Отмена</Button>
          <Button variant="contained" disabled={saving || !form.clientName.trim() || !form.taskType} onClick={handleCreate}
            sx={{ background: 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', fontWeight: 700 }}>
            {saving ? <CircularProgress size={18} sx={{ color: '#0A0E1A' }} /> : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
