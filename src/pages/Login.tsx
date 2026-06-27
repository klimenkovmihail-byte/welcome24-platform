import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, InputAdornment, IconButton, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { loginAgent, trySsoFromUrl } from '../auth/auth';
import Logo from '../components/Logo';
import Activation from './Activation';

// Кастомизация полей Email/Пароль: убираем уродливую сине-жёлтую подсветку
// Chrome autofill и закругляем фон чтобы выглядело однородно с тёмной темой.
const loginFieldSx = {
  '& .MuiOutlinedInput-root': {
    background: 'rgba(15,22,41,0.7)',
    '& fieldset': { borderColor: 'rgba(201,168,76,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(201,168,76,0.35)' },
    '&.Mui-focused fieldset': { borderColor: '#C9A84C' },
  },
  '& input': {
    color: '#F1F5F9',
  },
  // Chrome / Safari autofill — убираем сине-жёлтую заливку
  '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active': {
    WebkitBoxShadow: '0 0 0 1000px rgba(15,22,41,0.7) inset !important',
    WebkitTextFillColor: '#F1F5F9 !important',
    caretColor: '#F1F5F9',
    transition: 'background-color 5000s ease-in-out 0s',
  },
};

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

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
      background: `
        radial-gradient(ellipse at 15% 30%, rgba(201,168,76,0.12) 0%, transparent 45%),
        radial-gradient(ellipse at 85% 70%, rgba(67,97,238,0.14) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 100%, rgba(123,47,190,0.08) 0%, transparent 60%),
        #050811
      `,
      p: 2,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Grid pattern — золотистая сетка, более заметная */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(201,168,76,0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(201,168,76,0.12) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 90%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 90%)',
      }} />

      {/* Цифровая сеть — анимированные узлы и линии */}
      <NetworkMesh />

      {/* Большие размытые свечения — глубина и атмосфера */}
      {[
        { x: '10%', y: '15%', color: 'rgba(201,168,76,0.45)', size: 550 },
        { x: '85%', y: '20%', color: 'rgba(67,97,238,0.42)', size: 650 },
        { x: '20%', y: '85%', color: 'rgba(123,47,190,0.40)', size: 600 },
        { x: '90%', y: '90%', color: 'rgba(201,168,76,0.30)', size: 480 },
        { x: '50%', y: '50%', color: 'rgba(67,97,238,0.20)', size: 800 },
      ].map((g, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, delay: i * 1.2 }}
          style={{
            position: 'absolute',
            width: g.size, height: g.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${g.color} 0%, transparent 70%)`,
            top: g.y, left: g.x,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Парящие золотые искры */}
      {[...Array(18)].map((_, i) => (
        <motion.div key={`spark-${i}`}
          animate={{
            y: [0, -30 - (i % 5) * 10, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 5 + (i % 4),
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            borderRadius: '50%',
            background: i % 3 === 0 ? '#C9A84C' : i % 3 === 1 ? '#4361EE' : '#7B2FBE',
            top: `${(i * 53) % 95 + 2}%`,
            left: `${(i * 37) % 95 + 2}%`,
            boxShadow: i % 3 === 0
              ? '0 0 12px rgba(201,168,76,0.8)'
              : i % 3 === 1
              ? '0 0 12px rgba(67,97,238,0.8)'
              : '0 0 12px rgba(123,47,190,0.8)',
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
              <Logo variant="full" size={150} premium />
            </Box>
          </motion.div>
          <Box sx={{ mt: 1.5 }}>
            <Typography sx={{
              color: '#E2C97E', fontSize: 17, fontWeight: 700,
              letterSpacing: '0.03em', lineHeight: 1.3,
              textShadow: '0 2px 12px rgba(201,168,76,0.4)',
            }}>
              Цифровая платформа
            </Typography>
            <Typography sx={{
              color: '#94A3B8', fontSize: 14, fontWeight: 500,
              letterSpacing: '0.01em', lineHeight: 1.3, mt: 0.3,
            }}>
              для предпринимателей в недвижимости
            </Typography>
          </Box>
        </Box>

        <Card sx={{
          background: 'linear-gradient(135deg, rgba(15,22,41,0.95) 0%, rgba(12,18,35,0.98) 100%)',
          border: '1px solid rgba(201,168,76,0.15)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(30px)',
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 0.5 }}>
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
                sx={loginFieldSx}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: <InputAdornment position="start"><EmailRoundedIcon sx={{ color: '#64748B', fontSize: 20 }} /></InputAdornment>,
                  },
                }}
              />
              <TextField
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                fullWidth
                sx={loginFieldSx}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: <InputAdornment position="start"><LockRoundedIcon sx={{ color: '#64748B', fontSize: 20 }} /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} size="small" sx={{ color: '#64748B' }}>
                          {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Box sx={{ textAlign: 'right', mt: -1 }}>
                <Typography
                  variant="caption"
                  onClick={() => setForgotOpen(true)}
                  sx={{ color: '#C9A84C', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                >
                  Первый вход · Забыли пароль?
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

            <Box sx={{
              mt: 3, p: 2, borderRadius: 2,
              background: 'rgba(201,168,76,0.05)',
              border: '1px solid rgba(201,168,76,0.12)',
              textAlign: 'center',
            }}>
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', lineHeight: 1.6 }}>
                Портал доступен только партнёрам компании <b style={{ color: '#C9A84C' }}>Welcome 24</b>.
                Если ты хочешь стать агентом — свяжись с нами через сайт{' '}
                <a href="https://w24.agency" target="_blank" rel="noopener noreferrer"
                  style={{ color: '#C9A84C', textDecoration: 'none', fontWeight: 700 }}>
                  w24.agency
                </a>.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#4B5563', mt: 3 }}>
          © 2026 Welcome 24. Все права защищены.
        </Typography>
      </motion.div>

      {/* Первый вход / восстановление пароля — самоактивация (телефон-звонком + email + пароль) */}
      <Activation open={forgotOpen} onClose={() => setForgotOpen(false)} onDone={() => navigate('/dashboard')} />
    </Box>
  );
}

// ---------- Цифровая сеть (узлы + линии) ----------
// Декоративный canvas на фоне логина: 35 узлов медленно перемещаются,
// соединяются линиями если оказались близко. Символизирует MLM-сеть
// и цифровую платформу. ~60 fps, не нагружает CPU.
function NetworkMesh() {
  const [el, setEl] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const canvas = el;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      // setTransform вместо scale: иначе при ресайзе масштаб накапливается
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Инициализация узлов — больше + крупнее
    const COUNT = window.innerWidth < 768 ? 30 : 60;
    nodes = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.5 + Math.random() * 2,
    }));

    const tick = () => {
      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Двигаем узлы
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      // Рисуем линии (только если узлы близко) — заметно ярче
      ctx.lineWidth = 1.2;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          const MAX_DIST = 180;
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.55;
            ctx.strokeStyle = `rgba(201, 168, 76, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Рисуем узлы — ярче и с свечением
      for (const n of nodes) {
        ctx.fillStyle = 'rgba(226, 201, 126, 0.95)';
        ctx.shadowColor = 'rgba(201, 168, 76, 1)';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el]);

  return (
    <canvas
      ref={setEl}
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
