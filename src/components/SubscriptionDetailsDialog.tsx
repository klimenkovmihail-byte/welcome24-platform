/**
 * SubscriptionDetailsDialog — модалка с таблицей месяцев + кнопкой «Оплатить».
 *
 * Поток оплаты (гибридный, пока нет полной интеграции с YooKassa API):
 *   1. Клик «Оплатить» по конкретному месяцу → открывается YooKassa-ссылка
 *      в новом окне с предзаполненной суммой и label.
 *   2. После оплаты пользователь возвращается и жмёт «Я оплатил» →
 *      создаётся запись pending_review.
 *   3. Админ в админке подтверждает → status='paid' и бар гаснет.
 *   4. (Опционально) если в кабинете YK включить HTTP-уведомления —
 *      webhook закроет всё автоматически.
 */

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Box, Typography, Button, Stack, Table, TableHead, TableBody,
  TableRow, TableCell, Chip, Alert, Divider, LinearProgress,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { subscriptionApi, buildYookassaUrl, type SubscriptionStatus, type PeriodStatus } from '../api/subscription';

const fmt = (n: number) => n.toLocaleString('ru-RU');

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const formatPeriod = (p: string) => {
  const [y, m] = p.split('-').map(Number);
  return `${RU_MONTHS[m - 1]} ${y}`;
};

