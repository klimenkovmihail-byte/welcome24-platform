import { useEffect, useState, useCallback } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ImpersonationBanner from './ImpersonationBanner';
import PushBanner from './PushBanner';
import { syncPushSubscription } from '../../push';
import SubscriptionBar from '../SubscriptionBar';
import SubscriptionLockedView from '../SubscriptionLockedView';
import { subscriptionApi, type SubscriptionStatus } from '../../api/subscription';
import { getCurrentAgent } from '../../auth/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const agent = getCurrentAgent();

  const reload = useCallback(() => {
    if (!agent) return;
    subscriptionApi.me().then(setSubStatus).catch(() => { /* tolerate */ });
  }, [agent]);

  useEffect(() => {
    reload();
    // Перепроверяем статус при смене страницы (вдруг пользователь только что подал claim).
  }, [reload, location.pathname]);

  // Закрываем мобильный сайдбар при переходе на другую страницу.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Привязываем существующую push-подписку к текущему пользователю (на случай,
  // если в этом браузере раньше входил другой аккаунт).
  useEffect(() => {
    if (agent) syncPushSubscription();
  }, [agent?.id]);

  // Сотрудники / lifetime-VIP / нет статуса — обычное отображение, бар сам решит что показать.
  const showLocked = subStatus?.blocked === true;
  // На странице /login и /profile блокировку игнорируем — иначе залогиниться/сменить пароль нельзя.
  const allowedWhenBlocked = location.pathname === '/profile' || location.pathname.startsWith('/login');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#080C18' }}>
      <Sidebar isMobile={isMobile} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <ImpersonationBanner />
        <Header currentPath={location.pathname} isMobile={isMobile} onMenuClick={() => setMobileOpen(true)} />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Ограничиваем ширину контента и центрируем — иначе на широких мониторах
              (2K+) всё растягивается на всю ширину и выглядит разреженно. */}
          <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 4 } }}>
            {subStatus && agent?.id && (
              <SubscriptionBar status={subStatus} agentId={agent.id} onUpdated={reload} />
            )}
            {/* Мягкий баннер «Включить уведомления?» — не показываем на заблокированном экране */}
            {!(showLocked && !allowedWhenBlocked) && <PushBanner />}
            {showLocked && !allowedWhenBlocked && agent?.id
              ? <SubscriptionLockedView status={subStatus!} agentId={agent.id} onUpdated={reload} />
              : children
            }
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
