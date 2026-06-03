import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Grid, TextField, InputAdornment,
  Select, MenuItem, alpha, IconButton, Tooltip, Dialog, DialogContent, Divider, Button, Rating,
  CircularProgress, Alert,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { PageSkeleton } from '../components/States';
import SmartAvatar from '../components/SmartAvatar';
import { useAgents } from '../api/queries';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import TelegramIcon from '@mui/icons-material/Telegram';
import InstagramIcon from '@mui/icons-material/Instagram';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { currentUser, type AgentBaseRecord, type AgentReview } from '../data/mockData';
import { agentsApi } from '../api/agents';
import { getCurrentAgent } from '../auth/auth';
import type { Agent } from '../types/api';

const dirColors: Record<string, string> = {
  'Жилая': '#4361EE',
  'Коммерческая': '#F59E0B',
  'Загородная': '#22C55E',
};
const directions = ['Все направления', 'Жилая', 'Коммерческая', 'Загородная'];

function pluralDeals(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'сделка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сделки';
  return 'сделок';
}

type BaseRecord = AgentBaseRecord & { reviewsCount: number };

/** Адаптер: бэковый Agent → формат базы агентов на портале. */
function toBaseRecord(a: Agent): BaseRecord {
  const primary = a.specialization.length > 0 ? a.specialization : ['Жилая'];
  return {
    id: a.id,
    name: a.name,
    city: a.city,
    primaryDir: primary,
    secondaryDir: [],
    deals: a.yearDeals,
    experienceYears: a.experienceYears,
    phone: a.phone,
    photo: a.photo,
    socials: a.socials,
    bio: a.bio,
    rating: a.rating,
    reviews: [], // загружаются лениво при открытии карточки
    reviewsCount: a.reviewsCount,
  };
}

const selectSx = {
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(201,168,76,0.2)' },
  '& .MuiSelect-select': { color: '#F1F5F9' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(201,168,76,0.4)' },
  borderRadius: 3,
};

// VK icon — MUI doesn't have it, render as SVG
const VkIcon = ({ fontSize = 'small' as 'small' | 'medium' }) => (
  <svg width={fontSize === 'small' ? 18 : 22} height={fontSize === 'small' ? 18 : 22} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.13C2 20.67 3.33 22 8.93 22h6.13c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.07 14.27h-1.45c-.55 0-.72-.44-1.71-1.42-.86-.84-1.23-.94-1.45-.94-.3 0-.39.09-.39.51v1.31c0 .36-.12.58-1.07.58-1.59 0-3.35-.96-4.59-2.76-1.86-2.61-2.37-4.57-2.37-4.97 0-.22.09-.42.51-.42h1.45c.38 0 .52.17.66.58.71 2.07 1.91 3.88 2.4 3.88.18 0 .27-.09.27-.55v-2.13c-.06-.98-.58-1.07-.58-1.42 0-.17.14-.34.36-.34h2.28c.32 0 .43.17.43.55v2.87c0 .32.14.43.23.43.18 0 .33-.11.66-.44 1.02-1.14 1.74-2.9 1.74-2.9.09-.21.26-.4.64-.4h1.45c.44 0 .53.22.44.55-.18.85-1.96 3.36-1.96 3.36-.15.24-.21.36 0 .64.15.21.66.65 1 1.04.62.71 1.1 1.31 1.23 1.72.12.42-.09.62-.51.62z"/>
  </svg>
);

interface SocialBtnProps {
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bg: string;
}
function SocialButton({ label, icon, href, color, bg }: SocialBtnProps) {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        onClick={() => window.open(href, '_blank', 'noopener')}
        sx={{ background: bg, color, border: `1px solid ${alpha(color, 0.2)}`, '&:hover': { background: alpha(color, 0.2) } }}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}

interface SocialsRowProps {
  agent: AgentBaseRecord;
  size?: 'small' | 'medium';
}
function SocialsRow({ agent, size = 'small' }: SocialsRowProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
      {agent.phone && (
        <SocialButton label={agent.phone} color="#22C55E" bg="rgba(34,197,94,0.1)" href={`tel:${agent.phone}`} icon={<PhoneRoundedIcon fontSize={size} />} />
      )}
      {agent.socials.telegram && (
        <SocialButton label={`@${agent.socials.telegram}`} color="#229ED9" bg="rgba(34,158,217,0.1)" href={`https://t.me/${agent.socials.telegram}`} icon={<TelegramIcon fontSize={size} />} />
      )}
      {agent.socials.telegramChannel && (
        <SocialButton label={`Канал ${agent.socials.telegramChannel}`} color="#229ED9" bg="rgba(34,158,217,0.1)" href={`https://t.me/${agent.socials.telegramChannel.replace('@', '')}`} icon={<CampaignRoundedIcon fontSize={size} />} />
      )}
      {agent.socials.instagram && (
        <SocialButton label={`@${agent.socials.instagram}`} color="#E4405F" bg="rgba(228,64,95,0.1)" href={`https://instagram.com/${agent.socials.instagram}`} icon={<InstagramIcon fontSize={size} />} />
      )}
      {agent.socials.vk && (
        <SocialButton label={`vk.com/${agent.socials.vk}`} color="#0077FF" bg="rgba(0,119,255,0.1)" href={`https://vk.com/${agent.socials.vk}`} icon={<VkIcon fontSize={size} />} />
      )}
      {agent.socials.max && (
        <SocialButton label={`MAX: ${agent.socials.max}`} color="#7C3AED" bg="rgba(124,58,237,0.1)" href={`https://max.ru/${agent.socials.max.replace('@', '')}`} icon={<ChatRoundedIcon fontSize={size} />} />
      )}
      {agent.socials.youtube && (
        <SocialButton label={agent.socials.youtube} color="#FF0000" bg="rgba(255,0,0,0.1)" href={`https://youtube.com/${agent.socials.youtube.replace('@', '@')}`} icon={<YouTubeIcon fontSize={size} />} />
      )}
    </Box>
  );
}

