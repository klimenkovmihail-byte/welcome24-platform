import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, Chip, Tooltip, IconButton, Divider, Drawer, alpha, Badge } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import Logo, { LogoIcon } from '../Logo';
import { logoutAgent, getCurrentAgent, isPortalPathAllowed } from '../../auth/auth';
import SmartAvatar from '../SmartAvatar';
import { useRequestsData } from '../../hooks/useRequestsData';

const navItems = [
  { path: '/dashboard', label: 'Дашборд', icon: <DashboardRoundedIcon /> },
  { path: '/cases', label: 'Заявки', icon: <AssignmentRoundedIcon /> },
  { path: '/academy', label: 'Академия', icon: <SchoolRoundedIcon /> },
  { path: '/news', label: 'Новости', icon: <ArticleRoundedIcon /> },
  { path: '/ai', label: 'AI-помощник', icon: <AutoAwesomeRoundedIcon /> },
  { path: '/team', label: 'MLM', icon: <AccountTreeRoundedIcon /> },
  { path: '/shares', label: 'Акции', icon: <DiamondRoundedIcon /> },
  { path: '/docs', label: 'База данных', icon: <FolderRoundedIcon /> },
  { path: '/agents', label: 'База агентов', icon: <PeopleRoundedIcon /> },
  { path: '/backoffice', label: 'Команда', icon: <SupportAgentRoundedIcon /> },
  { path: '/rating', label: 'Рейтинг', icon: <EmojiEventsRoundedIcon /> },
  { path: '/profile', label: 'Профиль', icon: <AccountCircleRoundedIcon /> },
];

const getLevelColor = (level: number) => {
  if (level >= 3) return '#C9A84C';
  if (level >= 2) return '#94A3B8';
  return '#78716C';
};

