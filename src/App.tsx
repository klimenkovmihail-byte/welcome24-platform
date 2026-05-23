import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import { tryImpersonationFromUrl, trySsoFromUrl } from './auth/auth';
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
    // Auto-handle inbound SSO / impersonation params at app startup
    trySsoFromUrl();
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
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