export default function Agents() {
  // Список агентов через react-query (кэш на возврат). Себя скрываем — «база остальных».
  const agentsQ = useAgents({ status: 'active', role: 'agent' });
  const agentsBase = useMemo<BaseRecord[]>(() => {
    const list = agentsQ.data ?? [];
    const meId = typeof getCurrentAgent()?.id === 'number' ? (getCurrentAgent()!.id as number) : null;
    const visible = meId != null ? list.filter(a => a.id !== meId) : list;
    return visible.map(toBaseRecord);
  }, [agentsQ.data]);
  const loading = agentsQ.isLoading;
  const error = agentsQ.error as Error | null;

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Все города');
  const [direction, setDirection] = useState('Все направления');
  const [openId, setOpenId] = useState<number | null>(null);

  // Отзывы открытого агента: грузятся при открытии карточки.
  const [openReviews, setOpenReviews] = useState<AgentReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  // Composer
  const [composerRating, setComposerRating] = useState<number | null>(0);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);


  // При открытии карточки — подтянуть одобренные отзывы.
  useEffect(() => {
    if (openId == null) { setOpenReviews([]); return; }
    let cancelled = false;
    setReviewsLoading(true);
    agentsApi.reviews(openId)
      .then(rows => { if (!cancelled) setOpenReviews(rows); })
      .catch(() => { if (!cancelled) setOpenReviews([]); })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [openId]);

  const cities = useMemo(
    () => ['Все города', ...Array.from(new Set(agentsBase.map(a => a.city).filter(Boolean)))],
    [agentsBase],
  );

  // useDeferredValue: ввод в поиск не блокирует рендер большого списка.
  const deferredSearch = useDeferredValue(search);
  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    return agentsBase.filter(a =>
      (a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)) &&
      (city === 'Все города' || a.city === city) &&
      (direction === 'Все направления' || [...a.primaryDir, ...a.secondaryDir].includes(direction))
    );
  }, [agentsBase, deferredSearch, city, direction]);

  const openAgent = useMemo(
    () => (openId !== null ? agentsBase.find(a => a.id === openId) || null : null),
    [openId, agentsBase],
  );
  const openAgentReviews = openReviews;
  const avgRating = openAgent
    ? (openAgentReviews.length
        ? openAgentReviews.reduce((s, r) => s + r.rating, 0) / openAgentReviews.length
        : openAgent.rating)
    : 0;

  const MIN_REVIEW = 100;
  const composerLen = composerText.trim().length;
  const canSendReview = !!composerRating && composerLen >= MIN_REVIEW && !sending;

  const handleSendReview = async () => {
    if (!openAgent || !canSendReview) return;
    setSending(true); setSendError(null);
    try {
      await agentsApi.createReview(openAgent.id, composerRating!, composerText.trim());
      // Отзыв ушёл, но он pending — модерация. Локально показываем мгновенно.
      const initials = currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('');
      const optimistic: AgentReview = {
        id: Date.now(),
        author: currentUser.name.split(' ').slice(0, 2).join(' '),
        initials,
        rating: composerRating as 1 | 2 | 3 | 4 | 5,
        date: new Date().toISOString().slice(0, 10),
        text: composerText.trim(),
      };
      setOpenReviews(prev => [...prev, optimistic]);
      setComposerRating(0);
      setComposerText('');
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2500);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Не удалось отправить отзыв');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск агентов..." size="small"
          sx={{ flex: 1, minWidth: 240 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: '#64748B', fontSize: 20 }} /></InputAdornment> } }}
        />
        <Select value={city} onChange={e => setCity(e.target.value)} size="small" sx={{ minWidth: 180, ...selectSx }}>
          {cities.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
        <Select value={direction} onChange={e => setDirection(e.target.value)} size="small" sx={{ minWidth: 200, ...selectSx }}>
          {directions.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </Select>
      </Box>

      <Typography variant="caption" sx={{ color: '#64748B', mb: 2, display: 'block' }}>
        Найдено агентов: <b style={{ color: '#C9A84C' }}>{filtered.length}</b> из {agentsBase.length}
      </Typography>

      {loading && (
        <PageSkeleton />
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
      )}
      {!loading && !error && agentsBase.length === 0 && (
        <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 4 }}>
          Агентов пока нет
        </Typography>
      )}

      <Grid container spacing={3}>
        {filtered.map((agent) => {
            const initials = agent.name.split(' ').map(n => n[0]).join('').slice(0, 2);
            const totalReviews = agent.reviewsCount;
            return (
              <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} key={agent.id}>
                <motion.div whileHover={{ y: -4 }}>
                  <Card
                    onClick={() => setOpenId(agent.id)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { border: '1px solid rgba(201,168,76,0.25)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' },
                      transition: 'all 0.3s',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      {/* Avatar / Photo */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <SmartAvatar
                          src={agent.photo}
                          name={agent.name}
                          size={88}
                          sx={{
                            background: 'linear-gradient(135deg, rgba(201,168,76,0.4), rgba(201,168,76,0.15))',
                            color: '#F1F5F9',
                            border: '3px solid rgba(201,168,76,0.3)',
                            mb: 2,
                          }}
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F1F5F9', lineHeight: 1.3 }}>{agent.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: '#64748B' }}>
                          <LocationOnRoundedIcon sx={{ fontSize: 14 }} />
                          <Typography variant="caption">{agent.city}</Typography>
                        </Box>

                        {/* Rating */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
                          <Rating
                            value={agent.rating}
                            readOnly precision={0.1} size="small"
                            emptyIcon={<StarBorderRoundedIcon sx={{ color: '#475569', fontSize: 18 }} fontSize="inherit" />}
                            icon={<StarRoundedIcon sx={{ color: '#F59E0B', fontSize: 18 }} fontSize="inherit" />}
                          />
                          <Typography variant="caption" sx={{ color: '#F1F5F9', fontWeight: 700, ml: 0.5 }}>
                            {agent.rating.toFixed(1)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            ({totalReviews})
                          </Typography>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2.5, borderColor: 'rgba(201,168,76,0.08)' }} />

                      {/* Stats */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', color: '#4361EE' }}>
                            <HandshakeRoundedIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#F1F5F9', fontSize: 14 }}>{agent.deals}</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>{pluralDeals(agent.deals)} за год</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', color: '#C9A84C' }}>
                            <WorkRoundedIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#F1F5F9', fontSize: 14 }}>{agent.experienceYears}</Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>
                            {agent.experienceYears === 1 ? 'год' : agent.experienceYears < 5 ? 'года' : 'лет'} опыта
                          </Typography>
                        </Box>
                      </Box>

                      {/* Direction tags */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mb: 2 }}>
                        {agent.primaryDir.map(d => (
                          <Chip key={d} label={d} size="small" sx={{ height: 20, fontSize: 10, background: alpha(dirColors[d] || '#64748B', 0.15), color: dirColors[d] || '#94A3B8', fontWeight: 600 }} />
                        ))}
                        {agent.secondaryDir.filter(s => !agent.primaryDir.includes(s)).map(d => (
                          <Chip key={d} label={d} size="small" sx={{ height: 20, fontSize: 10, background: 'rgba(255,255,255,0.05)', color: '#94A3B8' }} />
                        ))}
                      </Box>

                      <SocialsRow agent={agent} />
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
      </Grid>

      {/* === Agent detail dialog === */}
      <Dialog
        open={openAgent !== null}
        onClose={() => setOpenId(null)}
        maxWidth="md" fullWidth
        slotProps={{ paper: { sx: {
          background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)',
          border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 3,
        } } }}
      >
        {openAgent && (() => {
          const initials = openAgent.name.split(' ').map(n => n[0]).join('').slice(0, 2);
          return (
            <>
              {/* Hero with avatar */}
              <Box sx={{ position: 'relative', p: 3, pb: 0 }}>
                <IconButton
                  onClick={() => setOpenId(null)}
                  sx={{ position: 'absolute', top: 12, right: 12, color: '#64748B', '&:hover': { color: '#F1F5F9' } }}
                >
                  <CloseRoundedIcon />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                  <SmartAvatar
                    src={openAgent.photo}
                    name={openAgent.name}
                    size={128}
                    sx={{
                      background: 'linear-gradient(135deg, rgba(201,168,76,0.5), rgba(201,168,76,0.15))',
                      border: '4px solid rgba(201,168,76,0.3)',
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{openAgent.name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: '#94A3B8', mt: 0.5 }}>
                      <LocationOnRoundedIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{openAgent.city}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                      <Rating
                        value={avgRating} precision={0.1} readOnly
                        icon={<StarRoundedIcon sx={{ color: '#F59E0B' }} fontSize="inherit" />}
                        emptyIcon={<StarBorderRoundedIcon sx={{ color: '#475569' }} fontSize="inherit" />}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#F1F5F9' }}>
                        {avgRating.toFixed(1)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        · {openAgentReviews.length} {openAgentReviews.length === 1 ? 'отзыв' : openAgentReviews.length < 5 ? 'отзыва' : 'отзывов'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                      {openAgent.primaryDir.map(d => (
                        <Chip key={d} label={d} size="small" sx={{ background: alpha(dirColors[d] || '#64748B', 0.18), color: dirColors[d] || '#94A3B8', fontWeight: 700 }} />
                      ))}
                      <Chip icon={<HandshakeRoundedIcon sx={{ fontSize: 14 }} />} label={`${openAgent.deals} ${pluralDeals(openAgent.deals)} за год`} size="small" sx={{ background: 'rgba(67,97,238,0.15)', color: '#4361EE', fontWeight: 700, '& .MuiChip-icon': { color: '#4361EE' } }} />
                      <Chip icon={<WorkRoundedIcon sx={{ fontSize: 14 }} />} label={`${openAgent.experienceYears} ${openAgent.experienceYears === 1 ? 'год' : openAgent.experienceYears < 5 ? 'года' : 'лет'} опыта`} size="small" sx={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', fontWeight: 700, '& .MuiChip-icon': { color: '#C9A84C' } }} />
                    </Box>
                  </Box>
                </Box>
              </Box>

              <DialogContent sx={{ p: 3 }}>
                {/* Bio */}
                {openAgent.bio && (
                  <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
                    <Typography variant="body2" sx={{ color: '#CBD5E1', lineHeight: 1.7 }}>
                      {openAgent.bio}
                    </Typography>
                  </Box>
                )}

                {/* Socials block */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                    Связаться
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <SocialsRow agent={openAgent} size="medium" />
                  </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />

                {/* Reviews */}
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarRoundedIcon sx={{ color: '#F59E0B' }} />
                  Отзывы и оценки
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
                  {openAgentReviews.length === 0 ? 'Будьте первым, кто оставит отзыв' : `${openAgentReviews.length} ${openAgentReviews.length === 1 ? 'отзыв' : openAgentReviews.length < 5 ? 'отзыва' : 'отзывов'}`}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                  <AnimatePresence>
                    {reviewsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={24} sx={{ color: '#C9A84C' }} />
                      </Box>
                    ) : openAgentReviews.length === 0 ? (
                      <Typography variant="body2" sx={{ color: '#475569', textAlign: 'center', py: 3, fontStyle: 'italic' }}>
                        Отзывов пока нет
                      </Typography>
                    ) : (
                      [...openAgentReviews].reverse().map(r => (
                        <motion.div key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                          <Box sx={{
                            p: 2, borderRadius: 2,
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', gap: 1.5, alignItems: 'flex-start',
                          }}>
                            <Avatar sx={{ width: 36, height: 36, fontSize: 12, fontWeight: 700, background: 'rgba(100,116,139,0.4)', color: '#F1F5F9', flexShrink: 0 }}>
                              {r.initials}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#F1F5F9' }}>{r.author}</Typography>
                                <Rating value={r.rating} readOnly size="small"
                                  icon={<StarRoundedIcon sx={{ color: '#F59E0B', fontSize: 14 }} fontSize="inherit" />}
                                  emptyIcon={<StarBorderRoundedIcon sx={{ color: '#475569', fontSize: 14 }} fontSize="inherit" />}
                                />
                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                                  {new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.55 }}>{r.text}</Typography>
                            </Box>
                          </Box>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </Box>

                {/* Composer */}
                <Box sx={{
                  p: 2, borderRadius: 2,
                  background: 'rgba(201,168,76,0.04)',
                  border: '1px dashed rgba(201,168,76,0.25)',
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 1.5 }}>
                    Оставить отзыв
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>Оценка:</Typography>
                    <Rating
                      value={composerRating}
                      onChange={(_, v) => setComposerRating(v)}
                      size="large"
                      icon={<StarRoundedIcon sx={{ color: '#F59E0B' }} fontSize="inherit" />}
                      emptyIcon={<StarBorderRoundedIcon sx={{ color: '#475569' }} fontSize="inherit" />}
                    />
                    {composerRating ? (
                      <Typography variant="body2" sx={{ color: '#F59E0B', fontWeight: 700, ml: 1 }}>
                        {composerRating}/5
                      </Typography>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#64748B', ml: 1 }}>выберите от 1 до 5</Typography>
                    )}
                  </Box>
                  <TextField
                    fullWidth multiline minRows={3} maxRows={6} size="small"
                    placeholder={`Поделитесь опытом работы с агентом… (минимум ${MIN_REVIEW} символов, чтобы отзыв был полезен другим)`}
                    value={composerText}
                    onChange={e => setComposerText(e.target.value)}
                    error={composerLen > 0 && composerLen < MIN_REVIEW}
                  />
                  {/* Counter + min hint */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.8 }}>
                    <Typography variant="caption" sx={{ color: composerLen >= MIN_REVIEW ? '#22C55E' : composerLen > 0 ? '#F59E0B' : '#64748B' }}>
                      {composerLen >= MIN_REVIEW
                        ? `✓ ${composerLen} символов — отлично`
                        : `${composerLen} / ${MIN_REVIEW} символов`}
                    </Typography>
                    {composerLen > 0 && composerLen < MIN_REVIEW && (
                      <Typography variant="caption" sx={{ color: '#F59E0B' }}>
                        ещё {MIN_REVIEW - composerLen}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Отзыв публикуется от имени <b style={{ color: '#C9A84C' }}>{currentUser.name.split(' ').slice(0, 2).join(' ')}</b>
                    </Typography>
                    <Button
                      variant="contained"
                      disabled={!canSendReview}
                      onClick={handleSendReview}
                    >
                      {sending ? 'Отправка…' : 'Отправить отзыв'}
                    </Button>
                  </Box>
                  {sendError && (
                    <Alert severity="error" sx={{ mt: 1.5 }}>{sendError}</Alert>
                  )}
                  {justSent && (
                    <Box sx={{ mt: 1.5, p: 1, borderRadius: 1.5, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleRoundedIcon sx={{ color: '#22C55E', fontSize: 18 }} />
                      <Typography variant="caption" sx={{ color: '#22C55E', fontWeight: 600 }}>
                        Спасибо! Ваш отзыв отправлен на модерацию.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
