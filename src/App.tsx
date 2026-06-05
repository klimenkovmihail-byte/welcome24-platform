import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { theme } from './theme/theme';
import { tryImpersonationFromUrl, fetchMe, getCurrentAgent, isPortalPathAllowed, portalDefaultPath } from './auth/auth';
import { getToken } from './api/apiClient';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';

// Страницы грузятся лениво — каждая в своём чанке (recharts/тяжёлые экраны
// больше не тянутся в стартовый бандл).
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Rating = lazy(() => import('./pages/Rating'));
const Academy = lazy(() => import('./pages/Academy'));
const News = lazy(() => import('./pages/News'));
const Team = lazy(() => import('./pages/Team'));
const Backoffice = lazy(() => import('./pages/Backoffice'));
const Agents = lazy(() => import('./pages/Agents'));
const Profile = lazy(() => import('./pages/Profile'));
const Shares = lazy(() => import('./pages/Shares'));
const Docs = lazy(() => import('./pages/Docs'));
const AI = lazy(() => import('./pages/AI'));
const Requests = lazy(() => import('./pages/Requests'));

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress sx={{ color: '#C9A84C' }} />
    </Box>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!getToken() || !getCurrentAgent()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

// Гард по роли: партнёр привлечения видит только MLM/Акции/Профиль — остальное
// редиректит на его стартовую страницу (/team).
function RoleGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const role = getCurrentAgent()?.role;
  if (!isPortalPathAllowed(role, location.pathname)) {
    return <Navigate to={portalDefaultPath(role)} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    // СНАЧАЛА — обработать impersonateToken из URL (подменить токен на агентский).
    // ПОТОМ — валидация через /api/auth/me (вернёт уже агента, а не админа).
    tryImpersonationFromUrl();
    fetchMe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to={portalDefaultPath(getCurrentAgent()?.role)} replace />} />
            <Route path="/*" element={
              <PrivateRoute>
                <Layout>
                  <RoleGate>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/rating" element={<Rating />} />
                      <Route path="/academy" element={<Academy />} />
                      <Route path="/news" element={<News />} />
                      <Route path="/team" element={<Team />} />
                      <Route path="/backoffice" element={<Backoffice />} />
                      <Route path="/agents" element={<Agents />} />
                      <Route path="/shares" element={<Shares />} />
                      <Route path="/docs" element={<Docs />} />
                      <Route path="/ai" element={<AI />} />
                      <Route path="/cases" element={<Requests />} />
                      <Route path="/ad-requests" element={<Requests initialTab={1} />} />
                      <Route path="/ad-packages" element={<Requests initialTab={2} />} />
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </Suspense>
                  </RoleGate>
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
    </QueryClientProvider>
  );
}
