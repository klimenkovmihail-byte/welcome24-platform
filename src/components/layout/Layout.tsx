import { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ImpersonationBanner from './ImpersonationBanner';
import SubscriptionBar from '../SubscriptionBar';
import SubscriptionLockedView from '../SubscriptionLockedView';
import { subscriptionApi, type SubscriptionStatus } from '../../api/subscription';
import { getCurrentAgent } from '../../auth/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
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

  // Сотрудники / lifetime-VIP / нет статуса — обычное отображение, бар сам решит что показать.
  const showLocked = subStatus?.blocked === true;
  // На странице /login и /profile блокировку игнорируем — иначе залогиниться/сменить пароль нельзя.
  const allowedWhenBlocked = location.pathname === '/profile' || location.pathname.startsWith('/login');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#080C18' }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <ImpersonationBanner />
        <Header currentPath={location.pathname} />
        <Box sx={{ flex: 1, p: 4, overflow: 'auto' }}>
          {subStatus && agent?.id && (
            <SubscriptionBar status={subStatus} agentId={agent.id} onUpdated={reload} />
          )}
          {showLocked && !allowedWhenBlocked && agent?.id
            ? <SubscriptionLockedView status={subStatus!} agentId={agent.id} onUpdated={reload} />
            : children
          }
        </Box>
      </Box>
    </Box>
  );
}
