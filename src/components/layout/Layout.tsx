import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ImpersonationBanner from './ImpersonationBanner';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#080C18' }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <ImpersonationBanner />
        <Header currentPath={location.pathname} />
        <Box sx={{ flex: 1, p: 4, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
