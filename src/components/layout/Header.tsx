import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar, Chip, IconButton, Badge, Tooltip, Button, Popover, Divider, List, ListItem, ListItemAvatar, ListItemText, Menu, MenuItem } from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { motion } from 'framer-motion';
import { openAdminPanel, logoutAgent } from '../../auth/auth';
import SmartAvatar from '../SmartAvatar';
import { useMe } from '../../hooks/useMe';
import { notificationsApi, type Notification as ApiNotification } from '../../api/notifications';
import { sseSubscribe } from '../../lib/sse';
import { sharesApi } from '../../api/shares';
import { formatMoney } from '../../utils/format';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Дашборд', subtitle: 'Суббота, 23 мая 2026 г.' },
  '/rating': { title: 'Рейтинг агентов', subtitle: 'Лучшие агенты Welcome 24' },
  '/academy': { title: 'Академия', subtitle: 'Обучение и развитие' },
  '/news': { title: 'Новости', subtitle: 'Последние события компании' },
  '/docs': { title: 'База данных', subtitle: 'Документы, регламенты, шаблоны' },
  '/ai':   { title: 'AI-помощник', subtitle: 'Инструменты ИИ для ускорения работы' },
  '/cases': { title: 'Заявки специалистам', subtitle: 'Юристы и брокеры Welcome 24' },
  '/team': { title: 'Моя MLM-структура', subtitle: 'Уровни команды и пассивный доход' },
  '/backoffice': { title: 'Команда Welcome 24', subtitle: 'Бэк-офис: к кому обращаться' },
  '/agents': { title: 'База агентов', subtitle: 'Поиск и контакты' },
  '/shares': { title: 'Акции Welcome 24', subtitle: 'Котировки, портфель, динамика' },
  '/profile': { title: 'Профиль', subtitle: 'Личные данные и настройки' },
};

interface NotifUi {
  id: number;
  type: ApiNotification['type'];
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  link: string | null;
}

function relativeTime(iso: string): string {
  if (!iso) return '';
  const t = new Date(iso.replace(' ', 'T') + 'Z').getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  if (diff < 60_000)        return 'только что';
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)} мин назад`;
  if (diff < 86_400_000)    return `${Math.floor(diff / 3_600_000)} ч назад`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} дн назад`;
  // Из t, не из сырого iso: "YYYY-MM-DD HH:MM:SS" Safari не парсит (Invalid Date).
  return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  deal:    { icon: <HandshakeRoundedIcon sx={{ fontSize: 18 }} />, color: '#22C55E' },
  shares:  { icon: <DiamondRoundedIcon sx={{ fontSize: 18 }} />, color: '#C9A84C' },
  news:    { icon: <ArticleRoundedIcon sx={{ fontSize: 18 }} />, color: '#3B82F6' },
  team:    { icon: <PersonRoundedIcon sx={{ fontSize: 18 }} />, color: '#8B5CF6' },
  agent:   { icon: <PersonRoundedIcon sx={{ fontSize: 18 }} />, color: '#8B5CF6' },
  alert:   { icon: <NotificationsRoundedIcon sx={{ fontSize: 18 }} />, color: '#EF4444' },
  support: { icon: <NotificationsRoundedIcon sx={{ fontSize: 18 }} />, color: '#4361EE' },
  payment: { icon: <DiamondRoundedIcon sx={{ fontSize: 18 }} />, color: '#F59E0B' },
  system:  { icon: <SettingsRoundedIcon sx={{ fontSize: 18 }} />, color: '#64748B' },
};
const defaultTypeCfg = typeConfig.system;

interface HeaderProps {
  currentPath: string;
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export default function Header({ currentPath, isMobile = false, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const page = pageTitles[currentPath] || { title: 'Welcome 24', subtitle: '' };
  const { data: user } = useMe();
  // For demo: show "Admin panel" button if no user logged in too (CEO testing flow)
  const isAdmin = !user || user.role === 'admin';
  // Дашборд показывает сегодняшнюю дату (раньше была захардкожена).
  const subtitle = currentPath === '/dashboard'
    ? (() => { const d = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return d.charAt(0).toUpperCase() + d.slice(1); })()
    : page.subtitle;

  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [notifs, setNotifs] = useState<NotifUi[]>([]);
  const [shares, setShares] = useState({ qty: 0, value: 0, growthPct: 0, isMostlyGifted: false });
  const unreadCount = notifs.filter(n => n.unread).length;

  // Загрузка акций (мои пакеты + последняя котировка).
  useEffect(() => {
    let cancelled = false;
    Promise.all([sharesApi.myPackets().catch(() => []), sharesApi.quotes().catch(() => [])])
      .then(([packets, quotes]) => {
        if (cancelled) return;
        const sign = (p: typeof packets[number]) => p.type === 'sale' ? -1 : 1;
        const qty = packets.reduce((s, p) => s + sign(p) * p.quantity, 0);
        const cost = packets.reduce((s, p) => s + sign(p) * p.quantity * p.acquiredPrice, 0);
        const price = quotes.length ? quotes[quotes.length - 1].price : 0;
        const value = qty * price;
        const growthPct = cost > 0 ? ((value - cost) / cost) * 100 : 0;
        const avgPrice = qty > 0 ? cost / qty : 0;
        // Бонусные акции — выданные по номиналу 1 ₽ (за первую сделку, рекрута, 2 млн ВКД и т.п.).
        const isMostlyGifted = avgPrice > 0 && avgPrice <= 1;
        setShares({ qty, value, growthPct, isMostlyGifted });
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      notificationsApi.list()
        .then(rows => {
          if (cancelled) return;
          setNotifs(rows.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            desc: n.description,
            time: relativeTime(n.createdAt),
            unread: !n.readAt,
            link: n.link,
          })));
        })
        .catch(() => { /* tolerate */ });
    };
    load();
    // SSE: колокол оживает мгновенно при новом уведомлении (раньше — до перезагрузки).
    const off = sseSubscribe('notify', load);
    return () => { cancelled = true; off(); };
  }, []);

