import { useEffect, useRef, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Chip, Grid, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, IconButton, Alert, Tooltip,
  CircularProgress,
} from '@mui/material';
import { motion } from 'framer-motion';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import TelegramIcon from '@mui/icons-material/Telegram';
import InstagramIcon from '@mui/icons-material/Instagram';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import InputAdornment from '@mui/material/InputAdornment';
import { currentUser as mockUser, achievements as mockAchievements, type Achievement } from '../data/mockData';
import { fetchMe, getCurrentAgent } from '../auth/auth';
import { api, API_BASE_URL, getToken } from '../api/apiClient';
import ImageCropper from '../components/ImageCropper';
import { supportApi, type SupportTicketSummary, type SupportTicketFull } from '../api/support';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

// Аплоад файла в Yandex Storage через /api/upload — для вложений в тикеты поддержки.
async function uploadAttachment(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', 'doc');
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Ошибка загрузки (HTTP ${res.status})`);
  return data.url;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
}
import { dealsApi } from '../api/deals';
import { teamApi } from '../api/team';

type RawAch = { id: string; title: string; description: string; icon: string; tier: 'bronze'|'silver'|'gold'|'platinum'; trigger_type: string; threshold: number; active: number };

// Вычисляет earned-флаг и (приблизительную) дату заработка на основе реальных данных.
function computeEarned(
  def: RawAch,
  ctx: { totalDeals: number; yearDeals: number; lifetimeCommission: number; yearCommission: number; currentLevel: 1|2|3; l1Size: number; teamSize: number },
): { earned: boolean; date: string } {
  const today = new Date().toISOString().slice(0, 10);
  let earned = false;
  switch (def.trigger_type) {
    case 'first_deal':           earned = ctx.totalDeals >= def.threshold; break;
    case 'first_agent_invited':  earned = ctx.l1Size >= def.threshold; break;
    case 'commission_year':      earned = ctx.yearCommission >= def.threshold; break;
    case 'level_reached':        earned = ctx.currentLevel >= def.threshold; break;
    case 'team_l1_size':         earned = ctx.l1Size >= def.threshold; break;
    case 'deals_year':           earned = ctx.yearDeals >= def.threshold; break;
    case 'commission_total':     earned = ctx.lifetimeCommission >= def.threshold; break;
  }
  return { earned, date: earned ? today : '' };
}

const tierColor: Record<string, { bg: string; ring: string; text: string }> = {
  bronze:   { bg: 'rgba(180,83,9,0.15)',    ring: 'rgba(217,119,6,0.4)',  text: '#D97706' },
  silver:   { bg: 'rgba(148,163,184,0.15)', ring: 'rgba(148,163,184,0.4)', text: '#94A3B8' },
  gold:     { bg: 'rgba(201,168,76,0.18)',  ring: 'rgba(201,168,76,0.5)', text: '#C9A84C' },
  platinum: { bg: 'rgba(168,85,247,0.15)',  ring: 'rgba(168,85,247,0.4)', text: '#A855F7' },
};

export default function Profile() {
  const [editOpen, setEditOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  // Загружаем актуального юзера с бэка (на старте + после save).
  const [user, setUser] = useState<Record<string, unknown> | null>(() => getCurrentAgent());
  useEffect(() => {
    fetchMe().then(u => { if (u) setUser(u); });
  }, []);

  // Данные для расчёта ачивок: сделки + размер L1 команды.
  const [achievements, setAchievements] = useState<Achievement[]>(mockAchievements);
  useEffect(() => {
    let cancelled = false;
    const me = getCurrentAgent();
    const meId = typeof me?.id === 'number' ? me.id : undefined;
    Promise.all([
      api.get<RawAch[]>('/api/achievements').catch(() => [] as RawAch[]),
      dealsApi.list({ agentId: meId }).catch(() => []),
      teamApi.get().catch(() => ({ levels: [] as Array<{ level: number; count: number }>, totals: { agents: 0 } })),
    ]).then(([defs, deals, team]) => {
      if (cancelled || !defs.length) return;
      const currentYear = String(new Date().getFullYear());
      const yearDeals  = deals.filter(d => d.date?.startsWith(currentYear));
      const yearVkd    = yearDeals.reduce((s, d) => s + d.vkd, 0);
      const yearComm   = yearDeals.reduce((s, d) => s + d.income, 0);
      const lifetimeComm = deals.reduce((s, d) => s + d.income, 0);
      const currentLevel: 1|2|3 = yearVkd >= 5_000_000 ? 3 : yearVkd >= 2_000_000 ? 2 : 1;
      const l1 = team.levels?.find(l => l.level === 1)?.count || 0;
      const ctx = { totalDeals: deals.length, yearDeals: yearDeals.length, lifetimeCommission: lifetimeComm, yearCommission: yearComm, currentLevel, l1Size: l1, teamSize: team.totals?.agents || 0 };
      const computed: Achievement[] = defs.filter(d => d.active).map(d => {
        const r = computeEarned(d, ctx);
        return { id: d.id, title: d.title, description: d.description, icon: d.icon, tier: d.tier, earned: r.earned, date: r.date };
      });
      setAchievements(computed);
    });
    return () => { cancelled = true; };
  }, []);

  // currentUser — единая точка для всех ссылок: реальный юзер если загружен, иначе mock.
  // Бэк отдаёт join_date (snake_case) — нормализуем в joinDate чтобы перезаписать
  // mock-значение (иначе UI показывал «март 2024» вместо реальной даты).
  const rawUser = (user || {}) as Record<string, unknown>;
  const normalizedJoinDate = rawUser.joinDate ?? rawUser.join_date;
  const currentUser = {
    ...(mockUser as Record<string, unknown>),
    ...rawUser,
    ...(normalizedJoinDate ? { joinDate: normalizedJoinDate } : {}),
  } as typeof mockUser;

  const daysAt = (() => {
    if (!currentUser.joinDate) return 0;
    const ms = Date.now() - new Date(currentUser.joinDate).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  })();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '',
    specialization: '',
    bio: '',
    photo: '' as string | null,
    telegram: '', telegramChannel: '', instagram: '', vk: '', max: '',
  });
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);

  // Заливка обрезанного фото в Yandex Object Storage через /api/upload?type=avatar.
  const uploadPhotoBlob = async (blob: Blob, name: string) => {
    setSaveError(null);
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', blob, name);
      fd.append('type', 'avatar');
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Ошибка загрузки (HTTP ${res.status})`);
      }
      setForm(f => ({ ...f, photo: data.url }));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Не удалось загрузить фото');
    } finally {
      setPhotoUploading(false);
    }
  };

  // При выборе файла — открываем кропер вместо прямой загрузки.
  const handlePhotoFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setSaveError('Файл слишком большой (макс 10 МБ — оригинал до обрезки).');
      return;
    }
    setSaveError(null);
    setPhotoToCrop(file);
  };

  // Когда user пришёл с бэка — синхронизируем форму.
  useEffect(() => {
    if (!user) return;
    setForm({
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone || '',
      city: currentUser.city || '',
      specialization: (currentUser.specialization || []).join(', '),
      bio: (currentUser as { bio?: string }).bio || '',
      photo: (currentUser as { photo?: string | null }).photo || '',
      telegram: currentUser.socials?.telegram || '',
      telegramChannel: currentUser.socials?.telegramChannel || '',
      instagram: currentUser.socials?.instagram || '',
      vk: currentUser.socials?.vk || '',
      max: currentUser.socials?.max || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [supportForm, setSupportForm] = useState({ topic: '', message: '' });

  // Берём реальную ссылку из БД (поле referral_link у агента). Если её ещё нет —
  // показываем заглушку с просьбой обратиться к админу.
  const referralLink = (user as { referral_link?: string; referralLink?: string } | null)?.referral_link
    || (user as { referralLink?: string } | null)?.referralLink
    || '';

  const handleSave = async () => {
    if (!user || typeof user.id !== 'number') { setSaveError('Профиль не загружен'); return; }
    setSaveError(null);
    try {
      const updated = await api.patch<Record<string, unknown>>(`/api/agents/${user.id}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        photo: form.photo || null,
        bio: form.bio,
        specialization: form.specialization.split(',').map(s => s.trim()).filter(Boolean),
        socials: {
          telegram: form.telegram || undefined,
          telegramChannel: form.telegramChannel || undefined,
          instagram: form.instagram || undefined,
          vk: form.vk || undefined,
          max: form.max || undefined,
        },
      });
      // Приводим snake_case → camelCase минимально для использования в Profile.
      const normalized = {
        ...updated,
        joinDate: (updated as { join_date?: string }).join_date ?? currentUser.joinDate,
      };
      setUser(normalized);
      // Обновляем localStorage чтобы Header и т.д. подхватили новые данные.
      localStorage.setItem('w24_agent_user', JSON.stringify({ ...normalized, loginAt: new Date().toISOString() }));
      setSaved(true); setEditOpen(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить');
    }
  };

  // === Тикеты поддержки ===
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [openTicket, setOpenTicket] = useState<SupportTicketFull | null>(null);
  const [openTicketLoading, setOpenTicketLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAtts, setReplyAtts] = useState<string[]>([]);
  const [newAtts, setNewAtts] = useState<string[]>([]);
  const [uploadingAtt, setUploadingAtt] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const replyAttachInputRef = useRef<HTMLInputElement | null>(null);

  const handleAttachPick = async (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'reply') => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSupportError(null);
    setUploadingAtt(true);
    try {
      const url = await uploadAttachment(file);
      if (target === 'new') setNewAtts(prev => [...prev, url]);
      else setReplyAtts(prev => [...prev, url]);
    } catch (err) {
      setSupportError(err instanceof Error ? err.message : 'Не удалось загрузить файл');
    } finally {
      setUploadingAtt(false);
    }
  };

  const loadTickets = async () => {
    setTicketsLoading(true);
    try { setTickets(await supportApi.list()); }
    catch { /* tolerate */ }
    finally { setTicketsLoading(false); }
  };
  useEffect(() => { if (supportOpen) loadTickets(); }, [supportOpen]);

  const handleSupportSend = async () => {
    if (!supportForm.topic.trim() || !supportForm.message.trim()) return;
    setSubmittingTicket(true);
    setSupportError(null);
    try {
      await supportApi.create(supportForm.topic.trim(), supportForm.message.trim(), newAtts);
      setSupportForm({ topic: '', message: '' });
      setNewAtts([]);
      setSent(true);
      setTimeout(() => setSent(false), 2500);
      await loadTickets();
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const openExistingTicket = async (id: number) => {
    setOpenTicketLoading(true);
    try { setOpenTicket(await supportApi.get(id)); }
    catch (e) { setSupportError(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setOpenTicketLoading(false); }
  };

  const sendReply = async () => {
    if (!openTicket) return;
    if (!replyText.trim() && replyAtts.length === 0) return;
    setSubmittingTicket(true);
    try {
      const updated = await supportApi.reply(openTicket.id, replyText.trim(), replyAtts);
      setOpenTicket(updated);
      setReplyText('');
      setReplyAtts([]);
      await loadTickets();
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(referralLink);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 1800);
  };

  const earned = achievements.filter(a => a.earned);
  const locked = achievements.filter(a => !a.earned);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Left column: avatar + contacts + actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
            <Card sx={{ mb: 3, textAlign: 'center', overflow: 'visible', position: 'relative' }}>
              <Box sx={{ height: 80, background: 'linear-gradient(135deg, rgba(201,168,76,0.3) 0%, rgba(67,97,238,0.2) 100%)', borderRadius: '16px 16px 0 0', position: 'relative' }}>
                <Box sx={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)' }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar src={currentUser.photo || undefined} sx={{ width: 80, height: 80, fontSize: 26, fontWeight: 900, background: currentUser.photo ? '#0F1629' : 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', border: '4px solid #0F1629', boxShadow: '0 8px 32px rgba(201,168,76,0.4)' }}>
                      {!currentUser.photo && (currentUser.name || '').split(' ').map(n => n[0]).slice(0,2).join('')}
                    </Avatar>
                    <Tooltip title="Загрузить фото">
                      <IconButton
                        size="small"
                        onClick={() => setEditOpen(true)}
                        sx={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 28, height: 28,
                          background: '#C9A84C', color: '#0A0E1A',
                          border: '2px solid #0F1629',
                          '&:hover': { background: '#E2C97E' },
                        }}
                      >
                        <PhotoCameraRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
              <CardContent sx={{ pt: 7, pb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9', lineHeight: 1.3 }}>{currentUser.name}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1, mb: 2 }}>
                  <Chip label={`Уровень ${currentUser.level}`} size="small" sx={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', fontWeight: 700 }} />
                  <Chip label={`${currentUser.commission}%`} size="small" sx={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontWeight: 700 }} />
                </Box>
                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.08)' }} />
                {[
                  { icon: <EmailRoundedIcon sx={{ fontSize: 16 }} />, value: currentUser.email },
                  { icon: <PhoneRoundedIcon sx={{ fontSize: 16 }} />, value: currentUser.phone },
                  { icon: <LocationOnRoundedIcon sx={{ fontSize: 16 }} />, value: currentUser.city },
                  { icon: <CalendarTodayRoundedIcon sx={{ fontSize: 16 }} />, value: `В Welcome 24 с ${new Date(currentUser.joinDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })} · ${daysAt} дн.` },
                ].map(({ icon, value }) => (
                  <Box key={value} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 1 }}>
                    <Box sx={{ color: '#64748B', flexShrink: 0 }}>{icon}</Box>
                    <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'left' }}>{value}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.08)' }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 1 }}>Специализация</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {currentUser.specialization.map(s => (
                      <Chip key={s} label={s} size="small" sx={{ background: 'rgba(67,97,238,0.12)', color: '#4361EE', fontWeight: 600 }} />
                    ))}
                  </Box>
                </Box>
                {/* Socials */}
                {(currentUser.socials?.telegram || currentUser.socials?.telegramChannel || currentUser.socials?.instagram || currentUser.socials?.vk || currentUser.socials?.max) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 1 }}>Соцсети</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {currentUser.socials?.telegram && (
                        <Tooltip title={`@${currentUser.socials.telegram}`}>
                          <IconButton size="small" component="a" href={`https://t.me/${currentUser.socials.telegram}`} target="_blank" rel="noopener"
                            sx={{ color: '#229ED9', background: 'rgba(34,158,217,0.1)', border: '1px solid rgba(34,158,217,0.2)', '&:hover': { background: 'rgba(34,158,217,0.2)' } }}>
                            <TelegramIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {currentUser.socials?.telegramChannel && (
                        <Tooltip title={`Канал ${currentUser.socials.telegramChannel}`}>
                          <IconButton size="small" component="a" href={`https://t.me/${currentUser.socials.telegramChannel.replace('@', '')}`} target="_blank" rel="noopener"
                            sx={{ color: '#229ED9', background: 'rgba(34,158,217,0.1)', border: '1px solid rgba(34,158,217,0.2)', '&:hover': { background: 'rgba(34,158,217,0.2)' } }}>
                            <CampaignRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {currentUser.socials?.instagram && (
                        <Tooltip title={`@${currentUser.socials.instagram}`}>
                          <IconButton size="small" component="a" href={`https://instagram.com/${currentUser.socials.instagram}`} target="_blank" rel="noopener"
                            sx={{ color: '#E4405F', background: 'rgba(228,64,95,0.1)', border: '1px solid rgba(228,64,95,0.2)', '&:hover': { background: 'rgba(228,64,95,0.2)' } }}>
                            <InstagramIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {currentUser.socials?.vk && (
                        <Tooltip title={`vk.com/${currentUser.socials.vk}`}>
                          <IconButton size="small" component="a" href={`https://vk.com/${currentUser.socials.vk}`} target="_blank" rel="noopener"
                            sx={{ color: '#0077FF', background: 'rgba(0,119,255,0.1)', border: '1px solid rgba(0,119,255,0.2)', '&:hover': { background: 'rgba(0,119,255,0.2)' } }}>
                            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.13C2 20.67 3.33 22 8.93 22h6.13c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.07 14.27h-1.45c-.55 0-.72-.44-1.71-1.42-.86-.84-1.23-.94-1.45-.94-.3 0-.39.09-.39.51v1.31c0 .36-.12.58-1.07.58-1.59 0-3.35-.96-4.59-2.76-1.86-2.61-2.37-4.57-2.37-4.97 0-.22.09-.42.51-.42h1.45c.38 0 .52.17.66.58.71 2.07 1.91 3.88 2.4 3.88.18 0 .27-.09.27-.55v-2.13c-.06-.98-.58-1.07-.58-1.42 0-.17.14-.34.36-.34h2.28c.32 0 .43.17.43.55v2.87c0 .32.14.43.23.43.18 0 .33-.11.66-.44 1.02-1.14 1.74-2.9 1.74-2.9.09-.21.26-.4.64-.4h1.45c.44 0 .53.22.44.55-.18.85-1.96 3.36-1.96 3.36-.15.24-.21.36 0 .64.15.21.66.65 1 1.04.62.71 1.1 1.31 1.23 1.72.12.42-.09.62-.51.62z" /></svg>
                          </IconButton>
                        </Tooltip>
                      )}
                      {currentUser.socials?.max && (
                        <Tooltip title={`MAX: ${currentUser.socials.max}`}>
                          <IconButton size="small" component="a" href={`https://max.ru/${currentUser.socials.max.replace('@', '')}`} target="_blank" rel="noopener"
                            sx={{ color: '#7C3AED', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', '&:hover': { background: 'rgba(124,58,237,0.2)' } }}>
                            <ChatRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                )}
                <Button
                  variant="outlined" startIcon={<EditRoundedIcon />} fullWidth
                  onClick={() => setEditOpen(true)}
                  sx={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C', fontWeight: 700, '&:hover': { borderColor: '#C9A84C', background: 'rgba(201,168,76,0.06)' } }}
                >
                  Редактировать профиль
                </Button>
              </CardContent>
            </Card>

            {/* Referral card */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 1.5 }}>Реферальная ссылка</Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1.5 }}>
                  Приглашайте агентов и получайте бонусы с их сделок
                </Typography>
                {referralLink ? (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    p: 1.2, borderRadius: 2,
                    background: 'rgba(201,168,76,0.05)',
                    border: '1px dashed rgba(201,168,76,0.25)',
                  }}>
                    <Typography variant="caption" sx={{ flex: 1, color: '#C9A84C', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {referralLink}
                    </Typography>
                    <Tooltip title={refCopied ? 'Скопировано!' : 'Скопировать'}>
                      <IconButton size="small" onClick={handleCopyRef} sx={{ color: refCopied ? '#22C55E' : '#64748B' }}>
                        {refCopied ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : (
                  <Box sx={{
                    p: 1.5, borderRadius: 2,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px dashed rgba(245,158,11,0.3)',
                  }}>
                    <Typography variant="caption" sx={{ color: '#F59E0B' }}>
                      Реферальная ссылка ещё не привязана. Обратитесь к администратору.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'rgba(67,97,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SupportAgentRoundedIcon sx={{ color: '#4361EE', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Техподдержка</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Ответим в течение часа</Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained" fullWidth
                  onClick={() => setSupportOpen(true)}
                  sx={{ background: 'linear-gradient(135deg, #4361EE, #6B80F5)', color: '#fff', fontWeight: 700, '&:hover': { boxShadow: '0 6px 20px rgba(67,97,238,0.35)' } }}
                >
                  Написать в поддержку
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Right column: ALL achievements */}
        <Grid size={{ xs: 12, md: 8 }}>
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Достижения</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>{earned.length} из {achievements.length} получено</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, borderRadius: 2, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <EmojiEventsRoundedIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#C9A84C' }}>{Math.round(earned.length / achievements.length * 100)}%</Typography>
                  </Box>
                </Box>

                {/* Earned */}
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>Получено</Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {earned.map((ach, i) => {
                    const c = tierColor[ach.tier];
                    return (
                      <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={ach.id}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                          <Tooltip title={ach.description} placement="top">
                            <Box sx={{
                              p: 2, borderRadius: 3, textAlign: 'center', cursor: 'default',
                              background: `linear-gradient(135deg, ${c.bg} 0%, transparent 100%)`,
                              border: `1px solid ${c.ring}`,
                              position: 'relative',
                            }}>
                              <Box sx={{ fontSize: 36 }}>{ach.icon}</Box>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: c.text, display: 'block', lineHeight: 1.3, mt: 0.5 }}>
                                {ach.title}
                              </Typography>
                              {ach.date && (
                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10, display: 'block' }}>
                                  {new Date(ach.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                </Typography>
                              )}
                              <Chip label={ach.tier.toUpperCase()} size="small" sx={{
                                position: 'absolute', top: 6, right: 6,
                                height: 16, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                                background: c.ring, color: c.text,
                              }} />
                            </Box>
                          </Tooltip>
                        </motion.div>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* Locked */}
                {locked.length > 0 && (
                  <>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>Заблокировано</Typography>
                    <Grid container spacing={2}>
                      {locked.map((ach, i) => {
                        const c = tierColor[ach.tier];
                        return (
                          <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={ach.id}>
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.55, scale: 1 }} transition={{ delay: 0.2 + i * 0.04 }}>
                              <Tooltip title={ach.description} placement="top">
                                <Box sx={{
                                  p: 2, borderRadius: 3, textAlign: 'center', cursor: 'default',
                                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                                  filter: 'grayscale(0.7)',
                                  '&:hover': { filter: 'grayscale(0.3)', opacity: 1 },
                                  transition: 'all 0.2s',
                                }}>
                                  <Box sx={{ fontSize: 36, opacity: 0.6 }}>{ach.icon}</Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', lineHeight: 1.3, mt: 0.5 }}>
                                    {ach.title}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#475569', fontSize: 10, display: 'block' }}>🔒 {ach.tier}</Typography>
                                </Box>
                              </Tooltip>
                            </motion.div>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Toast: saved */}
      {saved && (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'fixed', top: 100, right: 32, zIndex: 1500 }}>
          <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ borderRadius: 2, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
            Профиль успешно обновлён
          </Alert>
        </motion.div>
      )}
      {sent && (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'fixed', top: 100, right: 32, zIndex: 1500 }}>
          <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ borderRadius: 2, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
            Обращение отправлено в техподдержку
          </Alert>
        </motion.div>
      )}

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#F1F5F9' }}>Редактировать профиль</Typography>
          <IconButton size="small" onClick={() => setEditOpen(false)} sx={{ color: '#64748B' }}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)' }} />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar src={form.photo || undefined} sx={{ width: 64, height: 64, background: form.photo ? '#0F1629' : 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', fontWeight: 900, fontSize: 22 }}>
                {!form.photo && (form.name || '').split(' ').map(n => n[0]).slice(0,2).join('')}
              </Avatar>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handlePhotoFile(e.target.files?.[0] || null)}
              />
              <Stack spacing={0.8}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraRoundedIcon />}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  sx={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C', fontSize: 12 }}
                >
                  {photoUploading ? 'Загрузка…' : (form.photo ? 'Заменить фото' : 'Загрузить фото')}
                </Button>
                {form.photo && (
                  <Button size="small" onClick={() => setForm(f => ({ ...f, photo: '' }))} sx={{ color: '#EF4444', fontSize: 11 }}>
                    Убрать фото
                  </Button>
                )}
              </Stack>
            </Box>
            <TextField
              fullWidth size="small" label="URL фото (или загрузи файл выше)"
              value={form.photo || ''}
              onChange={e => setForm(f => ({ ...f, photo: e.target.value }))}
              placeholder="https://example.com/photo.jpg"
            />
            <TextField fullWidth size="small" label="ФИО" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <TextField
              fullWidth size="small" label="О себе" multiline rows={3}
              value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Короткое описание для публичной карточки в базе агентов"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <TextField fullWidth size="small" label="Телефон" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </Box>
            <TextField fullWidth size="small" label="Город" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <TextField fullWidth size="small" label="Специализация (через запятую)" value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} />

            <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)', my: 1 }}>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>СОЦСЕТИ И МЕССЕНДЖЕРЫ</Typography>
            </Divider>
            <TextField
              fullWidth size="small" label="Telegram"
              value={form.telegram} onChange={e => setForm(f => ({ ...f, telegram: e.target.value.replace(/^@/, '') }))}
              placeholder="username"
              slotProps={{ input: {
                startAdornment: <InputAdornment position="start"><TelegramIcon sx={{ color: '#229ED9', fontSize: 18 }} /></InputAdornment>,
                ...(form.telegram ? { startAdornment: <InputAdornment position="start"><TelegramIcon sx={{ color: '#229ED9', fontSize: 18 }} /><Typography sx={{ color: '#64748B', ml: 0.5, fontSize: 14 }}>@</Typography></InputAdornment> } : {}),
              } }}
            />
            <TextField
              fullWidth size="small" label="Telegram-канал"
              value={form.telegramChannel} onChange={e => setForm(f => ({ ...f, telegramChannel: e.target.value }))}
              placeholder="@yourchannel"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><CampaignRoundedIcon sx={{ color: '#229ED9', fontSize: 18 }} /></InputAdornment> } }}
            />
            <TextField
              fullWidth size="small" label="Instagram"
              value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value.replace(/^@/, '') }))}
              placeholder="username"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><InstagramIcon sx={{ color: '#E4405F', fontSize: 18 }} /></InputAdornment> } }}
            />
            <TextField
              fullWidth size="small" label="ВКонтакте"
              value={form.vk} onChange={e => setForm(f => ({ ...f, vk: e.target.value.replace(/^https?:\/\/vk\.com\//, '') }))}
              placeholder="username или id"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Box sx={{ color: '#0077FF', display: 'flex' }}><svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.13C2 20.67 3.33 22 8.93 22h6.13c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.07 14.27h-1.45c-.55 0-.72-.44-1.71-1.42-.86-.84-1.23-.94-1.45-.94-.3 0-.39.09-.39.51v1.31c0 .36-.12.58-1.07.58-1.59 0-3.35-.96-4.59-2.76-1.86-2.61-2.37-4.57-2.37-4.97 0-.22.09-.42.51-.42h1.45c.38 0 .52.17.66.58.71 2.07 1.91 3.88 2.4 3.88.18 0 .27-.09.27-.55v-2.13c-.06-.98-.58-1.07-.58-1.42 0-.17.14-.34.36-.34h2.28c.32 0 .43.17.43.55v2.87c0 .32.14.43.23.43.18 0 .33-.11.66-.44 1.02-1.14 1.74-2.9 1.74-2.9.09-.21.26-.4.64-.4h1.45c.44 0 .53.22.44.55-.18.85-1.96 3.36-1.96 3.36-.15.24-.21.36 0 .64.15.21.66.65 1 1.04.62.71 1.1 1.31 1.23 1.72.12.42-.09.62-.51.62z" /></svg></Box></InputAdornment> } }}
            />
            <TextField
              fullWidth size="small" label="MAX мессенджер"
              value={form.max} onChange={e => setForm(f => ({ ...f, max: e.target.value.replace(/^@/, '') }))}
              placeholder="username"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><ChatRoundedIcon sx={{ color: '#7C3AED', fontSize: 18 }} /></InputAdornment> } }}
            />
          </Stack>
          {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: '#64748B' }}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || !form.email.trim()}>
            Сохранить изменения
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image cropper for avatar */}
      <ImageCropper
        file={photoToCrop}
        aspect={1}
        open={!!photoToCrop}
        onClose={() => { setPhotoToCrop(null); if (photoInputRef.current) photoInputRef.current.value = ''; }}
        onApply={(blob, name) => {
          setPhotoToCrop(null);
          uploadPhotoBlob(blob, name);
        }}
      />

      {/* Support dialog: список тикетов + форма нового запроса */}
      <Dialog open={supportOpen} onClose={() => { setSupportOpen(false); setOpenTicket(null); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#F1F5F9' }}>
              {openTicket ? openTicket.subject : 'Техподдержка'}
            </Typography>
            {openTicket && (
              <Button size="small" onClick={() => setOpenTicket(null)} sx={{ color: '#64748B', fontSize: 11, p: 0, minHeight: 0, mt: 0.3 }}>
                ← к списку запросов
              </Button>
            )}
          </Box>
          <IconButton size="small" onClick={() => { setSupportOpen(false); setOpenTicket(null); }} sx={{ color: '#64748B' }}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)' }} />
        <DialogContent sx={{ pt: 2 }}>
          {supportError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSupportError(null)}>{supportError}</Alert>}

          {openTicket ? (
            <Stack spacing={1.5}>
              {openTicketLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: '#C9A84C' }} /></Box>
              ) : openTicket.messages.map(m => {
                const isMe = m.author_role === 'agent';
                return (
                  <Box key={m.id} sx={{
                    p: 1.8, borderRadius: 2,
                    background: isMe ? 'rgba(201,168,76,0.05)' : 'rgba(67,97,238,0.06)',
                    border: isMe ? '1px solid rgba(201,168,76,0.15)' : '1px solid rgba(67,97,238,0.18)',
                  }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
                        {isMe ? 'Вы' : m.author_name}
                      </Typography>
                      {!isMe && <Typography variant="caption" sx={{ color: '#4361EE', fontSize: 10, fontWeight: 700 }}>· ПОДДЕРЖКА</Typography>}
                      <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                        {new Date(m.created_at.replace(' ', 'T') + 'Z').toLocaleString('ru-RU')}
                      </Typography>
                    </Box>
                    {m.text && <Typography variant="body2" sx={{ color: '#CBD5E1', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</Typography>}
                    {m.attachments && m.attachments.length > 0 && (
                      <Box sx={{ mt: m.text ? 1 : 0, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {m.attachments.map((url, i) => (
                          isImageUrl(url) ? (
                            <Box key={i} component="a" href={url} target="_blank" rel="noopener" sx={{ display: 'block' }}>
                              <Box component="img" src={url}
                                sx={{ maxWidth: 160, maxHeight: 120, borderRadius: 1.5, border: '1px solid rgba(201,168,76,0.2)', cursor: 'zoom-in', '&:hover': { border: '1px solid #C9A84C' } }}
                              />
                            </Box>
                          ) : (
                            <Box key={i} component="a" href={url} target="_blank" rel="noopener"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 1, background: 'rgba(67,97,238,0.12)', color: '#60A5FA', textDecoration: 'none', fontSize: 12 }}>
                              <AttachFileRoundedIcon sx={{ fontSize: 14 }} />
                              Файл {i + 1}
                            </Box>
                          )
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
              {openTicket.status !== 'closed' && (
                <Box sx={{ mt: 2 }}>
                  {replyAtts.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      {replyAtts.map((url, i) => (
                        <Box key={i} sx={{ position: 'relative', display: 'inline-block' }}>
                          {isImageUrl(url)
                            ? <Box component="img" src={url} sx={{ maxWidth: 80, maxHeight: 80, borderRadius: 1, border: '1px solid rgba(201,168,76,0.3)' }} />
                            : <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, background: 'rgba(67,97,238,0.12)', color: '#60A5FA', fontSize: 11 }}>Файл {i + 1}</Box>
                          }
                          <IconButton size="small" onClick={() => setReplyAtts(prev => prev.filter((_, idx) => idx !== i))}
                            sx={{ position: 'absolute', top: -8, right: -8, background: 'rgba(0,0,0,0.7)', color: '#fff', width: 18, height: 18, '&:hover': { background: '#EF4444' } }}>
                            <DeleteOutlineRoundedIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <input ref={replyAttachInputRef} type="file" accept="image/*,.pdf"
                      onChange={e => handleAttachPick(e, 'reply')} style={{ display: 'none' }} />
                    <Tooltip title="Прикрепить файл (скрин/pdf)">
                      <IconButton onClick={() => replyAttachInputRef.current?.click()} disabled={uploadingAtt}
                        sx={{ color: '#94A3B8', '&:hover': { color: '#C9A84C' } }}>
                        <AttachFileRoundedIcon />
                      </IconButton>
                    </Tooltip>
                    <TextField fullWidth size="small" multiline maxRows={5}
                      placeholder="Ваше сообщение…"
                      value={replyText} onChange={e => setReplyText(e.target.value)}
                    />
                    <Button variant="contained" onClick={sendReply} disabled={(!replyText.trim() && replyAtts.length === 0) || submittingTicket}>
                      Отправить
                    </Button>
                  </Box>
                </Box>
              )}
              {openTicket.status === 'closed' && (
                <Alert severity="info">Запрос закрыт. Создайте новый, если есть вопросы.</Alert>
              )}
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(67,97,238,0.06)', border: '1px solid rgba(67,97,238,0.18)' }}>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  Создайте новый запрос или продолжите старый из списка ниже. Ответ получите в этом же окне и в уведомлениях.
                </Typography>
              </Box>

              {/* Форма создания нового тикета */}
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Новый запрос</Typography>
                <TextField fullWidth size="small" label="Тема"
                  value={supportForm.topic} onChange={e => setSupportForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="Например, не получается занести сделку" />
                <TextField fullWidth multiline rows={4} label="Сообщение"
                  value={supportForm.message} onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Опишите подробно ваш вопрос" />
                {newAtts.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {newAtts.map((url, i) => (
                      <Box key={i} sx={{ position: 'relative', display: 'inline-block' }}>
                        {isImageUrl(url)
                          ? <Box component="img" src={url} sx={{ maxWidth: 100, maxHeight: 100, borderRadius: 1, border: '1px solid rgba(201,168,76,0.3)' }} />
                          : <Box sx={{ px: 1.5, py: 0.8, borderRadius: 1, background: 'rgba(67,97,238,0.12)', color: '#60A5FA', fontSize: 12 }}>Файл {i + 1}</Box>
                        }
                        <IconButton size="small" onClick={() => setNewAtts(prev => prev.filter((_, idx) => idx !== i))}
                          sx={{ position: 'absolute', top: -8, right: -8, background: 'rgba(0,0,0,0.7)', color: '#fff', width: 20, height: 20, '&:hover': { background: '#EF4444' } }}>
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input ref={attachInputRef} type="file" accept="image/*,.pdf"
                    onChange={e => handleAttachPick(e, 'new')} style={{ display: 'none' }} />
                  <Button size="small" startIcon={<AttachFileRoundedIcon />}
                    onClick={() => attachInputRef.current?.click()} disabled={uploadingAtt}
                    sx={{ color: '#94A3B8' }}>
                    {uploadingAtt ? 'Загрузка…' : 'Прикрепить файл'}
                  </Button>
                  <Button variant="contained" onClick={handleSupportSend}
                    disabled={!supportForm.topic.trim() || !supportForm.message.trim() || submittingTicket}
                    sx={{ background: 'linear-gradient(135deg, #4361EE, #6B80F5)' }}
                  >
                    {submittingTicket ? 'Отправка…' : 'Отправить запрос'}
                  </Button>
                </Box>
              </Stack>

              {/* История тикетов */}
              <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Мои запросы</Typography>
              {ticketsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
              ) : tickets.length === 0 ? (
                <Typography variant="caption" sx={{ color: '#64748B', fontStyle: 'italic' }}>Запросов пока не было</Typography>
              ) : (
                <Stack spacing={1}>
                  {tickets.map(t => {
                    const statusCfg = {
                      open:    { label: 'Ожидает ответа', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
                      replied: { label: 'Есть ответ',     color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
                      closed:  { label: 'Закрыт',         color: '#94A3B8', bg: 'rgba(100,116,139,0.12)' },
                    }[t.status];
                    return (
                      <Box key={t.id}
                        onClick={() => openExistingTicket(t.id)}
                        sx={{ p: 1.5, borderRadius: 2, cursor: 'pointer',
                          background: 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          '&:hover': { background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)' },
                        }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>{t.subject}</Typography>
                            {t.last_message && (
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.last_message}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                            <Box sx={{ display: 'inline-block', px: 1, py: 0.2, borderRadius: 1, background: statusCfg.bg, color: statusCfg.color, fontSize: 10, fontWeight: 700 }}>
                              {statusCfg.label}
                            </Box>
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: 10, mt: 0.3 }}>
                              {new Date(t.updated_at.replace(' ', 'T') + 'Z').toLocaleDateString('ru-RU')}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
