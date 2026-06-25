import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress, Alert, Stack, Divider,
  FormControl, Select, Badge, IconButton,
} from '@mui/material';
import { motion } from 'framer-motion';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Link } from '@mui/material';
import { casesApi, type CaseItem, type TaskTypeMeta, type TaskType, type TaskTrack, STATUS_RU } from '../api/cases';
import { API_BASE_URL, getToken } from '../api/apiClient';
import { uploadErr } from '../lib/uploadError';
import { getCurrentAgent } from '../auth/auth';
import Thread from '../components/Thread';
import CaseTimeline from '../components/CaseTimeline';

// Загрузка файла в Yandex Storage через /api/upload.
async function uploadCaseFile(file: File): Promise<{ url: string; name: string; size: number }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', 'doc');
  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd,
  });
  if (!res.ok) throw new Error(await uploadErr(res));
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

// track — ограничить раздел одной дорожкой (legal → «Юристы», mortgage → «Ипотека»).
export default function Cases({ track, initialOpenId }: { track?: TaskTrack; initialOpenId?: number } = {}) {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [types, setTypes] = useState<TaskTypeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  // Фильтр «Все/Активные/Завершённые» запоминаем — чтобы не сбрасывался при каждом входе/обновлении.
  const [stateFilter, setStateFilter] = useState<'active' | 'done' | 'all'>(() => {
    try { const v = localStorage.getItem('w24_cases_state_filter'); return v === 'active' || v === 'done' ? v : 'all'; } catch { return 'all'; }
  });
  useEffect(() => { try { localStorage.setItem('w24_cases_state_filter', stateFilter); } catch { /* ignore */ } }, [stateFilter]);

  // Диалог новой заявки.
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ clientName: string; objectAddress: string; city: string; note: string; taskType: TaskType | '' }>(
    { clientName: '', objectAddress: '', city: '', note: '', taskType: '' },
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    casesApi.list()
      .then(setCases)
      .catch(e => setError(e?.message || 'Ошибка загрузки заявок'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { casesApi.types().then(setTypes).catch(() => setTypes([])); }, []);

  const handleCreate = async () => {
    if (!form.clientName.trim() || !form.taskType) return;
    setSaving(true);
    try {
      const created = await casesApi.create({
        clientName: form.clientName.trim(),
        objectAddress: form.objectAddress.trim() || undefined,
        city: form.city.trim() || undefined,
        note: form.note.trim() || undefined,
        taskType: form.taskType as TaskType,
      });
      // Прикрепляем документы, выбранные при создании. Неудавшиеся — собираем
      // и показываем: раньше ошибка глоталась молча, и агент был уверен,
      // что документы прикреплены.
      const failed: string[] = [];
      for (const f of newFiles) {
        try { const up = await uploadCaseFile(f); await casesApi.addAttachment(created.id, { name: up.name, url: up.url, size: up.size }); }
        catch { failed.push(f.name); }
      }
      setOpen(false);
      setForm({ clientName: '', objectAddress: '', city: '', note: '', taskType: '' });
      setNewFiles([]);
      load();
      if (failed.length) {
        setError(`Заявка создана, но файлы не загрузились: ${failed.join(', ')}. Откройте заявку и прикрепите их заново.`);
      }
    } catch (e) {
      setError((e as Error)?.message || 'Не удалось создать заявку');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = (caseId: number, taskType: TaskType) => {
    casesApi.addTask(caseId, taskType).then(c => { setDetail(c); load(); }).catch(() => { /* tolerate */ });
  };

  const myId = getCurrentAgent()?.id ?? null;
  // Большой диалог заявки (как в админке).
  const [detail, setDetail] = useState<CaseItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const openDetail = (caseId: number) => {
    setDetailLoading(true);
    casesApi.get(caseId)
      .then(setDetail)
      .catch(e => setError(e?.message || 'Не удалось открыть заявку'))
      .finally(() => setDetailLoading(false));
    casesApi.markRead(caseId).then(load).catch(() => {});
  };

  // Авто-открытие конкретной заявки при переходе из «Мои обращения».
  useEffect(() => {
    if (initialOpenId) openDetail(initialOpenId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenId]);

  const [dragDoc, setDragDoc] = useState(false);
  // Загрузка одного и более файлов в заявку — общая для кнопки «Прикрепить» и перетаскивания.
  const uploadCaseFiles = async (files: File[]) => {
    if (!files.length || !detail) return;
    setUploading(true);
    try {
      let cur = detail;
      for (const f of files) {
        const meta = await uploadCaseFile(f);
        cur = await casesApi.addAttachment(detail.id, meta);
      }
      setDetail(cur);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл.');
    } finally {
      setUploading(false);
    }
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadCaseFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };
  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragDoc(false);
    uploadCaseFiles(Array.from(e.dataTransfer?.files || []));
  };

  const q = search.trim().toLowerCase();
  const CLOSED = ['done', 'cancelled', 'issued', 'rejected'];
  const isCaseClosed = (c: CaseItem) => c.tasks.length > 0 && c.tasks.every(t => CLOSED.includes(t.status));
  // Типы задач для селектов — ограничены дорожкой раздела (если задана).
  const formTypes = track ? types.filter(t => t.track === track) : types;
  const filteredCases = cases.filter(c => {
    const matchTrack = !track || c.tasks.some(t => t.track === track);
    const matchQ = !q || c.client_name.toLowerCase().includes(q)
      || (c.object_address || '').toLowerCase().includes(q)
      || (c.city || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || c.tasks.some(t => t.type === typeFilter);
    const closed = isCaseClosed(c);
    const matchState = stateFilter === 'all' || (stateFilter === 'active' && !closed) || (stateFilter === 'done' && closed);
    return matchTrack && matchQ && matchType && matchState;
  }).sort((a, b) => {
    // Закрытые/завершённые заявки — всегда вниз, активные — сверху; внутри группы — по дате.
    const ca = isCaseClosed(a) ? 1 : 0, cb = isCaseClosed(b) ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  const headerTitle = track === 'legal' ? 'Юристы' : track === 'mortgage' ? 'Ипотека' : 'Заявки специалистам';
  const headerSub = track === 'legal'
    ? 'Проверка документов, договор, задаток, ДКП, сделка — штатные юристы Welcome 24'
    : track === 'mortgage'
      ? 'Подбор и одобрение ипотеки, страхование — ипотечные брокеры Welcome 24'
      : 'Проверка документов, договор, задаток, ипотека — юристы и брокеры Welcome 24';

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{headerTitle}</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>{headerSub}</Typography>
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
              {formTypes.map(t => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={stateFilter} onChange={e => setStateFilter(e.target.value as typeof stateFilter)}>
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="done">Завершённые</MenuItem>
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
        <Stack spacing={1.5}>
          {filteredCases.map((c) => (
            <Card key={c.id} onClick={() => openDetail(c.id)}
              sx={{ cursor: 'pointer', transition: 'border-color 0.15s', '&:hover': { borderColor: 'rgba(201,168,76,0.35)' } }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>{c.client_name}</Typography>
                      {(c.unread || 0) > 0 && (
                        <Chip label={`+${c.unread}`} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, background: 'rgba(239,68,68,0.18)', color: '#EF4444' }} />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                      {[c.object_address, c.city].filter(Boolean).join(' · ') || 'Объект не указан'}
                    </Typography>
                    {/* Задачи — компактные чипы */}
                    <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', mt: 1 }}>
                      {c.tasks.map(t => (
                        <Chip key={t.id} size="small"
                          icon={trackIcon(t.track)}
                          label={`${types.find(x => x.key === t.type)?.label || t.type}: ${STATUS_RU[t.status] || t.status}`}
                          sx={{ height: 22, fontSize: 11, background: `${statusColor(t.status)}1A`, color: statusColor(t.status), fontWeight: 600, '& .MuiChip-icon': { fontSize: 14 } }} />
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                      {new Date(c.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </Typography>
                    <Button size="small" sx={{ display: 'block', ml: 'auto', mt: 0.5, color: '#94A3B8', textTransform: 'none' }}>Открыть →</Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Большой диалог заявки */}
      <Dialog open={!!detail || detailLoading} onClose={() => { setDetail(null); load(); }} fullWidth maxWidth="md"
        slotProps={{ paper: { sx: { background: 'linear-gradient(135deg, #0F1629, #0A0E1A)', border: '1px solid rgba(201,168,76,0.15)', height: { md: '88vh' } } } }}>
        {detailLoading || !detail ? (
          <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress sx={{ color: '#C9A84C' }} /></Box>
        ) : (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{detail.client_name}</Typography>
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  {[detail.object_address, detail.city].filter(Boolean).join(' · ') || 'Объект не указан'}
                </Typography>
              </Box>
              <IconButton onClick={() => { setDetail(null); load(); }} sx={{ color: '#64748B' }}><CloseRoundedIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'rgba(201,168,76,0.08)', p: 0, overflow: { xs: 'auto', md: 'hidden' }, height: { md: 'calc(88vh - 80px)' } }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, height: { xs: 'auto', md: '100%' } }}>
                {/* ЛЕВАЯ — детали/задачи/файлы/история */}
                <Box sx={{ overflowY: { xs: 'visible', md: 'auto' }, p: { xs: 2, md: 3 }, borderRight: { md: '1px solid rgba(201,168,76,0.08)' } }}>
                  <Stack spacing={2.5}>
                    {detail.note && (
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Моё описание</Typography>
                        <Typography variant="body2" sx={{ color: '#E2E8F0', whiteSpace: 'pre-wrap', mt: 0.5 }}>{detail.note}</Typography>
                      </Box>
                    )}

                    {/* Задачи */}
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Задачи</Typography>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {detail.tasks.map(t => (
                          <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', p: 1.2, borderRadius: 1.5, background: 'rgba(255,255,255,0.02)' }}>
                            {trackIcon(t.track)}
                            <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 600, flex: '1 1 auto' }}>{types.find(x => x.key === t.type)?.label || t.type}</Typography>
                            <Chip label={STATUS_RU[t.status] || t.status} size="small"
                              sx={{ background: `${statusColor(t.status)}22`, color: statusColor(t.status), fontWeight: 700 }} />
                            <Typography variant="caption" sx={{ color: '#64748B', minWidth: 100, textAlign: 'right' }}>
                              {t.assignee_name ? t.assignee_name : 'ждёт специалиста'}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                      {!track && !detail.tasks.some(t => t.type === 'mortgage') && (
                        <Button size="small" startIcon={<AccountBalanceRoundedIcon />} onClick={() => handleAddTask(detail.id, 'mortgage')}
                          sx={{ mt: 1, color: '#8B5CF6', textTransform: 'none' }}>
                          Добавить ипотеку (брокер)
                        </Button>
                      )}
                    </Box>

                    <Divider sx={{ borderColor: 'rgba(201,168,76,0.08)' }} />

                    {/* Файлы — кнопка «Прикрепить» ИЛИ перетаскивание (drop) */}
                    <Box
                      onDragEnter={e => { e.preventDefault(); setDragDoc(true); }}
                      onDragOver={e => { e.preventDefault(); setDragDoc(true); }}
                      onDragLeave={e => { e.preventDefault(); if (e.currentTarget === e.target) setDragDoc(false); }}
                      onDrop={handleDocDrop}
                      sx={{ borderRadius: 1.5, p: dragDoc ? 1 : 0, border: `1px dashed ${dragDoc ? '#C9A84C' : 'transparent'}`, background: dragDoc ? 'rgba(201,168,76,0.06)' : 'transparent', transition: 'all .15s' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Файлы</Typography>
                        <Button component="label" size="small" disabled={uploading}
                          startIcon={uploading ? <CircularProgress size={14} /> : <AttachFileRoundedIcon />}
                          sx={{ color: '#C9A84C', textTransform: 'none' }}>
                          Прикрепить
                          <input type="file" hidden multiple onChange={handleUpload} />
                        </Button>
                      </Box>
                      {detail.attachments?.length === 0 ? (
                        <Typography variant="caption" sx={{ color: '#64748B' }}>Файлов пока нет. Перетащите файлы сюда или нажмите «Прикрепить».</Typography>
                      ) : (
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {detail.attachments.map(at => (
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

                    {/* Совместная сделка — доли комиссии (read-only, видно участникам) */}
                    {(detail.participants || []).length > 0 && (() => {
                      const ps = detail.participants || [];
                      const sumP = ps.reduce((s, p) => s + Number(p.share_pct || 0), 0);
                      const rows = [
                        { id: detail.agent_id, name: detail.agent_name || 'агент', share: Math.max(0, 100 - sumP), creator: true },
                        ...ps.map(p => ({ id: p.agent_id, name: p.agent_name || `агент #${p.agent_id}`, share: Number(p.share_pct || 0), creator: false })),
                      ];
                      return (
                        <>
                          <Divider sx={{ borderColor: 'rgba(201,168,76,0.08)' }} />
                          <Box>
                            <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', mb: 1 }}>Совместная сделка — доли</Typography>
                            <Stack spacing={0.5}>
                              {rows.map(r => {
                                const mine = r.id === myId;
                                return (
                                  <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: 1.5, background: mine ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.03)', border: mine ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent' }}>
                                    <Typography variant="body2" sx={{ color: mine ? '#E2C97E' : '#CBD5E1', fontWeight: mine ? 700 : 500 }}>
                                      {r.name}{r.creator ? ' · создатель' : ''}{mine ? ' (вы)' : ''}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: mine ? '#E2C97E' : '#94A3B8', fontWeight: 700 }}>{r.share}%</Typography>
                                  </Box>
                                );
                              })}
                            </Stack>
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.6 }}>
                              ВКД делится по долям; каждый агент — по своему % уровня. Ваша доля учитывается в вашем уровне и MLM.
                            </Typography>
                          </Box>
                        </>
                      );
                    })()}

                    <Divider sx={{ borderColor: 'rgba(201,168,76,0.08)' }} />

                    {/* История */}
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', mb: 1 }}>История</Typography>
                      <CaseTimeline caseId={detail.id} />
                    </Box>
                  </Stack>
                </Box>

                {/* ПРАВАЯ — чат во всю высоту. На мобильном грид-ячейка авто-высоты,
                    поэтому задаём minHeight, иначе fillHeight (height:100%) схлопывается
                    в 0 и поле ввода пропадает. */}
                <Box sx={{ display: 'flex', flexDirection: 'column', p: 2, minHeight: 0, borderTop: { xs: '1px solid rgba(201,168,76,0.08)', md: 'none' } }}>
                  <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', display: 'block', mb: 1 }}>Обсуждение со специалистом</Typography>
                  <Box sx={{ flex: 1, minHeight: { xs: 420, md: 0 } }}>
                    <Thread apiBase={`/cases/${detail.id}`} myId={myId} fillHeight emptyText="Сообщений пока нет. Напишите специалисту." />
                  </Box>
                </Box>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

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
              {formTypes.map(t => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
            </TextField>
            <TextField
              label={form.taskType === 'other' ? 'Что нужно от юриста' : 'Комментарий'}
              value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              fullWidth size="small" multiline minRows={2}
              required={form.taskType === 'other'}
              placeholder={form.taskType === 'other' ? 'Опишите задачу — например: вопрос по закрытию сделки' : undefined}
              helperText={form.taskType === 'other' ? 'Опишите, что нужно — юрист увидит это в заявке' : undefined} />
            <Box>
              <Button component="label" size="small" sx={{ color: '#C9A84C', textTransform: 'none' }}>
                Прикрепить документы
                <input type="file" hidden multiple onChange={e => setNewFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
              </Button>
              {newFiles.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {newFiles.map((f, i) => (
                    <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</Typography>
                      <Button size="small" onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))} sx={{ minWidth: 0, color: '#EF4444', p: 0.3 }}>✕</Button>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setOpen(false); setNewFiles([]); }} sx={{ color: '#64748B' }}>Отмена</Button>
          <Button variant="contained" disabled={saving || !form.clientName.trim() || !form.taskType || (form.taskType === 'other' && !form.note.trim())} onClick={handleCreate}
            sx={{ background: 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', fontWeight: 700 }}>
            {saving ? <CircularProgress size={18} sx={{ color: '#0A0E1A' }} /> : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