const statusConfig: Record<PeriodStatus, { label: string; color: string; bg: string }> = {
  paid:            { label: 'Оплачено',           color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  pending_review:  { label: 'На подтверждении',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  unpaid:          { label: 'Ожидает оплаты',     color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  overdue:         { label: 'Просрочено',         color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  exempt_quarter:  { label: 'ВКД ≥ 200к (отмена)',color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  exempt_lifetime: { label: 'VIP (отмена навсегда)',color: '#C9A84C', bg: 'rgba(201,168,76,0.12)' },
  refunded:        { label: 'Возвращено',         color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  rejected:        { label: 'Отклонено',          color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  status: SubscriptionStatus;
  agentId: number;
  onUpdated: () => void;
}

export default function SubscriptionDetailsDialog({ open, onClose, status, agentId, onUpdated }: Props) {
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentOpened, setPaymentOpened] = useState<Set<string>>(new Set());

  const handleOpenPayment = (period: string) => {
    const url = buildYookassaUrl(agentId, period, status.fee);
    window.open(url, '_blank', 'noopener,noreferrer');
    setPaymentOpened(prev => new Set(prev).add(period));
  };

  const handleClaim = async (period: string) => {
    setClaiming(period); setError(null);
    try {
      await subscriptionApi.claim(period);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить заявку');
    } finally {
      setClaiming(null);
    }
  };

  // Группируем периоды по кварталам — так удобнее смотреть.
  const byYearQuarter = new Map<string, { year: number; quarter: number; quarterVkd: number; items: typeof status.periods }>();
  for (const p of status.periods) {
    const k = `${p.year}-Q${p.quarter}`;
    if (!byYearQuarter.has(k)) {
      byYearQuarter.set(k, { year: p.year, quarter: p.quarter, quarterVkd: p.quarterVkd, items: [] });
    }
    byYearQuarter.get(k)!.items.push(p);
  }
  const quarters = [...byYearQuarter.values()];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#F1F5F9' }}>Абонентская плата</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {status.fee} ₽/мес · отмена при ВКД ≥ 200 000 ₽ в квартал · полная отмена при ВКД ≥ 1 000 000 ₽
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#64748B' }}><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)' }} />
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {/* Прогресс до lifetime-освобождения */}
        {status.exempt !== 'lifetime' && (
          <Box sx={{ mb: 3, p: 2, borderRadius: 2.5, background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Прогресс до полной отмены АП
              </Typography>
              <Typography variant="caption" sx={{ color: '#C9A84C', fontWeight: 700 }}>
                {fmt(status.lifetimeVkd)} / {fmt(status.lifetimeThreshold)} ₽
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (status.lifetimeVkd / status.lifetimeThreshold) * 100)}
              sx={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)',
                '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #C9A84C, #E2C97E)', borderRadius: 4 } }}
            />
          </Box>
        )}

        {status.exempt === 'lifetime' && (
          <Alert severity="success" sx={{ mb: 2 }} icon={false}>
            🏆 Ваш общий ВКД ({fmt(status.lifetimeVkd)} ₽) пересёк порог 1 млн — абонентская плата отменена навсегда.
          </Alert>
        )}

        {status.periods.length === 0 && status.exempt !== 'lifetime' && (
          <Alert severity="info">
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Сейчас бесплатный период
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              Дата подключения: <b>{status.joinDate || '—'}</b>. Первый полный месяц после вступления — бесплатно.
              Первый платёж АП: <b>{status.firstBillingMonth ? formatPeriod(status.firstBillingMonth) : '—'}</b>.
            </Typography>
            {status.currentQuarter && (
              (status.currentQuarterVkd || 0) >= status.quarterThreshold ? (
                <Typography variant="caption" sx={{ display: 'block', color: '#22C55E' }}>
                  ✓ Текущий квартал Q{status.currentQuarter} {status.currentYear}: ВКД <b>{fmt(status.currentQuarterVkd || 0)} ₽</b> ≥ 200 000 ₽ — квартал уже освобождён.
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ display: 'block', color: '#94A3B8' }}>
                  В текущем квартале Q{status.currentQuarter} {status.currentYear}: ВКД <b>{fmt(status.currentQuarterVkd || 0)} ₽</b>.
                  Чтобы освободить квартал — наберите ещё {fmt(status.quarterThreshold - (status.currentQuarterVkd || 0))} ₽ ВКД до конца квартала.
                </Typography>
              )
            )}
          </Alert>
        )}

        {/* Таблица по кварталам */}
        {quarters.map(qb => {
          const qExempt = qb.quarterVkd >= status.quarterThreshold;
          return (
            <Box key={`${qb.year}-Q${qb.quarter}`} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#F1F5F9' }}>
                  {qb.year} · Q{qb.quarter}
                </Typography>
                <Chip
                  size="small"
                  label={`ВКД квартала: ${fmt(qb.quarterVkd)} ₽${qExempt ? ' (≥ 200k — АП отменена)' : ''}`}
                  sx={{
                    background: qExempt ? 'rgba(6,182,212,0.12)' : 'rgba(148,163,184,0.10)',
                    color: qExempt ? '#06B6D4' : '#94A3B8',
                    fontWeight: 700, fontSize: 11,
                  }}
                />
              </Box>
              <Table size="small" sx={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Месяц</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell align="right">Сумма</TableCell>
                    <TableCell align="right">Действие</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qb.items.map(p => {
                    const cfg = statusConfig[p.status];
                    const isPayable = p.status === 'unpaid' || p.status === 'overdue';
                    const opened = paymentOpened.has(p.period);
                    return (
                      <TableRow key={p.period}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#F1F5F9' }}>{formatPeriod(p.period)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={cfg.label} sx={{ background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: isPayable ? '#F1F5F9' : '#64748B' }}>
                            {p.status === 'exempt_quarter' || p.status === 'exempt_lifetime' || p.status === 'refunded' ? '—' : `${fmt(status.fee)} ₽`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {isPayable && (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              {!opened ? (
                                <Button size="small" variant="contained"
                                  startIcon={<OpenInNewRoundedIcon />}
                                  onClick={() => handleOpenPayment(p.period)}
                                  sx={{ background: '#22C55E', '&:hover': { background: '#16A34A' } }}
                                >
                                  Оплатить
                                </Button>
                              ) : (
                                <Button size="small" variant="contained" color="warning"
                                  startIcon={<CheckRoundedIcon />}
                                  disabled={claiming === p.period}
                                  onClick={() => handleClaim(p.period)}
                                >
                                  {claiming === p.period ? '...' : 'Я оплатил'}
                                </Button>
                              )}
                            </Stack>
                          )}
                          {p.status === 'pending_review' && (
                            <Typography variant="caption" sx={{ color: '#F59E0B' }}>ждём подтверждения</Typography>
                          )}
                          {p.status === 'paid' && p.paidAt && (
                            <Typography variant="caption" sx={{ color: '#22C55E' }}>{new Date(p.paidAt).toLocaleDateString('ru-RU')}</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          );
        })}

        <Alert severity="info" sx={{ mt: 2 }} icon={false}>
          <b>Как это работает:</b><br />
          1. Жми «Оплатить» — откроется YooKassa в новой вкладке.<br />
          2. После оплаты вернись сюда и нажми «Я оплатил» — месяц станет ожидающим подтверждения.<br />
          3. Бэк-офис подтвердит платёж — обычно в течение рабочего дня. После этого бар погаснет.<br />
          <br />
          <b>Освобождение:</b> сделай сделок на 200 000 ₽ ВКД в квартал → АП этого квартала отменяется (если уже оплатил — вернётся).
          При общем ВКД 1 млн ₽ — АП отменяется навсегда.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}