interface SidebarProps {
  isMobile?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isMobile = false, mobileOpen = false, onClose = () => {} }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Текущий агент из сессии (раньше тут был demo-объект из mockData → у всех висел Клименков).
  const agent = getCurrentAgent();
  const userName = agent?.name || 'Агент';
  const userLevel = Number(agent?.level) || 1;
  const userPhoto = (agent?.photo as string | null) || null;

  // Бейдж непрочитанного на «Заявки» — из общего singleton-поллера (один цикл на всё
  // приложение, пауза при скрытой вкладке).
  const { cases, adRequests } = useRequestsData();
  const casesUnread = cases.filter(x => (x.unread || 0) > 0).length
    + adRequests.filter(x => (x.unread || 0) > 0).length;

  // На мобиле сайдбар всегда развёрнут (он в оверлее-drawer'е), мини-режим только на десктопе.
  const mini = !isMobile && collapsed;

  const handleNav = (path: string) => {
    // Повторный клик по активному пункту — «настоящая» навигация (новый location.key),
    // чтобы экран сбрасывался на обзор (напр. «Заявки» → карточки разделов, #5).
    if (path === location.pathname) navigate(path, { state: { reclick: Date.now() } });
    else navigate(path);
    if (isMobile) onClose();
  };

  const content = (
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0D1628 0%, #080C18 100%)',
        borderRight: '1px solid rgba(201,168,76,0.1)',
        position: isMobile ? 'static' : 'sticky',
        top: 0,
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <Box sx={{ p: mini ? 1.5 : 2.5, pt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: mini ? 0 : 1.5 }}>
          {mini ? (
            <LogoIcon size={48} color="#C9A84C" premium />
          ) : (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Logo variant="full" size={64} premium />
              </motion.div>
            </AnimatePresence>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(201,168,76,0.08)', mx: 2 }} />

        {/* Nav */}
        <List sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, py: 2, gap: 0.5, display: 'flex', flexDirection: 'column', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(201,168,76,0.25)', borderRadius: 2 } }}>
          {navItems.filter((item) => isPortalPathAllowed(agent?.role, item.path)).map((item) => {
            const active = location.pathname === item.path;
            const badge = item.path === '/cases' ? casesUnread : 0;
            return (
              <ListItem key={item.path} disablePadding>
                <Tooltip title={mini ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => handleNav(item.path)}
                    sx={{
                      borderRadius: 3,
                      minHeight: 48,
                      px: mini ? 1.5 : 2,
                      justifyContent: mini ? 'center' : 'flex-start',
                      position: 'relative',
                      overflow: 'hidden',
                      background: active ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.08))' : 'transparent',
                      border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                      color: active ? '#C9A84C' : '#94A3B8',
                      '&:hover': {
                        background: 'rgba(201,168,76,0.08)',
                        color: '#E2C97E',
                        border: '1px solid rgba(201,168,76,0.15)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {active && (
                      <Box sx={{
                        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                        width: 3, height: 24, background: '#C9A84C', borderRadius: '0 4px 4px 0',
                      }} />
                    )}
                    <ListItemIcon sx={{ minWidth: mini ? 0 : 36, color: 'inherit' }}>
                      <Badge badgeContent={badge} color="error" invisible={!badge} overlap="circular"
                        sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16, fontWeight: 800 } }}>
                        {item.icon}
                      </Badge>
                    </ListItemIcon>
                    <AnimatePresence>
                      {!mini && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                          <ListItemText
                            primary={item.label}
                            slotProps={{ primary: { style: { fontSize: 14, fontWeight: active ? 700 : 500 } } }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ borderColor: 'rgba(201,168,76,0.08)', mx: 2 }} />

        {/* User */}
        <Box sx={{ p: mini ? 1 : 2, pb: 2.5 }}>
          {!mini ? (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
              borderRadius: 3, background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.1)',
              cursor: 'pointer', '&:hover': { background: 'rgba(201,168,76,0.1)' },
              transition: 'all 0.2s',
            }} onClick={() => handleNav('/profile')}>
              <SmartAvatar src={userPhoto} name={userName} size={36} fontSize={14} sx={{
                background: `linear-gradient(135deg, ${getLevelColor(userLevel)}, ${alpha(getLevelColor(userLevel), 0.6)})`,
                color: '#0A0E1A',
              }} />
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#F1F5F9', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userName.split(' ')[0]} {userName.split(' ')[1]}
                </Typography>
                <Chip label={`Уровень ${userLevel}`} size="small" sx={{ height: 16, fontSize: 10, fontWeight: 700, background: alpha(getLevelColor(userLevel), 0.2), color: getLevelColor(userLevel), '& .MuiChip-label': { px: 1 } }} />
              </Box>
            </Box>
          ) : (
            <Tooltip title="Профиль" placement="right">
              <Box onClick={() => handleNav('/profile')} sx={{ mx: 'auto', cursor: 'pointer', width: 40 }}>
                <SmartAvatar src={userPhoto} name={userName} size={40} fontSize={14} sx={{
                  background: `linear-gradient(135deg, ${getLevelColor(userLevel)}, ${alpha(getLevelColor(userLevel), 0.6)})`,
                  color: '#0A0E1A',
                }} />
              </Box>
            </Tooltip>
          )}

          <Box sx={{ display: 'flex', justifyContent: mini ? 'center' : 'space-between', mt: 1, alignItems: 'center' }}>
            <Tooltip title={mini ? 'Выйти' : 'Выйти из аккаунта'} placement="right">
              <IconButton
                size="small"
                onClick={() => { logoutAgent(); navigate('/login'); }}
                sx={{ color: '#64748B', '&:hover': { color: '#EF4444', background: 'rgba(239,68,68,0.08)' } }}
              >
                <LogoutRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {!mini && !isMobile && (
              <IconButton size="small" onClick={() => setCollapsed(true)} sx={{ color: '#64748B', '&:hover': { color: '#C9A84C' } }}>
                <ChevronLeftRoundedIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {mini && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
              <IconButton size="small" onClick={() => setCollapsed(false)} sx={{ color: '#64748B', '&:hover': { color: '#C9A84C' } }}>
                <ChevronRightRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
      </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: { width: 260, border: 'none', backgroundColor: 'transparent', backgroundImage: 'none', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' } } }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <motion.div
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3 }}
      style={{ flexShrink: 0, overflow: 'hidden' }}
    >
      {content}
    </motion.div>
  );
}
