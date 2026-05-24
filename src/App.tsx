import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import { tryImpersonationFromUrl, fetchMe, getCurrentAgent } from './auth/auth';
import { getToken } from './api/apiClient';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!getToken() || !getCurrentAgent()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rating from './pages/Rating';
import Academy from './pages/Academy';
import News from './pages/News';
import Team from './pages/Team';
import Agents from './pages/Agents';
import Profile from './pages/Profile';
import Shares from './pages/Shares';

export default function App() {
  useEffect(() => {
    // На старте — валидируем токен через GET /api/auth/me (в фоне, без блокировки UI).
    fetchMe();
    tryImpersonationFromUrl();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/rating" element={<Rating />} />
                  <Route path="/academy" element={<Academy />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/shares" element={<Shares />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