  const handleMarkAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
    notificationsApi.markAllRead().catch(() => { /* tolerate */ });
  };

  // Клик по уведомлению: проваливаемся по ссылке (новость / заявка / пакет / сделка)
  // и отмечаем это уведомление прочитанным. Раньше клик ничего не делал.
  const handleNotifClick = (n: NotifUi) => {
    setNotifAnchor(null);
    if (n.unread) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
      notificationsApi.markRead(n.id).catch(() => { /* tolerate */ });
    }
    if (n.link) {
      // В БД лежит относительный путь ('/cases?open=5'); на всякий случай поддержим и полный URL.
      let to = n.link;
      if (/^https?:\/\//.test(to)) { try { const u = new URL(to); to = u.pathname + u.search; } catch { /* ignore */ } }
      navigate(to);
    }
  };

  const handleLogout = () => {
    setMenuAnchor(null);
    logoutAgent();
    navigate('/login');
  };

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: { xs: 2, md: 4 },
      // Верхний отступ учитывает «чёлку»/статус-бар iOS (safe-area), чтобы шапка
      // закрашивала эту зону в тёмный, а контент не лез под часы.
      pt: { xs: 'calc(env(safe-area-inset-top) + 12px)', md: 'calc(env(safe-area-inset-top) + 20px)' },
      pb: { xs: 1.5, md: 2.5 },
      background: 'linear-gradient(90deg, rgba(13,22,40,0.97) 0%, rgba(8,12,24,0.99) 100%)',
      borderBottom: '1px solid rgba(201,168,76,0.08)',
      backdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 100,
      gap: 1,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        {isMobile && (
          <IconButton
            onClick={onMenuClick}
            sx={{ color: '#C9A84C', '&:hover': { background: 'rgba(201,168,76,0.08)' } }}
          >
            <MenuRoundedIcon />
          </IconButton>
        )}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={currentPath} style={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, color: '#F1F5F9', lineHeight: 1.2, fontSize: { xs: 18, md: 24 }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {page.title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
            {subtitle}
          </Typography>
        </motion.div>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
          <Tooltip title={shares.isMostlyGifted
            ? `Акции: ${shares.qty} шт · бонусные`
            : `Акции: ${shares.qty} шт · рост ${shares.growthPct.toFixed(1)}%`
          }>
            <Chip
              icon={<TrendingUpRoundedIcon sx={{ fontSize: 16 }} />}
              label={`${shares.qty} акц.`}
              size="small"
              sx={{
                background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)',
                fontWeight: 700, '& .MuiChip-icon': { color: '#C9A84C' }
              }}
            />
          </Tooltip>
          <Tooltip title="Текущая стоимость портфеля акций">
            <Chip
              label={formatMoney(shares.value)}
              size="small"
              sx={{
                background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)',
                fontWeight: 700,
              }}
            />
          </Tooltip>
        </Box>

        {isAdmin && (
          <Tooltip title="Перейти в админ-панель">
            <Button
              size="small"
              variant="outlined"
              startIcon={<AdminPanelSettingsRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={openAdminPanel}
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                borderColor: 'rgba(239,68,68,0.35)',
                color: '#EF4444',
                fontWeight: 700,
                fontSize: 11,
                py: 0.4, px: 1.5,
                whiteSpace: 'nowrap',
                '&:hover': { borderColor: '#EF4444', background: 'rgba(239,68,68,0.08)' }
              }}
            >
              Админ-панель
            </Button>
          </Tooltip>
        )}

        <Tooltip title="Уведомления">
          <Badge badgeContent={unreadCount} sx={{ '& .MuiBadge-badge': { background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700 } }}>
            <IconButton
              size="small"
              onClick={(e) => setNotifAnchor(e.currentTarget)}
              sx={{ color: '#64748B', '&:hover': { color: '#C9A84C', background: 'rgba(201,168,76,0.08)' } }}
            >
              <NotificationsRoundedIcon />
            </IconButton>
          </Badge>
        </Tooltip>

        {/* Notifications Popover */}
        <Popover
          open={!!notifAnchor}
          anchorEl={notifAnchor}
          onClose={() => setNotifAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: {
            mt: 1.5, width: 380, maxHeight: 540,
            background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: 3,
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          } } }}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
            <Typography sx={{ fontWeight: 800, color: '#F1F5F9' }}>Уведомления</Typography>
            {unreadCount > 0 && (
              <Button size="small" startIcon={<DoneAllRoundedIcon sx={{ fontSize: 14 }} />} onClick={handleMarkAllRead} sx={{ color: '#C9A84C', fontSize: 11, py: 0.3 }}>
                Прочитать все
              </Button>
            )}
          </Box>
          <List sx={{ p: 0, maxHeight: 420, overflow: 'auto' }}>
            {notifs.map((n) => {
              const cfg = typeConfig[n.type] || defaultTypeCfg;
              return (
                <ListItem key={n.id} onClick={() => handleNotifClick(n)} sx={{
                  px: 2, py: 1.5,
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: n.unread ? 'rgba(201,168,76,0.04)' : 'transparent',
                  '&:hover': { background: 'rgba(201,168,76,0.08)' },
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  {n.unread && (
                    <Box sx={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                  )}
                  <ListItemAvatar>
                    <Avatar sx={{ background: `${cfg.color}20`, color: cfg.color, width: 36, height: 36 }}>
                      {cfg.icon}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: n.unread ? 700 : 500, fontSize: 13 }}>{n.title}</Typography>}
                    secondary={
                      <Box component="span">
                        <Typography variant="caption" component="span" sx={{ color: '#94A3B8', display: 'block', fontSize: 12 }}>{n.desc}</Typography>
                        <Typography variant="caption" component="span" sx={{ color: '#475569', display: 'block', fontSize: 11, mt: 0.3 }}>{n.time}</Typography>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
          <Box sx={{ p: 1.5, borderTop: '1px solid rgba(201,168,76,0.08)', textAlign: 'center' }}>
            <Button size="small" sx={{ color: '#C9A84C', fontSize: 12 }} onClick={() => { setNotifAnchor(null); }}>
              Все уведомления →
            </Button>
          </Box>
        </Popover>

        <Box
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', '&:hover': { opacity: 0.8 }, transition: 'opacity 0.2s' }}
        >
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#F1F5F9', display: 'block' }}>
              {(user?.name || '').split(' ').slice(0, 2).join(' ')}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>
              {user?.email || ''}
            </Typography>
          </Box>
          <SmartAvatar
            src={(user?.photo as string | null) || null}
            name={user?.name || ''}
            size={36}
            fontSize={13}
            sx={{
              background: 'linear-gradient(135deg, #C9A84C, #E2C97E)',
              color: '#0A0E1A',
              border: '2px solid rgba(201,168,76,0.3)',
            }}
          />
        </Box>

        {/* User menu */}
        <Menu
          anchorEl={menuAnchor}
          open={!!menuAnchor}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: {
            mt: 1.5, minWidth: 220,
            background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: 2.5,
          } } }}
        >
          <MenuItem onClick={() => { setMenuAnchor(null); navigate('/profile'); }} sx={{ py: 1.2 }}>
            <PersonRoundedIcon sx={{ fontSize: 18, mr: 1.5, color: '#94A3B8' }} />
            <Typography variant="body2">Профиль</Typography>
          </MenuItem>
          <MenuItem onClick={() => { setMenuAnchor(null); navigate('/profile'); }} sx={{ py: 1.2 }}>
            <SettingsRoundedIcon sx={{ fontSize: 18, mr: 1.5, color: '#94A3B8' }} />
            <Typography variant="body2">Настройки</Typography>
          </MenuItem>
          {isAdmin && (
            <MenuItem onClick={() => { setMenuAnchor(null); openAdminPanel(); }} sx={{ py: 1.2 }}>
              <AdminPanelSettingsRoundedIcon sx={{ fontSize: 18, mr: 1.5, color: '#EF4444' }} />
              <Typography variant="body2" sx={{ color: '#EF4444', fontWeight: 700 }}>Админ-панель</Typography>
            </MenuItem>
          )}
          <Divider sx={{ borderColor: 'rgba(201,168,76,0.08)' }} />
          <MenuItem onClick={handleLogout} sx={{ py: 1.2 }}>
            <LogoutRoundedIcon sx={{ fontSize: 18, mr: 1.5, color: '#EF4444' }} />
            <Typography variant="body2" sx={{ color: '#EF4444' }}>Выйти</Typography>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
