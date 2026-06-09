import { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, LinearProgress, Grid, Tabs, Tab, alpha,
  Button, Dialog, DialogContent, IconButton, ToggleButtonGroup, ToggleButton, Divider,
  Tooltip, Stack, useMediaQuery, useTheme, Menu, MenuItem,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import OndemandVideoRoundedIcon from '@mui/icons-material/OndemandVideoRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FiberNewRoundedIcon from '@mui/icons-material/FiberNewRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { Rating, TextField } from '@mui/material';
import { currentUser } from '../data/mockData';
import { academyApi, type AcademyEvent, type AcademyCourse, type WebinarRecording } from '../api/academy';
import CoverImage from '../components/CoverImage';
import VideoPlayer from '../components/VideoPlayer';
import ErrorBoundary from '../components/ErrorBoundary';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';

const courseCategoryColors: Record<string, string> = {
  'Базовый':     '#22C55E',
  'Продажи':     '#4361EE',
  'Психология':  '#EC4899',
  'Маркетинг':   '#EF4444',
  'Лидерство':   '#7B2FBE',
  'Переговоры':  '#C9A84C',
  'МЛМ':         '#06B6D4',
  'Планирование':'#F59E0B',
};
const webinarTopicColors: Record<string, string> = {
  'Новостройки':       '#22C55E',
  'Вторичка':          '#4361EE',
  'Юридический блок':  '#7B2FBE',
  'Ипотека':           '#C9A84C',
  'Загородная':        '#06B6D4',
  'Коммерческая':      '#EF4444',
};

const levelColor: Record<string, string> = { 'Начинающий': '#22C55E', 'Средний': '#4361EE', 'Продвинутый': '#C9A84C' };

const formatCfg: Record<string, { label: string; color: string }> = {
  webinar:     { label: 'Вебинар',      color: '#4361EE' },
  masterclass: { label: 'Мастер-класс', color: '#C9A84C' },
  meeting:     { label: 'Встреча',      color: '#22C55E' },
  training:    { label: 'Тренинг',      color: '#EC4899' },
};

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const RU_WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Функция, не константа: модульная const new Date() вычисляется один раз при
// загрузке бандла, и в долгоживущей вкладке (PWA) «сегодня» протухало — вчерашние
// вебинары выглядели предстоящими, подсветка «Сегодня» указывала на вчера.
const today = () => new Date();

function pad(n: number) { return n.toString().padStart(2, '0'); }

// ICS generator. Время событий — московское (Europe/Moscow). Без явной TZID
// календари (особенно Apple/iOS) трактуют floating-time как UTC и сдвигают на
// 3 часа. Поэтому добавляем VTIMEZONE и привязываем DTSTART/DTEND к TZID.
function toICSLocal(date: string, time: string) {
  // 'YYYYMMDDTHHMMSS' без Z — локальное время в указанной TZID.
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}
// Экранирование по RFC 5545 (запятые/точки с запятой/обратный слэш/переводы строк).
function icsEscape(s: string) {
  return String(s || '')
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
function downloadICS(ev: AcademyEvent) {
  const start = toICSLocal(ev.date, ev.startTime);
  const end = toICSLocal(ev.date, ev.endTime);
  const dtStamp = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '').slice(0, 15)}Z`;
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Welcome 24//Academy//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    // Определение московской таймзоны (UTC+3, без перехода на летнее время).
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Moscow',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0300',
    'TZNAME:MSK',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:event-${ev.id}@welcome24.ru`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Europe/Moscow:${start}`,
    `DTEND;TZID=Europe/Moscow:${end}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    `DESCRIPTION:${icsEscape(ev.description)}`,
    `LOCATION:${icsEscape(ev.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  // iOS Safari не качает blob-файлы («Safari не удаётся загрузить файл»).
  // Для iOS открываем data:-URL в этой же вкладке — система предложит добавить
  // в Календарь. Для остальных — обычное скачивание .ics через blob.
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos) {
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
    return;
  }
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `welcome24-${ev.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Прямая ссылка в Google Calendar. Даты Google ждёт в UTC (формат с Z),
// поэтому переводим московское время (UTC+3) в UTC, вычитая 3 часа.
function googleCalendarUrl(ev: AcademyEvent): string {
  const toUTC = (date: string, time: string) => {
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    // Москва = UTC+3 → UTC = локальное − 3ч. Date.UTC + сдвиг.
    const dt = new Date(Date.UTC(y, mo - 1, d, h - 3, mi, 0));
    return dt.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  };
  const dates = `${toUTC(ev.date, ev.startTime)}/${toUTC(ev.date, ev.endTime)}`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    details: ev.description || '',
    location: ev.location || '',
    ctz: 'Europe/Moscow',
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// ----------------- Course card -----------------
function CourseCard({ c, delay, onOpen }: { c: AcademyCourse; delay: number; onOpen: (c: AcademyCourse) => void }) {
  const catColor = courseCategoryColors[c.category] || '#64748B';
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.04 }} whileHover={{ y: -4 }} style={{ height: '100%' }}>
      <Card
        onClick={() => onOpen(c)}
        sx={{ height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          '&:hover': { border: '1px solid rgba(201,168,76,0.25)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' },
          transition: 'all 0.3s' }}
      >
        <Box sx={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
          <CoverImage
            src={c.coverUrl}
            accentColor={catColor}
            placeholderIcon={<SchoolRoundedIcon fontSize="inherit" />}
          />
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(8,12,24,0.92))', display: 'flex', alignItems: 'flex-end', p: 2, pointerEvents: 'none' }}>
            <Chip label={c.category} size="small" sx={{ background: alpha(catColor, 0.9), color: '#fff', fontWeight: 700, pointerEvents: 'auto' }} />
          </Box>
          {c.completed && (
            <Box sx={{ position: 'absolute', top: 12, right: 12, background: 'rgba(34,197,94,0.9)', borderRadius: '50%', p: 0.5 }}>
              <CheckCircleRoundedIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
          )}
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, '&:hover': { opacity: 1 }, transition: 'opacity 0.3s', pointerEvents: 'none' }}>
            <PlayCircleRoundedIcon sx={{ color: '#fff', fontSize: 56, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
          </Box>
        </Box>
        <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Chip label={c.level} size="small" sx={{ background: alpha(levelColor[c.level] || '#64748B', 0.12), color: levelColor[c.level] || '#94A3B8', fontWeight: 600, fontSize: 10, height: 18 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <StarRoundedIcon sx={{ color: '#F59E0B', fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#F1F5F9' }}>{c.rating}</Typography>
            </Box>
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', lineHeight: 1.35, mb: 1 }}>{c.title}</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', lineHeight: 1.5, mb: 1.5, flex: 1 }}>{c.description}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#64748B', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 13 }} />
              <Typography variant="caption" sx={{ fontSize: 11 }}>{c.duration}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <MenuBookRoundedIcon sx={{ fontSize: 13 }} />
              <Typography variant="caption" sx={{ fontSize: 11 }}>{c.totalLessons} уроков</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <PeopleRoundedIcon sx={{ fontSize: 13 }} />
              <Typography variant="caption" sx={{ fontSize: 11 }}>{c.authorName.split(' ').slice(0, 2).join(' ')}</Typography>
            </Box>
          </Box>
          {c.progress > 0 ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>Прогресс</Typography>
                <Typography variant="caption" sx={{ color: c.completed ? '#22C55E' : '#C9A84C', fontWeight: 700 }}>{c.progress}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={c.progress} sx={{ height: 5, borderRadius: 99 }} />
            </Box>
          ) : (
            <Button fullWidth size="small" variant="outlined" sx={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C', fontWeight: 700, '&:hover': { borderColor: '#C9A84C', background: 'rgba(201,168,76,0.08)' } }}>
              Начать курс
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ----------------- Webinar recording card -----------------
function WebinarCard({ w, delay, onOpen }: { w: WebinarRecording; delay: number; onOpen: (w: WebinarRecording) => void }) {
  const c = webinarTopicColors[w.topic] || '#64748B';
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.04 }} whileHover={{ y: -4 }} style={{ height: '100%' }}>
      <Card
        onClick={() => onOpen(w)}
        sx={{ height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          '&:hover': { border: '1px solid rgba(201,168,76,0.25)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' },
          transition: 'all 0.3s' }}
      >
        <Box sx={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
          <CoverImage
            src={w.coverUrl}
            accentColor={c}
            placeholderIcon={<OndemandVideoRoundedIcon fontSize="inherit" />}
          />
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(8,12,24,0.92))', display: 'flex', alignItems: 'flex-end', p: 2, pointerEvents: 'none' }}>
            <Chip label={w.topic} size="small" sx={{ background: alpha(c, 0.9), color: '#fff', fontWeight: 700, pointerEvents: 'auto' }} />
          </Box>
          {w.isNew && (
            <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
              <Chip icon={<FiberNewRoundedIcon sx={{ fontSize: 14 }} />} label="NEW" size="small" sx={{ background: '#EF4444', color: '#fff', fontWeight: 800, '& .MuiChip-icon': { color: '#fff' } }} />
            </Box>
          )}
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.65)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56 }}>
            <PlayCircleRoundedIcon sx={{ color: '#fff', fontSize: 40 }} />
          </Box>
          <Box sx={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.65)', borderRadius: 1, px: 0.8, py: 0.2 }}>
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>{w.duration}</Typography>
          </Box>
        </Box>
        <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="caption" sx={{ color: '#64748B', mb: 0.5 }}>
            {new Date(w.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', lineHeight: 1.35, mb: 1 }}>{w.title}</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', lineHeight: 1.5, mb: 1.5, flex: 1 }}>{w.description}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>{w.speakerName}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: '#64748B' }}>
              <VisibilityRoundedIcon sx={{ fontSize: 13 }} />
              <Typography variant="caption" sx={{ fontSize: 11 }}>{w.views.toLocaleString('ru-RU')}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ----------------- Calendar widget -----------------
