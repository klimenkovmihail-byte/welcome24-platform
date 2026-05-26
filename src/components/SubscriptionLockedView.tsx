/**
 * SubscriptionLockedView — заглушка вместо контента при blocked=true.
 *
 * Появляется когда у агента 2+ просроченных периода АП. Залогиниться может,
 * но всё что увидит — это призыв оплатить + кнопку открыть детальный диалог.
 */

import { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { motion } from 'framer-motion';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import type { SubscriptionStatus } from '../api/subscription';
import SubscriptionDetailsDialog from './SubscriptionDetailsDialog';
import { logoutAgent } from '../auth/auth';
import { useNavigate } from 'react-router-dom';

const fmt = (n: number) => n.toLocaleString('ru-RU');

interface Props {
  status: SubscriptionStatus;
  agentId: number;
  onUpdated: () => void;
}

export default function SubscriptionLockedView({ status, agentId, onUpdated }: Props) {
  const [open, setOpen] = useState(true); // открыто сразу
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: 560, width: '100%' }}>
        <Box sx={{
          p: 5, borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(15,22,41,0.95))',
          border: '1px solid rgba(239,68,68,0.30)',
          textAlign: 'center',
        }}>
          <Box sx={{
            mx: 'auto', mb: 3, width: 84, height: 84, borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.40)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
              '50%':      { boxShadow: '0 0 0 14px rgba(239,68,68,0)' },
            },
          }}>
            <LockRoundedIcon sx={{ fontSize: 42, color: '#EF4444' }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9', mb: 1 }}>
            Доступ к порталу ограничен
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3, lineHeight: 1.6 }}>
            Не оплачена абонентская плата за <b style={{ color: '#EF4444' }}>{status.overdueCount} {status.overdueCount === 1 ? 'месяц' : status.overdueCount < 5 ? 'месяца' : 'месяцев'}</b>.
            <br />
            Чтобы продолжить пользоваться платформой, оплатите задолженность.
          </Typography>

          <Box sx={{ p: 2.5, borderRadius: 2.5, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', mb: 3 }}>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 0.5 }}>К оплате</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#EF4444' }}>{fmt(status.totalDue)} ₽</Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {status.fee} ₽ × {status.unpaidCount} мес
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button variant="contained" size="large" onClick={() => setOpen(true)}
              sx={{ background: '#EF4444', '&:hover': { background: '#DC2626' }, fontWeight: 700, px: 4 }}
            >
              Оплатить задолженность
            </Button>
            <Button variant="outlined" size="large" startIcon={<LogoutRoundedIcon />}
              onClick={() => { logoutAgent(); navigate('/login'); }}
              sx={{ borderColor: 'rgba(255,255,255,0.15)', color: '#94A3B8' }}
            >
              Выйти
            </Button>
          </Stack>

          <Typography variant="caption" sx={{ color: '#64748B', mt: 3, display: 'block' }}>
            Вопросы по оплате — пиши в поддержку через email или Telegram бэк-офиса.
          </Typography>
        </Box>
      </motion.div>

      <SubscriptionDetailsDialog open={open} onClose={() => setOpen(false)} status={status} agentId={agentId} onUpdated={onUpdated} />
    </Box>
  );
}
