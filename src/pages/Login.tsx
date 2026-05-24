import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, InputAdornment, IconButton, Divider, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { loginAgent, trySsoFromUrl } from '../auth/auth';
import Logo from '../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('mk@w24.agency');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const sso = trySsoFromUrl();
    if (sso) setEmail(sso.ssoEmail);
  }, []);

  const handleLogin = async () => {
    setError(null); setInfo(null);
    setLoading(true);
    const result = await loginAgent(email, password);
    if (result.ok) {
      navigate('/dashboard');
    } else {
      setLoading(false);
      if (result.redirectTo) {
        setInfo(result.error);
        setTimeout(() => { window.location.href = result.redirectTo!; }, 1500);
      } else {
        setError(result.error);
      }
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(67,97,238,0.1) 0%, transparent 50%), #080C18',
      p: 2,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      {[...Array(5)].map((_, i) => (
        <motion.div key={i}
          animate={{ y: [0, -20, 0], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.8 }}
          style={{
            position: 'absolute',
            width: 200 + i * 80,
            height: 200 + i * 80,
            borderRadius: '50%',
            border: '1px solid rgba(201,168,76,0.1)',
            top: `${10 + i * 15}%`,
            left: `${5 + i * 18}%`,
            pointerEvents: 'none',
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 440, zIndex: 1 }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <Box sx={{
              mx: 'auto', mb: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              filter: 'drop-shadow(0 8px 32px rgba(201,168,76,0.3))',
            }}>
              <Logo variant="full" size={68} color="#F1F5F9" />
            </Box>
          </motion.div>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Цифровая платформа для агентов
          </Typography>
        </Box>

        <Card sx={{
          background: 'linear-gradient(135deg, rgba(15,22,41,0.95) 0%, rgba(12,18,35,0.98) 100%)',
          border: '1px solid rgba(201,168,76,0.15)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(30px)',
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#F1F5F9', mb: 0.5 }}>
              Добро пожаловать
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
              Войдите в свой аккаунт агента
            </Typography>

            {info && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{info}</Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
            )}

            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><EmailRoundedIcon sx={{ color: '#64748B', fontSize: 20 }} /></InputAdornment>
                }}
              />
              <TextField
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockRoundedIcon sx={{ color: '#64748B', fontSize: 20 }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} size="small" sx={{ color: '#64748B' }}>
                        {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Box sx={{ textAlign: 'right', mt: -1 }}>
                <Typography variant="caption" sx={{ color: '#C9A84C', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                  Забыли пароль?
                </Typography>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{ py: 1.5, fontSize: 16, fontWeight: 800 }}
              >
                {loading ? 'Входим...' : 'Войти'}
              </Button>
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.06)' }}>
              <Typography variant="caption" sx={{ color: '#4B5563', px: 1 }}>или</Typography>
            </Divider>

            <Typography variant="body2" sx={{ textAlign: 'center', color: '#64748B' }}>
              Нет аккаунта?{' '}
              <span style={{ color: '#C9A84C', cursor: 'pointer', fontWeight: 700 }}>
                Зарегистрироваться
              </span>
            </Typography>
          </CardContent>
        </Card>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#4B5563', mt: 3 }}>
          © 2026 Welcome 24. Все права защищены.
        </Typography>
      </motion.div>
    </Box>
  );
}