function MonthCalendar({ events, selectedDate, onSelectDate, viewDate, setViewDate }:
  { events: AcademyEvent[]; selectedDate: string; onSelectDate: (d: string) => void; viewDate: Date; setViewDate: (d: Date) => void }) {

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // build 6-week grid
  const cells: { date: Date | null; ds: string | null }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, ds: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
    cells.push({ date, ds });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, ds: null });

  const eventsByDate = useMemo(() => {
    const map: Record<string, AcademyEvent[]> = {};
    events.forEach(e => { (map[e.date] = map[e.date] || []).push(e); });
    return map;
  }, [events]);

  const now = today();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={prevMonth} size="small" sx={{ color: '#94A3B8' }}><ChevronLeftRoundedIcon /></IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F1F5F9', textTransform: 'capitalize' }}>
            {RU_MONTHS[month]} {year}
          </Typography>
          <IconButton onClick={nextMonth} size="small" sx={{ color: '#94A3B8' }}><ChevronRightRoundedIcon /></IconButton>
        </Box>

        {/* Weekdays */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
          {RU_WEEKDAYS_SHORT.map((w, i) => (
            <Typography key={w} variant="caption" sx={{ textAlign: 'center', color: i >= 5 ? '#EF4444' : '#64748B', fontWeight: 700, fontSize: 11 }}>{w}</Typography>
          ))}
        </Box>

        {/* Cells */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {cells.map((c, i) => {
            if (!c.date || !c.ds) return <Box key={`empty-${i}`} sx={{ aspectRatio: '1', minHeight: 48 }} />;
            const isToday = c.ds === todayStr;
            const isSelected = c.ds === selectedDate;
            const dayEvents = eventsByDate[c.ds] || [];
            const isWeekend = (i % 7) >= 5;
            return (
              <Box
                key={c.ds}
                onClick={() => onSelectDate(c.ds!)}
                sx={{
                  aspectRatio: '1', minHeight: 48,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(201,168,76,0.25)' : isToday ? 'rgba(67,97,238,0.18)' : dayEvents.length ? 'rgba(201,168,76,0.05)' : 'transparent',
                  border: isSelected ? '1px solid rgba(201,168,76,0.5)' : isToday ? '1px solid rgba(67,97,238,0.5)' : '1px solid rgba(255,255,255,0.04)',
                  transition: 'all 0.15s',
                  '&:hover': { background: isSelected ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.12)' },
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', pt: 0.5,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: isToday || isSelected ? 800 : 600, color: isToday ? '#60A5FA' : isSelected ? '#C9A84C' : isWeekend ? '#F87171' : '#F1F5F9', fontSize: 13 }}>
                  {c.date.getDate()}
                </Typography>
                {dayEvents.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.3, mt: 0.4, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {dayEvents.slice(0, 3).map(e => (
                      <Box key={e.id} sx={{ width: 5, height: 5, borderRadius: '50%', background: (formatCfg[e.format] || formatCfg.webinar).color }} />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

// ----------------- Event card (for selected day or list) -----------------
function EventCard({ e, compact = false }: { e: AcademyEvent; compact?: boolean }) {
  const [calAnchor, setCalAnchor] = useState<HTMLElement | null>(null);
  // Фолбэк: бэк не валидирует format при PATCH — неизвестное значение без него
  // роняло всю Академию (TypeError на cfg.color).
  const cfg = formatCfg[e.format] || formatCfg.webinar;
  const isPast = new Date(`${e.date}T${e.endTime}`).getTime() < today().getTime();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
      <Box sx={{
        p: compact ? 1.8 : 2,
        borderRadius: 2.5,
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${alpha(cfg.color, 0.25)}`,
        position: 'relative',
        opacity: isPast ? 0.6 : 1,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.8 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
              <Chip label={cfg.label} size="small" sx={{ background: alpha(cfg.color, 0.15), color: cfg.color, fontWeight: 700, fontSize: 10, height: 18 }} />
              {e.topic && (
                <Chip label={e.topic} size="small" sx={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', fontSize: 10, height: 18 }} />
              )}
              {isPast && <Chip label="прошёл" size="small" sx={{ background: 'rgba(100,116,139,0.15)', color: '#64748B', fontSize: 10, height: 18 }} />}
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#F1F5F9', lineHeight: 1.3, mb: 0.5 }}>{e.title}</Typography>
            {!compact && (
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1, lineHeight: 1.5 }}>{e.description}</Typography>
            )}
          </Box>
          {!isPast && (
            <>
              <Tooltip title="Добавить в календарь">
                <IconButton size="small" onClick={ev => setCalAnchor(ev.currentTarget)} sx={{ color: '#C9A84C', '&:hover': { background: 'rgba(201,168,76,0.1)' } }}>
                  <EventNoteRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={calAnchor} open={!!calAnchor} onClose={() => setCalAnchor(null)}
                slotProps={{ paper: { sx: { background: 'linear-gradient(135deg, #0F1629, #0A0E1A)', border: '1px solid rgba(201,168,76,0.15)' } } }}>
                <MenuItem onClick={() => { window.open(googleCalendarUrl(e), '_blank', 'noopener'); setCalAnchor(null); }} sx={{ fontSize: 14 }}>
                  Google Календарь
                </MenuItem>
                <MenuItem onClick={() => { downloadICS(e); setCalAnchor(null); }} sx={{ fontSize: 14 }}>
                  Apple / Outlook (.ics)
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5, color: '#94A3B8' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <AccessTimeRoundedIcon sx={{ fontSize: 13 }} />
            <Typography variant="caption">{e.startTime} – {e.endTime}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <LocationOnRoundedIcon sx={{ fontSize: 13 }} />
            <Typography variant="caption">{e.location}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <PeopleRoundedIcon sx={{ fontSize: 13 }} />
            <Typography variant="caption">
              {e.registered}{e.capacity ? ` / ${e.capacity}` : ''}
            </Typography>
          </Box>
        </Box>

        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 1, fontSize: 11 }}>
          🎤 {e.speakerName}
        </Typography>

        {!isPast && e.link && (
          <Button size="small" variant="contained" fullWidth component="a" href={e.link} target="_blank" rel="noopener noreferrer"
            startIcon={<OndemandVideoRoundedIcon fontSize="small" />}
            sx={{ mt: 1.2, background: cfg.color, color: '#0A0E1A', fontWeight: 700, textTransform: 'none', '&:hover': { background: cfg.color, filter: 'brightness(1.1)' } }}>
            Перейти на трансляцию
          </Button>
        )}
      </Box>
    </motion.div>
  );
}

export default function Academy() {
  return (
    <ErrorBoundary>
      <AcademyImpl />
    </ErrorBoundary>
  );
}

function AcademyImpl() {
  // Данные с бэка
  const [academyCourses, setAcademyCourses] = useState<AcademyCourse[]>([]);
  const [webinarRecordings, setWebinarRecordings] = useState<WebinarRecording[]>([]);
  const [academyEvents, setAcademyEvents] = useState<AcademyEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      academyApi.courses().catch(() => []),
      academyApi.webinars().catch(() => []),
      academyApi.events().catch(() => []),
    ]).then(([c, w, e]) => {
      if (cancelled) return;
      setAcademyCourses(c);
      setWebinarRecordings(w);
      setAcademyEvents(e);
    });
    return () => { cancelled = true; };
  }, []);

  const [tab, setTab] = useState<'courses' | 'recordings' | 'schedule'>('courses');
  const [openCourse, setOpenCourse] = useState<AcademyCourse | null>(null);
  const [openWebinar, setOpenWebinar] = useState<WebinarRecording | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<number | null>(null);

  // Local state for course ratings, lesson completion, webinar likes & comments
  const [myRatings, setMyRatings] = useState<Record<number, number>>({});
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({}); // key: courseId-lessonId
  const [webinarLikes, setWebinarLikes] = useState<Set<number>>(new Set());        // мои лайки (optimistic)
  const [webinarLikeOverride, setWebinarLikeOverride] = useState<Record<number, number>>({}); // override likesCount после клика
  const [webinarViewsOverride, setWebinarViewsOverride] = useState<Record<number, number>>({}); // override views после открытия
  const [viewedWebinars, setViewedWebinars] = useState<Set<number>>(new Set());
  const [webinarComments, setWebinarComments] = useState<Record<number, { id: number; author: string; initials: string; text: string; date: string; isMe?: boolean }[]>>({});
  const [webinarCommentDraft, setWebinarCommentDraft] = useState('');
  const [webinarCommentSending, setWebinarCommentSending] = useState(false);

  // Подгружаем комменты вебинара при открытии диалога + засчитываем просмотр.
  useEffect(() => {
    if (!openWebinar) return;
    const wid = openWebinar.id;
    let cancelled = false;
    if (!webinarComments[wid]) {
      academyApi.webinarComments(wid)
        .then(rows => {
          if (cancelled) return;
          const mapped = rows.map(c => {
            const initials = (c.authorName || 'А').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
            return {
              id: c.id,
              author: c.authorName,
              initials,
              text: c.text,
              date: (c.createdAt || '').slice(0, 10).split('-').reverse().slice(0, 2).join('.'),
              isMe: false,
            };
          });
          setWebinarComments(prev => ({ ...prev, [wid]: mapped }));
        })
        .catch(() => { /* tolerate */ });
    }
    if (!viewedWebinars.has(wid)) {
      academyApi.trackWebinarView(wid)
        .then(res => {
          if (cancelled) return;
          setWebinarViewsOverride(prev => ({ ...prev, [wid]: res.views }));
          setViewedWebinars(prev => { const s = new Set(prev); s.add(wid); return s; });
        })
        .catch(() => { /* tolerate */ });
    }
    return () => { cancelled = true; };
  }, [openWebinar, webinarComments, viewedWebinars]);

  const getWebinarViews = (w: WebinarRecording) => webinarViewsOverride[w.id] ?? w.views;

  const isLessonDone = (courseId: number, lessonId: number, initial: boolean) =>
    lessonProgress[`${courseId}-${lessonId}`] ?? initial;

  const toggleLesson = (courseId: number, lessonId: number, initial: boolean) => {
    const key = `${courseId}-${lessonId}`;
    const currentDone = lessonProgress[key] ?? initial;
    const newDone = !currentDone;
    setLessonProgress(prev => ({ ...prev, [key]: newDone }));
    // Сохраняем прогресс на бэке. При ошибке — откатываем оптимистичную отметку,
    // иначе урок выглядит пройденным, а после reload прогресс «теряется» молча.
    academyApi.completeLesson(courseId, lessonId, newDone).catch(() => {
      setLessonProgress(prev => ({ ...prev, [key]: currentDone }));
    });
  };

  const getWebinarLikes = (w: WebinarRecording) => webinarLikeOverride[w.id] ?? w.likesCount;

  const toggleWebinarLike = (w: WebinarRecording) => {
    const liked = webinarLikes.has(w.id);
    // optimistic
    setWebinarLikes(prev => {
      const next = new Set(prev);
      if (liked) next.delete(w.id); else next.add(w.id);
      return next;
    });
    setWebinarLikeOverride(prev => ({ ...prev, [w.id]: getWebinarLikes(w) + (liked ? -1 : 1) }));
    academyApi.likeWebinar(w.id)
      .then(res => {
        setWebinarLikes(prev => {
          const s = new Set(prev);
          if (res.liked) s.add(w.id); else s.delete(w.id);
          return s;
        });
        setWebinarLikeOverride(prev => ({ ...prev, [w.id]: res.likes }));
      })
      .catch(() => { /* откат не делаем — UI остаётся оптимистичным */ });
  };

  const sendWebinarComment = async () => {
    if (!openWebinar || !webinarCommentDraft.trim() || webinarCommentSending) return;
    const text = webinarCommentDraft.trim();
    setWebinarCommentSending(true);
    try {
      const created = await academyApi.addWebinarComment(openWebinar.id, text);
      const initials = (created.authorName || 'А').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      setWebinarComments(prev => ({
        ...prev,
        [openWebinar.id]: [...(prev[openWebinar.id] || []), {
          id: created.id,
          author: created.authorName,
          initials,
          text: created.text,
          date: (created.createdAt || '').slice(0, 10).split('-').reverse().slice(0, 2).join('.'),
          isMe: true,
        }],
      }));
      setWebinarCommentDraft('');
    } catch {
      // поле не очищаем — пусть пользователь повторит
    } finally {
      setWebinarCommentSending(false);
    }
  };

  // Courses filter
  const courseCategories = Array.from(new Set(academyCourses.map(c => c.category)));
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const filteredCourses = courseFilter === 'all' ? academyCourses : academyCourses.filter(c => c.category === courseFilter);

  // Webinars filter
  const webinarTopics = Array.from(new Set(webinarRecordings.map(w => w.topic)));
  const [webinarFilter, setWebinarFilter] = useState<string>('all');
  const filteredWebinars = webinarFilter === 'all' ? webinarRecordings : webinarRecordings.filter(w => w.topic === webinarFilter);

  // Schedule
  const now = today();
  const [viewDate, setViewDate] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const monthEvents = useMemo(() =>
    academyEvents.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth();
    }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  , [viewDate, academyEvents]);

  const eventsOnSelected = useMemo(() =>
    academyEvents
      .filter(e => e.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  , [selectedDate, academyEvents]);

  const upcomingEvents = useMemo(() =>
    academyEvents
      .filter(e => new Date(`${e.date}T${e.endTime}`).getTime() >= today().getTime())
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .slice(0, 5)
  , [academyEvents]);

  const completed = academyCourses.filter(c => c.completed).length;
  const inProgress = academyCourses.filter(c => c.progress > 0 && !c.completed).length;
  const overallProgress = academyCourses.length
    ? Math.round(academyCourses.reduce((s, c) => s + c.progress, 0) / academyCourses.length)
    : 0;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // Невысокий экран (ноутбуки 10–15"): диалог во весь экран + видео ниже,
  // иначе плеер съедает всю высоту и комментарии/оценки уходят за край.
  const isShort = useMediaQuery('(max-height: 820px)');
  const compactDialog = isMobile || isShort;

  return (
    <Box>
      {/* Stats row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Всего курсов',     value: academyCourses.length,  color: '#C9A84C' },
          { label: 'Завершено',        value: completed,              color: '#22C55E' },
          { label: 'В процессе',       value: inProgress,             color: '#4361EE' },
          { label: 'Общий прогресс',   value: `${overallProgress}%`,  color: '#F59E0B' },
        ].map((s, i) => (
          <Grid size={{ xs: 6, md: 3 }} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>{s.label}</Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Main tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          mb: 3,
          minHeight: 44,
          '& .MuiTabs-indicator': { background: '#C9A84C', height: 3, borderRadius: 99 },
          '& .MuiTab-root': {
            color: '#64748B', fontWeight: 700, fontSize: { xs: 13, md: 14 }, textTransform: 'none',
            minHeight: 44, minWidth: 'auto', px: { xs: 1.25, md: 2 },
            '&.Mui-selected': { color: '#F1F5F9' },
          },
        }}
      >
        <Tab value="courses"    label="Курсы" icon={isMobile ? undefined : <MenuBookRoundedIcon />} iconPosition="start" />
        <Tab value="recordings" label={isMobile ? 'Вебинары' : 'Записи вебинаров'} icon={isMobile ? undefined : <OndemandVideoRoundedIcon />} iconPosition="start" />
        <Tab value="schedule"   label="Расписание" icon={isMobile ? undefined : <EventAvailableRoundedIcon />} iconPosition="start" />
      </Tabs>

      {/* === COURSES TAB === */}
      {tab === 'courses' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Chip label="Все темы" onClick={() => setCourseFilter('all')} sx={{ fontWeight: 700, cursor: 'pointer', background: courseFilter === 'all' ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.05)', color: courseFilter === 'all' ? '#C9A84C' : '#94A3B8', border: courseFilter === 'all' ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent' }} />
            {courseCategories.map(cat => {
              const c = courseCategoryColors[cat] || '#64748B';
              const active = courseFilter === cat;
              return (
                <Chip key={cat} label={cat} onClick={() => setCourseFilter(cat)}
                  sx={{ fontWeight: 700, cursor: 'pointer',
                    background: active ? alpha(c, 0.18) : 'rgba(255,255,255,0.05)',
                    color: active ? c : '#94A3B8',
                    border: active ? `1px solid ${alpha(c, 0.4)}` : '1px solid transparent' }} />
              );
            })}
          </Box>
          <Grid container spacing={2.5}>
            {filteredCourses.map((c, i) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={c.id}>
                <CourseCard c={c} delay={i} onOpen={setOpenCourse} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* === WEBINAR RECORDINGS TAB === */}
      {tab === 'recordings' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Chip label="Все темы" onClick={() => setWebinarFilter('all')} sx={{ fontWeight: 700, cursor: 'pointer', background: webinarFilter === 'all' ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.05)', color: webinarFilter === 'all' ? '#C9A84C' : '#94A3B8', border: webinarFilter === 'all' ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent' }} />
            {webinarTopics.map(topic => {
              const c = webinarTopicColors[topic] || '#64748B';
              const active = webinarFilter === topic;
              return (
                <Chip key={topic} label={topic} onClick={() => setWebinarFilter(topic)}
                  sx={{ fontWeight: 700, cursor: 'pointer',
                    background: active ? alpha(c, 0.18) : 'rgba(255,255,255,0.05)',
                    color: active ? c : '#94A3B8',
                    border: active ? `1px solid ${alpha(c, 0.4)}` : '1px solid transparent' }} />
              );
            })}
          </Box>
          <Grid container spacing={2.5}>
            {filteredWebinars.map((w, i) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={w.id}>
                <WebinarCard w={w} delay={i} onOpen={setOpenWebinar} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* === SCHEDULE TAB === */}
      {tab === 'schedule' && (
        <Grid container spacing={3}>
          {/* Left: calendar */}
          <Grid size={{ xs: 12, md: 7 }}>
            <MonthCalendar
              events={monthEvents}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              viewDate={viewDate}
              setViewDate={setViewDate}
            />

            {/* Format legend */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              {Object.entries(formatCfg).map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: v.color }} />
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 11 }}>{v.label}</Typography>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Right: selected day events + upcoming */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 0.3 }}>
                  {(() => {
                    const d = new Date(selectedDate);
                    const day = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                    return selectedDate === todayStr ? `Сегодня · ${day}` : day;
                  })()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', mb: 2, display: 'block' }}>
                  {eventsOnSelected.length === 0 ? 'Событий нет' : `${eventsOnSelected.length} ${eventsOnSelected.length === 1 ? 'событие' : eventsOnSelected.length < 5 ? 'события' : 'событий'}`}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <AnimatePresence>
                    {eventsOnSelected.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center', color: '#475569', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 2 }}>
                        <Typography variant="body2">Нет запланированных мероприятий</Typography>
                      </Box>
                    ) : eventsOnSelected.map(e => <EventCard key={e.id} e={e} />)}
                  </AnimatePresence>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 0.3 }}>
                  Ближайшие 5 мероприятий
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', mb: 2, display: 'block' }}>
                  С сегодняшнего дня вперёд
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {upcomingEvents.map(e => (
                    <Box key={e.id} onClick={() => { setSelectedDate(e.date); setViewDate(new Date(e.date)); }} sx={{ cursor: 'pointer' }}>
                      <EventCard e={e} compact />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ===== Course dialog ===== */}
      <Dialog open={!!openCourse} onClose={() => setOpenCourse(null)} maxWidth="md" fullWidth fullScreen={compactDialog}
        slotProps={{ paper: { sx: {
          background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)',
          border: '1px solid rgba(201,168,76,0.15)', borderRadius: 3,
          // На fullScreen (моб./низкий экран) учитываем «чёлку»/статус-бар iOS:
          // без этого крестик и заголовок уезжают под часы и не нажимаются.
          ...(compactDialog && {
            borderRadius: 0, border: 'none',
            pt: 'env(safe-area-inset-top)',
            pb: 'env(safe-area-inset-bottom)',
          }),
        } } }}
      >
        {openCourse && (() => {
          const catColor = courseCategoryColors[openCourse.category] || '#64748B';
          // Effective lesson completion (combine initial + local state).
          // На бэке у урока нет персонального флага completed — он берётся из course_progress отдельно.
          // Пока что считаем все уроки не начатыми по умолчанию (initial=false).
          // Бэк уже сам считает unlocked/completed по course_progress, но локальные
          // изменения через toggleLesson переопределяют (для оптимистичного UI).
          const lessonsWithState = (() => {
            const out: Array<typeof openCourse.lessons[number] & { done: boolean; unlocked: boolean }> = [];
            let prevDone = true;
            for (const l of (openCourse.lessons || [])) {
              const serverDone = !!l.completed;
              const done = isLessonDone(openCourse.id, l.id, serverDone);
              // Защищаем поля от undefined — иначе при рендере JSX может упасть.
              out.push({
                ...l,
                content: l.content || '',
                attachments: l.attachments || [],
                videoUrl: l.videoUrl || '',
                done,
                unlocked: prevDone,
              });
              prevDone = done;
            }
            return out;
          })();
          const doneCount = lessonsWithState.filter(l => l.done).length;
          const totalListed = lessonsWithState.length;
          const progressPct = totalListed > 0 ? Math.round((doneCount / totalListed) * 100) : openCourse.progress;
          const myRating = myRatings[openCourse.id] ?? 0;
          return (
            <>
              <Box sx={{ position: 'relative', height: 220, overflow: 'hidden' }}>
                <CoverImage
                  src={openCourse.coverUrl}
                  accentColor={catColor}
                  placeholderIcon={<SchoolRoundedIcon fontSize="inherit" />}
                />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,22,41,0.2) 0%, rgba(15,22,41,1) 100%)', pointerEvents: 'none' }} />
                <IconButton onClick={() => setOpenCourse(null)} sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', background: 'rgba(0,0,0,0.5)', '&:hover': { background: 'rgba(0,0,0,0.7)' } }}>
                  <CloseRoundedIcon />
                </IconButton>
                <Box sx={{ position: 'absolute', bottom: 16, left: 24, right: 24 }}>
                  <Chip label={openCourse.category} size="small" sx={{ background: alpha(catColor, 0.9), color: '#fff', fontWeight: 700, mb: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#F1F5F9' }}>{openCourse.title}</Typography>
                </Box>
              </Box>
              <DialogContent sx={{ p: 3 }}>
                <Typography variant="body2" sx={{ color: '#CBD5E1', mb: 2 }}>{openCourse.description}</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
                  <Chip icon={<AccessTimeRoundedIcon />} label={openCourse.duration} sx={{ background: 'rgba(67,97,238,0.12)', color: '#60A5FA' }} />
                  <Chip icon={<MenuBookRoundedIcon />} label={`${openCourse.totalLessons} уроков`} sx={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }} />
                  <Chip label={openCourse.level} sx={{ background: alpha(levelColor[openCourse.level] || '#64748B', 0.15), color: levelColor[openCourse.level] || '#94A3B8', fontWeight: 700 }} />
                  <Chip icon={<PeopleRoundedIcon />} label={`Автор: ${openCourse.authorName}`} sx={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8' }} />
                </Box>

                {/* Progress */}
                <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>Ваш прогресс</Typography>
                    <Typography variant="caption" sx={{ color: progressPct === 100 ? '#22C55E' : '#C9A84C', fontWeight: 800 }}>
                      {doneCount}/{totalListed} уроков · {progressPct}%
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progressPct} sx={{ height: 6, borderRadius: 99 }} />
                </Box>

                {/* Rating */}
                <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(201,168,76,0.05)', border: '1px dashed rgba(201,168,76,0.25)', mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>Ваша оценка курса</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                      {myRating ? `Вы поставили ${myRating}/5` : 'Поставьте оценку — это поможет другим агентам'}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating
                      value={myRating}
                      size="large"
                      onChange={(_, v) => {
                        const rating = v || 0;
                        setMyRatings(prev => ({ ...prev, [openCourse.id]: rating }));
                        if (rating >= 1) {
                          academyApi.rate(openCourse.id, rating).catch(() => { /* tolerate */ });
                        }
                      }}
                      icon={<StarRoundedIcon sx={{ color: '#F59E0B' }} fontSize="inherit" />}
                      emptyIcon={<StarRoundedIcon sx={{ color: '#475569' }} fontSize="inherit" />}
                    />
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 11, ml: 1 }}>
                      средняя <b style={{ color: '#F59E0B' }}>{openCourse.rating}</b>
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 1.5 }}>Программа курса</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {lessonsWithState.map(l => {
                    const expanded = expandedLessonId === l.id;
                    const locked = !l.unlocked;
                    return (
                      <Box key={l.id} sx={{ borderRadius: 2, overflow: 'hidden',
                        background: locked ? 'rgba(255,255,255,0.015)' : (l.done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.025)'),
                        border: locked ? '1px solid rgba(255,255,255,0.04)' : (l.done ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.05)'),
                        opacity: locked ? 0.55 : 1,
                      }}>
                        <Box
                          onClick={() => !locked && setExpandedLessonId(expanded ? null : l.id)}
                          sx={{
                            p: 1.5,
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            cursor: locked ? 'not-allowed' : 'pointer',
                            '&:hover': !locked ? { background: 'rgba(201,168,76,0.06)' } : {},
                            transition: 'background 0.15s',
                          }}
                        >
                          {locked ? (
                            <LockRoundedIcon sx={{ color: '#64748B', fontSize: 22, ml: 0.5 }} />
                          ) : (
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); toggleLesson(openCourse.id, l.id, false); }}
                              sx={{ p: 0.3 }}
                            >
                              {l.done
                                ? <CheckCircleRoundedIcon sx={{ color: '#22C55E', fontSize: 22 }} />
                                : <PlayCircleRoundedIcon sx={{ color: '#94A3B8', fontSize: 22 }} />}
                            </IconButton>
                          )}
                          <Typography variant="body2" sx={{ color: '#F1F5F9', flex: 1, textDecoration: l.done ? 'line-through' : 'none', opacity: l.done ? 0.7 : 1 }}>{l.title}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748B' }}>{l.duration}</Typography>
                          {!locked && (
                            <ChevronRightRoundedIcon sx={{ color: '#64748B', fontSize: 18, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                          )}
                        </Box>
                        {expanded && !locked && (() => {
                          const hasVideo = !!l.videoUrl;
                          const hasContent = !!(l.content && l.content.trim());
                          const hasAttachments = !!(l.attachments && l.attachments.length > 0);
                          const empty = !hasVideo && !hasContent && !hasAttachments;
                          return (
                          <Box>
                            {hasVideo && (
                              <Box sx={{ background: '#000' }}>
                                <VideoPlayer src={l.videoUrl} />
                              </Box>
                            )}
                            {hasContent && (
                              <Box sx={{ p: 2.5, background: 'rgba(0,0,0,0.2)' }}>
                                <Typography variant="body2" sx={{ color: '#E2E8F0', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                                  {l.content}
                                </Typography>
                              </Box>
                            )}
                            {hasAttachments && (
                              <Box sx={{ p: 1.5, background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                  Материалы урока
                                </Typography>
                                <Stack spacing={0.8}>
                                  {l.attachments!.map((a, i) => (
                                    <Box key={`${a.url}-${i}`}
                                      component="a" href={a.url} target="_blank" rel="noopener noreferrer"
                                      sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.2, p: 1,
                                        borderRadius: 1.5, border: '1px solid rgba(201,168,76,0.15)',
                                        background: 'rgba(201,168,76,0.04)',
                                        textDecoration: 'none',
                                        '&:hover': { background: 'rgba(201,168,76,0.08)' },
                                      }}>
                                      <PictureAsPdfRoundedIcon sx={{ color: '#EF4444', fontSize: 20 }} />
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="caption" sx={{ color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontWeight: 600, fontSize: 12 }}>
                                          {a.name}
                                        </Typography>
                                        {a.size && (
                                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>
                                            {a.size < 1024 * 1024 ? `${Math.round(a.size / 1024)} КБ` : `${(a.size / (1024 * 1024)).toFixed(1)} МБ`}
                                          </Typography>
                                        )}
                                      </Box>
                                      <DownloadRoundedIcon sx={{ color: '#C9A84C', fontSize: 18 }} />
                                    </Box>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                            {empty && (
                              <Box sx={{ p: 4, textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                <MenuBookRoundedIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.15)', mb: 1 }} />
                                <Typography variant="body2" sx={{ color: '#94A3B8', mb: 0.5 }}>
                                  Материалы для этого урока ещё не добавлены
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
                                  Администратор скоро загрузит видео, описание или PDF. А пока — отметь пройденным когда будешь готов
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, background: 'rgba(0,0,0,0.3)' }}>
                              <Typography variant="caption" sx={{ color: '#94A3B8', flex: 1 }}>
                                {empty ? '' : 'Изучи материалы и отметь пройденным'}
                              </Typography>
                              <Button
                                size="small"
                                variant={l.done ? 'outlined' : 'contained'}
                                onClick={() => toggleLesson(openCourse.id, l.id, false)}
                                sx={{ fontSize: 11, flexShrink: 0 }}
                              >
                                {l.done ? 'Снять отметку' : 'Отметить пройденным'}
                              </Button>
                            </Box>
                          </Box>
                          );
                        })()}
                      </Box>
                    );
                  })}
                </Box>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 1.5, fontStyle: 'italic' }}>
                  Уроки открываются последовательно: следующий доступен после прохождения предыдущего.
                </Typography>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>

      {/* ===== Webinar recording dialog ===== */}
      <Dialog open={!!openWebinar} onClose={() => setOpenWebinar(null)} maxWidth="md" fullWidth fullScreen={compactDialog}
        slotProps={{ paper: { sx: {
          background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)',
          border: '1px solid rgba(201,168,76,0.15)', borderRadius: 3,
          ...(compactDialog && {
            borderRadius: 0, border: 'none',
            pt: 'env(safe-area-inset-top)',
            pb: 'env(safe-area-inset-bottom)',
          }),
        } } }}
      >
        {openWebinar && (() => {
          const c = webinarTopicColors[openWebinar.topic] || '#64748B';
          const isLiked = webinarLikes.has(openWebinar.id);
          const comments = webinarComments[openWebinar.id] || [];
          return (
            <>
              {/* Header диалога с кнопкой закрытия — над плеером, чтобы не мешать UI Kinescope */}
              <Box sx={{
                display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                px: 1.5, py: 1,
                background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)',
                borderBottom: '1px solid rgba(201,168,76,0.08)',
              }}>
                <IconButton onClick={() => setOpenWebinar(null)} size="small" sx={{ color: '#94A3B8', '&:hover': { color: '#fff' } }}>
                  <CloseRoundedIcon />
                </IconButton>
              </Box>

              {/* Video player (Kinescope / YouTube / mp4 / placeholder).
                  На невысоких экранах ограничиваем высоту, чтобы комментарии/оценки
                  ниже оставались доступны скроллом. */}
              <VideoPlayer src={openWebinar.videoUrl} poster={openWebinar.coverUrl}
                height={compactDialog ? 'min(46vh, 420px)' : undefined} />

              <DialogContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip label={openWebinar.topic} size="small" sx={{ background: alpha(c, 0.18), color: c, fontWeight: 700 }} />
                      {openWebinar.isNew && <Chip icon={<FiberNewRoundedIcon sx={{ fontSize: 14 }} />} label="NEW" size="small" sx={{ background: '#EF4444', color: '#fff', fontWeight: 800, '& .MuiChip-icon': { color: '#fff' } }} />}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: '#F1F5F9', lineHeight: 1.3 }}>{openWebinar.title}</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                      {new Date(openWebinar.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {openWebinar.duration && ` · ⏱ ${openWebinar.duration}`}
                      {` · 🎤 ${openWebinar.speakerName}`}
                      {` · 👁 ${getWebinarViews(openWebinar).toLocaleString('ru-RU')}`}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={isLiked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                    onClick={() => toggleWebinarLike(openWebinar)}
                    sx={{
                      borderRadius: 2, px: 1.5,
                      color: isLiked ? '#EF4444' : '#94A3B8',
                      background: isLiked ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                      '&:hover': { background: isLiked ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)', color: '#EF4444' },
                    }}
                  >
                    {getWebinarLikes(openWebinar)}{isLiked ? ' · нравится' : ''}
                  </Button>
                </Box>

                <Typography variant="body1" sx={{ color: '#CBD5E1', lineHeight: 1.7, mb: 2 }}>{openWebinar.description}</Typography>

                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} />

                {/* Comments */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                  Комментарии ({comments.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5, mb: 2 }}>
                  <AnimatePresence>
                    {comments.length === 0
                      ? <Typography variant="caption" sx={{ color: '#475569', textAlign: 'center', py: 2 }}>Пока никто не комментировал. Будьте первым!</Typography>
                      : comments.map(comm => (
                        <motion.div key={comm.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
                          <Box sx={{
                            p: 1.5, borderRadius: 2, display: 'flex', gap: 1.5,
                            background: comm.isMe ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.025)',
                            border: comm.isMe ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.05)',
                          }}>
                            <Box sx={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: comm.isMe ? 'linear-gradient(135deg, #C9A84C, #E2C97E)' : 'rgba(100,116,139,0.4)',
                              color: comm.isMe ? '#0A0E1A' : '#F1F5F9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 800, flexShrink: 0,
                            }}>
                              {comm.initials}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
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
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                    {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </Box>
                  <TextField
                    fullWidth multiline maxRows={4} size="small"
                    placeholder="Написать комментарий…"
                    value={webinarCommentDraft}
                    onChange={e => setWebinarCommentDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendWebinarComment(); } }}
                  />
                  <Button onClick={sendWebinarComment} disabled={!webinarCommentDraft.trim() || webinarCommentSending} variant="contained" sx={{ minWidth: 0, px: 1.5, py: 1, alignSelf: 'stretch' }}>
                    <SendRoundedIcon fontSize="small" />
                  </Button>
                </Box>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
