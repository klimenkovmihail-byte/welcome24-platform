import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Avatar, alpha, TextField, InputAdornment,
  Dialog, DialogContent, IconButton, Divider, Button, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { currentUser } from '../data/mockData';
import { newsApi, type NewsArticle, type NewsComment } from '../api/news';
import { getCurrentAgent } from '../auth/auth';
import CoverImage from '../components/CoverImage';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';

const categoryColors: Record<string, { bg: string; color: string }> = {
  'Рынок': { bg: 'rgba(67,97,238,0.15)', color: '#4361EE' },
  'Компания': { bg: 'rgba(201,168,76,0.15)', color: '#C9A84C' },
  'Обучение': { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
  'Советы': { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  'Кейсы': { bg: 'rgba(123,47,190,0.15)', color: '#7B2FBE' },
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

// SQLite отдаёт "2026-05-25 15:14:39" (UTC, без явной TZ). JS-конструктор
// без 'Z' интерпретирует это как локальное время — выходят неверные часы.
// Заворачиваем в ISO-формат с Z.
function parseSqlDate(s: string): Date | null {
  if (!s) return null;
  // если уже ISO с Z или offset — браузер сам разберёт
  if (s.includes('T') || s.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  // "2026-05-25 15:14:39" → "2026-05-25T15:14:39Z"
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

// "5 минут назад" / "2 часа назад" / "вчера" / "3 дня назад" / "12 мая"
function formatRelative(iso: string): string {
  const d = parseSqlDate(iso);
  if (!d) return '';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} ${pluralRu(diffMin, 'минуту', 'минуты', 'минут')} назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ${pluralRu(diffH, 'час', 'часа', 'часов')} назад`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'вчера';
  if (diffD < 7) return `${diffD} ${pluralRu(diffD, 'день', 'дня', 'дней')} назад`;
  if (diffD < 30) return `${Math.floor(diffD / 7)} ${pluralRu(Math.floor(diffD / 7), 'неделю', 'недели', 'недель')} назад`;
  // > месяца — показываем абсолютную дату
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

interface Comment {
  id: number;
  author: string;
  initials: string;
  text: string;
  date: string;
  isMe?: boolean;
}

function commentFromApi(c: NewsComment, meId: number | null): Comment {
  const initials = (c.authorName || 'А').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return {
    id: c.id,
    author: c.authorName,
    initials,
    text: c.text,
    date: (c.createdAt || '').slice(0, 10).split('-').reverse().slice(0, 2).join('.'),
    isMe: meId != null && c.authorId === meId,
  };
}

const initialComments: Record<number, Comment[]> = {
  1: [
    { id: 1, author: 'Кулаков Степан', initials: 'КС', date: '22.05', text: 'Подтверждаю — у меня на этой неделе 4 показа, все ушли в задаток. Год назад такого темпа не было.' },
    { id: 2, author: 'Радченко Дмитрий', initials: 'РД', date: '23.05', text: 'В Краснодаре та же картина. Особенно по 1-2-комнатным до 8 млн.' },
  ],
  2: [
    { id: 1, author: 'Мухин Вячеслав', initials: 'МВ', date: '20.05', text: 'Долгожданное изменение! Уже подсчитал, что мой пассивный доход вырастет почти на 15%.' },
  ],
  4: [
    { id: 1, author: 'Бондарь Светлана', initials: 'БС', date: '17.05', text: 'Пункт 5 про follow-up — мой главный инсайт за последний год. Конверсия выросла в 2 раза.' },
    { id: 2, author: 'Шадрина Ольга', initials: 'ШО', date: '18.05', text: 'А ещё бы добавила: всегда уточняйте, кто принимает финальное решение. Несколько раз показывал маме, а решал муж.' },
  ],
  6: [
    { id: 1, author: 'Колесникова Анна', initials: 'КА', date: '12.05', text: 'Степан, спасибо! «Закрытие через тишину» — гениально. Применила сегодня, клиент сам предложил поднять цену предложения.' },
  ],
};

export default function News() {
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [likesOverride, setLikesOverride] = useState<Record<number, number>>({});
  const [commentsByArticle, setCommentsByArticle] = useState<Record<number, Comment[]>>({});
  const [viewsOverride, setViewsOverride] = useState<Record<number, number>>({});
  const [viewedArticles, setViewedArticles] = useState<Set<number>>(new Set());
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const me = getCurrentAgent();
  const meId = typeof me?.id === 'number' ? me.id : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    newsApi.list()
      .then(rows => { if (!cancelled) setNewsArticles(rows); })
      .catch(err => { if (!cancelled) setError(err?.message || 'Ошибка загрузки новостей'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // При открытии статьи — подтянуть её комменты с бэка и +1 к просмотру.
  useEffect(() => {
    if (openId == null) return;
    let cancelled = false;
    if (!commentsByArticle[openId]) {
      newsApi.comments(openId)
        .then(rows => {
          if (cancelled) return;
          setCommentsByArticle(prev => ({ ...prev, [openId]: rows.map(c => commentFromApi(c, meId)) }));
        })
        .catch(() => { /* tolerate */ });
    }
    // Учёт просмотра — один раз за сессию на статью
    if (!viewedArticles.has(openId)) {
      newsApi.trackView(openId)
        .then(res => {
          if (cancelled) return;
          setViewsOverride(prev => ({ ...prev, [openId]: res.views }));
          setViewedArticles(prev => { const s = new Set(prev); s.add(openId); return s; });
        })
        .catch(() => { /* tolerate */ });
    }
    return () => { cancelled = true; };
  }, [openId, commentsByArticle, viewedArticles, meId]);

  const getViews = (a: NewsArticle) => viewsOverride[a.id] ?? a.views;

  const categories = Array.from(new Set(newsArticles.map(a => a.category)));
  const filtered = newsArticles.filter(a =>
    (a.title.toLowerCase().includes(search.toLowerCase()) || a.summary.toLowerCase().includes(search.toLowerCase())) &&
    (!activeCategory || a.category === activeCategory)
  );

  // Закреплённые (featured) приходят первыми из API (is_featured DESC), поэтому
  // в сетке они автоматически вверху. Показываем их обычными карточками с меткой
  // «Закреплено» — без отдельного растянутого баннера (он плохо смотрелся на широких экранах).
  const rest = filtered;
  const openArticle = openId !== null ? newsArticles.find(a => a.id === openId) : null;

  const getLikes = (a: NewsArticle) => likesOverride[a.id] ?? a.likes;
  const isLiked = (id: number) => likedIds.has(id);

  const toggleLike = (e: React.MouseEvent, a: NewsArticle) => {
    e.stopPropagation();
    // Оптимистично — потом синхронизируем с ответом сервера.
    const liked = isLiked(a.id);
    const nextSet = new Set(likedIds);
    if (liked) nextSet.delete(a.id); else nextSet.add(a.id);
    setLikedIds(nextSet);
    setLikesOverride(prev => ({ ...prev, [a.id]: getLikes(a) + (liked ? -1 : 1) }));
    newsApi.toggleLike(a.id)
      .then(res => {
        setLikedIds(prev => {
          const s = new Set(prev);
          if (res.liked) s.add(a.id); else s.delete(a.id);
          return s;
        });
        setLikesOverride(prev => ({ ...prev, [a.id]: res.likes }));
      })
      .catch(() => { /* откатывать не будем — пусть UI остаётся оптимистичным */ });
  };

  const sendComment = async () => {
    if (!openArticle || !newComment.trim()) return;
    const text = newComment.trim();
    setSending(true);
    try {
      const created = await newsApi.addComment(openArticle.id, text);
      setCommentsByArticle(prev => ({
        ...prev,
        [openArticle.id]: [...(prev[openArticle.id] || []), commentFromApi(created, meId)],
      }));
      setNewComment('');
    } catch {
      // оставляем поле непустым для повтора
    } finally {
      setSending(false);
    }
  };

  const ArticleMetaRow = ({ a, isCard }: { a: NewsArticle; isCard: boolean }) => {
    const comments = commentsByArticle[a.id]?.length || 0;
    const liked = isLiked(a.id);
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#64748B', flexWrap: 'wrap' }}>
        <Tooltip title="Время чтения">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MenuBookRoundedIcon sx={{ fontSize: isCard ? 13 : 14 }} />
            <Typography variant="caption" sx={{ fontSize: isCard ? 11 : 12 }}>{a.readTime}</Typography>
          </Box>
        </Tooltip>
        <Box
          onClick={(e) => toggleLike(e, a)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            cursor: 'pointer',
            color: liked ? '#EF4444' : '#64748B',
            '&:hover': { color: liked ? '#DC2626' : '#EF4444' },
            transition: 'color 0.15s',
          }}
        >
          {liked
            ? <FavoriteRoundedIcon sx={{ fontSize: isCard ? 14 : 16 }} />
            : <FavoriteBorderRoundedIcon sx={{ fontSize: isCard ? 14 : 16 }} />
          }
          <Typography variant="caption" sx={{ fontSize: isCard ? 11 : 12, fontWeight: liked ? 700 : 500 }}>{getLikes(a)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ChatBubbleOutlineRoundedIcon sx={{ fontSize: isCard ? 13 : 14 }} />
          <Typography variant="caption" sx={{ fontSize: isCard ? 11 : 12 }}>{comments}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <VisibilityRoundedIcon sx={{ fontSize: isCard ? 13 : 14 }} />
          <Typography variant="caption" sx={{ fontSize: isCard ? 11 : 12 }}>{getViews(a)}</Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {/* Search & filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по новостям..." size="small"
          sx={{ flex: 1, minWidth: 240 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: '#64748B', fontSize: 20 }} /></InputAdornment> } }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="Все"
            onClick={() => setActiveCategory('')}
            sx={{
              fontWeight: 700, cursor: 'pointer',
              background: !activeCategory ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
              color: !activeCategory ? '#C9A84C' : '#94A3B8',
              border: !activeCategory ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
            }}
          />
          {categories.map(cat => {
            const c = categoryColors[cat] || { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8' };
            const isActive = activeCategory === cat;
            return (
              <Chip
                key={cat}
                label={cat}
                onClick={() => setActiveCategory(isActive ? '' : cat)}
                sx={{
                  fontWeight: 700, cursor: 'pointer',
                  background: isActive ? c.bg : 'rgba(255,255,255,0.05)',
                  color: isActive ? c.color : '#94A3B8',
                  border: isActive ? `1px solid ${alpha(c.color, 0.3)}` : '1px solid transparent',
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Grid of articles — auto-fit: карточки ровно заполняют ширину
          при любом их числе (2 → две на всю ширину, без пустой колонки).
          Закреплённые идут первыми (is_featured DESC с бэка) и помечены меткой. */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
        {rest.map((article, i) => {
          const c = categoryColors[article.category] || { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8' };
          return (
              <motion.div key={article.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }} style={{ height: '100%' }}>
                <Card
                  onClick={() => setOpenId(article.id)}
                  sx={{
                    height: '100%', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    border: article.featured ? '1px solid rgba(201,168,76,0.4)' : undefined,
                    '&:hover': { border: '1px solid rgba(201,168,76,0.2)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' },
                    transition: 'all 0.3s',
                  }}
                >
                  <Box sx={{ position: 'relative', paddingTop: '56%', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                    <CoverImage
                      src={article.image}
                      preferThumb
                      thumbKind="cover"
                      accentColor={c.color}
                      placeholderIcon={<ArticleRoundedIcon fontSize="inherit" />}
                    />
                    <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                      <Chip label={article.category} size="small" sx={{ background: alpha(c.color, 0.85), color: '#fff', fontWeight: 700, fontSize: 11 }} />
                    </Box>
                    {article.featured && (
                      <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                        <Chip
                          icon={<PushPinRoundedIcon sx={{ fontSize: 14, color: '#0A0E1A !important' }} />}
                          label="Закреплено" size="small"
                          sx={{ background: 'rgba(201,168,76,0.95)', color: '#0A0E1A', fontWeight: 800, fontSize: 11 }}
                        />
                      </Box>
                    )}
                  </Box>
                  <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Tooltip title={article.createdAt ? new Date(article.createdAt.replace(' ', 'T') + 'Z').toLocaleString('ru-RU') : formatDate(article.date)}>
                      <Typography variant="caption" sx={{ color: '#64748B', mb: 0.5, display: 'block' }}>
                        {article.createdAt ? formatRelative(article.createdAt) : formatDate(article.date)}
                      </Typography>
                    </Tooltip>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 1, lineHeight: 1.4, flex: 1 }}>{article.title}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', lineHeight: 1.5, mb: 2 }}>{article.summary}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 11 }}>{article.author}</Typography>
                      <ArticleMetaRow a={article} isCard={true} />
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
          );
        })}
      </Box>

      {/* === Full article dialog === */}
      <Dialog
        open={openArticle !== null}
        onClose={() => setOpenId(null)}
        maxWidth="md" fullWidth
        slotProps={{ paper: { sx: {
          background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)',
          border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 3,
        } } }}
      >
        {openArticle && (() => {
          const c = categoryColors[openArticle.category] || { bg: 'rgba(100,116,139,0.15)', color: '#94A3B8' };
          const comments = commentsByArticle[openArticle.id] || [];
          const liked = isLiked(openArticle.id);
          return (
            <>
              {/* Hero image */}
              <Box sx={{ position: 'relative', height: 280, overflow: 'hidden' }}>
                <CoverImage
                  src={openArticle.image}
                  accentColor={c.color}
                  placeholderIcon={<ArticleRoundedIcon fontSize="inherit" />}
                />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,22,41,0) 0%, rgba(15,22,41,0.6) 70%, rgba(15,22,41,1) 100%)', pointerEvents: 'none' }} />
                <IconButton
                  onClick={() => setOpenId(null)}
                  sx={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    color: '#fff', '&:hover': { background: 'rgba(0,0,0,0.7)' },
                  }}
                >
                  <CloseRoundedIcon />
                </IconButton>
                <Box sx={{ position: 'absolute', bottom: 16, left: 24, right: 24 }}>
                  <Chip label={openArticle.category} sx={{ background: c.bg, color: c.color, fontWeight: 700, mb: 1.5 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900, color: '#F1F5F9', lineHeight: 1.2 }}>
                    {openArticle.title}
                  </Typography>
                </Box>
              </Box>

              <DialogContent sx={{ p: 3, pb: 1 }}>
                {/* Author + meta */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A' }}>
                    {openArticle.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 700 }}>{openArticle.author}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      {openArticle.createdAt ? `опубликовано ${formatRelative(openArticle.createdAt)}` : new Date(openArticle.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' · 📖 '}{openArticle.readTime}
                      {' · 👁 '}{getViews(openArticle)}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={(e) => toggleLike(e, openArticle)}
                      startIcon={liked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                      sx={{
                        borderRadius: 2, px: 1.5,
                        color: liked ? '#EF4444' : '#94A3B8',
                        background: liked ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                        '&:hover': { background: liked ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)', color: '#EF4444' },
                      }}
                    >
                      {getLikes(openArticle)}
                    </Button>
                  </Box>
                </Box>

                {/* Article content */}
                <Box sx={{
                  '& p': { color: '#CBD5E1', lineHeight: 1.85, mb: 2 },
                }}>
                  {openArticle.content.split('\n\n').map((para, i) => (
                    <Typography key={i} variant="body1" sx={{ color: '#CBD5E1', lineHeight: 1.85, mb: 2, whiteSpace: 'pre-wrap' }}>
                      {para}
                    </Typography>
                  ))}
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(201,168,76,0.1)' }} />

                {/* Comments */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 20, color: '#94A3B8' }} />
                    Комментарии ({comments.length})
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  <AnimatePresence>
                    {comments.length === 0 && (
                      <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 2 }}>
                        Пока никто не комментировал. Будьте первым!
                      </Typography>
                    )}
                    {comments.map(comm => (
                      <motion.div key={comm.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
                        <Box sx={{
                          display: 'flex', gap: 1.5,
                          p: 1.5, borderRadius: 2,
                          background: comm.isMe ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.025)',
                          border: comm.isMe ? '1px solid rgba(201,168,76,0.2)' : '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <Avatar sx={{
                            width: 32, height: 32, fontSize: 11, fontWeight: 700, flexShrink: 0,
                            background: comm.isMe ? 'linear-gradient(135deg, #C9A84C, #E2C97E)' : 'rgba(100,116,139,0.4)',
                            color: comm.isMe ? '#0A0E1A' : '#F1F5F9',
                          }}>
                            {comm.initials}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#F1F5F9' }}>{comm.author}</Typography>
                              {comm.isMe && <Chip label="Вы" size="small" sx={{ height: 14, fontSize: 9, background: 'rgba(201,168,76,0.2)', color: '#C9A84C', fontWeight: 800 }} />}
                              <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>{comm.date}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.5 }}>{comm.text}</Typography>
                          </Box>
                        </Box>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </Box>

                {/* Composer */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mt: 2 }}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', flexShrink: 0 }}>
                    {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </Avatar>
                  <TextField
                    fullWidth multiline maxRows={4} size="small"
                    placeholder="Написать комментарий…"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        sendComment();
                      }
                    }}
                  />
                  <Button
                    onClick={sendComment}
                    disabled={!newComment.trim()}
                    variant="contained"
                    sx={{ minWidth: 0, px: 1.5, py: 1, alignSelf: 'stretch' }}
                  >
                    <SendRoundedIcon fontSize="small" />
                  </Button>
                </Box>
                <Typography variant="caption" sx={{ color: '#475569', display: 'block', mt: 1, ml: 6.5 }}>
                  Ctrl/⌘ + Enter — отправить
                </Typography>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
