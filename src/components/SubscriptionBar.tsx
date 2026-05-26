/**
 * SubscriptionBar — заметная полоска про абонентскую плату.
 *
 * Состояния:
 *   1) exempt='staff'    → ничего не рендерим (сотрудники не платят).
 *   2) exempt='lifetime' → золотая плашка «АП отменена навсегда».
 *   3) totalDue > 0      → красный/оранжевый бар «Не оплачено N мес — оплатить».
 *   4) иначе             → зелёная компактная плашка «АП оплачена».
 *
 * Клик открывает <SubscriptionDetailsDialog />.
 */

import { useState } from 'react';
import { Box, Typography, Button, Chip, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import type { SubscriptionStatus } from '../api/subscription';
import SubscriptionDetailsDialog from './SubscriptionDetailsDialog';

const fmt = (n: number) => n.toLocaleString('ru-RU');

interface Props {
  status: SubscriptionStatus;
  agentId: number;
  onUpdated: () => void;
}

export default function SubscriptionBar({ status, agentId, onUpdated }: Props) {
  const [open, setOpen] = useState(false);

  if (status.exempt === 'staff') return null;

  // Lifetime — золотая «корона»
  if (status.exempt === 'lifetime') {
    return (
      <>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Tooltip title="Вы достигли 1 млн ВКД — абонентская плата отменена. Поздравляем!">
            <Box
              onClick={() => setOpen(true)}
              sx={{
                mb: 3, p: 2, borderRadius: 3, cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08))',
                border: '1px solid rgba(201,168,76,0.35)',
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'all 0.2s',
                '&:hover': { background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(201,168,76,0.12))' },
              }}
            >
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                background: 'linear-gradient(135deg, #C9A84C, #E2C97E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <EmojiEventsRoundedIcon sx={{ color: '#0A0E1A', fontSize: 26 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#C9A84C', letterSpacing: '0.02em' }}>
                  АБОНЕНТСКАЯ ПЛАТА ОТМЕНЕНА НАВСЕГДА
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  Lifetime ВКД {fmt(status.lifetimeVkd)} ₽ ≥ {fmt(status.lifetimeThreshold)} ₽ — поздравляем!
                </Typography>
              </Box>
              <Chip label="VIP" size="small"
                sx={{ background: '#C9A84C', color: '#0A0E1A', fontWeight: 900, fontSize: 11 }}
              />
            </Box>
          </Tooltip>
        </motion.div>
        <SubscriptionDetailsDialog open={open} onClose={() => setOpen(false)} status={status} agentId={agentId} onUpdated={onUpdated} />
      </>
    );
  }

  // Долги есть
  if (status.totalDue > 0) {
    const urgent = status.blocked || status.overdueCount >= 1;
    const color = urgent ? '#EF4444' : '#F59E0B';
    const colorBg = urgent ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)';
    const colorBorder = urgent ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)';

    return (
      <>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Box
            sx={{
              mb: 3, p: 2, borderRadius: 3,
              background: colorBg,
              border: `1px solid ${colorBorder}`,
              display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
            }}
          >
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              background: `${color}25`, border: `1px solid ${color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              animation: urgent ? 'pulse 2s ease-in-out infinite' : undefined,
              '@keyframes pulse': {
                '0%, 100%': { boxShadow: `0 0 0 0 ${color}60` },
                '50%':      { boxShadow: `0 0 0 8px ${color}00` },
              },
            }}>
              <ErrorRoundedIcon sx={{ color, fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color, lineHeight: 1.3 }}>
                {status.blocked
                  ? 'Доступ к порталу ограничен — оплатите АП'
                  : `Не оплачена абонентская плата за ${status.unpaidCount} ${status.unpaidCount === 1 ? 'месяц' : status.unpaidCount < 5 ? 'месяца' : 'месяцев'}`}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                К оплате: <b style={{ color: '#F1F5F9' }}>{fmt(status.totalDue)} ₽</b> · 4990 ₽/мес · отмена при ВКД 200 000 ₽ за квартал
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Button size="small" variant="outlined" onClick={() => setOpen(true)}
                startIcon={<ReceiptLongRoundedIcon />}
                sx={{ borderColor: `${color}50`, color, '&:hover': { borderColor: color, background: `${color}10` } }}
              >
                Детали
              </Button>
              <Button size="small" variant="contained" onClick={() => setOpen(true)}
                sx={{ background: color, '&:hover': { background: color, filter: 'brightness(1.1)' } }}
              >
                Оплатить
              </Button>
            </Box>
          </Box>
        </motion.div>
        <SubscriptionDetailsDialog open={open} onClose={() => setOpen(false)} status={status} agentId={agentId} onUpdated={onUpdated} />
      </>
    );
  }

  // Долгов нет, не lifetime — компактная зелёная плашка.
  return (
    <>
      <Box
        onClick={() => setOpen(true)}
        sx={{
          mb: 3, p: 1.5, borderRadius: 2.5, cursor: 'pointer',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          display: 'flex', alignItems: 'center', gap: 1.5,
          '&:hover': { background: 'rgba(34,197,94,0.12)' },
        }}
      >
        <CheckCircleRoundedIcon sx={{ color: '#22C55E', fontSize: 18 }} />
        <Typography variant="caption" sx={{ color: '#94A3B8', flex: 1 }}>
          Абонентская плата актуальна. Lifetime ВКД: <b style={{ color: '#F1F5F9' }}>{fmt(status.lifetimeVkd)} ₽</b> / {fmt(status.lifetimeThreshold)} ₽ до полной отмены
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B' }}>детали →</Typography>
      </Box>
      <SubscriptionDetailsDialog open={open} onClose={() => setOpen(false)} status={status} agentId={agentId} onUpdated={onUpdated} />
    </>
  );
}
