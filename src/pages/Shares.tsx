import { useEffect, useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Divider,
  ToggleButtonGroup, ToggleButton, Avatar,
} from '@mui/material';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer } from 'recharts';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import RedeemRoundedIcon from '@mui/icons-material/RedeemRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import { sharesApi } from '../api/shares';
import type { ShareQuote, SharePacket } from '../types/api';

const fmt = (n: number) => n.toLocaleString('ru-RU');
const fmtCompact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} млн` :
  Math.abs(n) >= 1_000 ? `${(n / 1_000).toFixed(1)} тыс` : String(n);

const RANGE_OPTIONS = [
  { value: '1m',  label: '1М' },
  { value: '3m',  label: '3М' },
  { value: '6m',  label: '6М' },
  { value: '1y',  label: '1Г' },
  { value: 'all', label: 'Всё' },
] as const;

type RangeKey = typeof RANGE_OPTIONS[number]['value'];

const TYPE_CFG = {
  purchase: { label: 'Купил',   icon: <ShoppingCartRoundedIcon sx={{ fontSize: 16 }} />, color: '#4361EE' },
  sale:     { label: 'Продал',  icon: <SellRoundedIcon         sx={{ fontSize: 16 }} />, color: '#EF4444' },
  gift:     { label: 'Подарок', icon: <RedeemRoundedIcon       sx={{ fontSize: 16 }} />, color: '#22C55E' },
} as const;

export default function Shares() {
  const [range, setRange] = useState<RangeKey>('all');

  // С бэка: котировки и мои пакеты.
  const [shareHistory, setShareHistory] = useState<ShareQuote[]>([]);
  const [myShares, setMyShares] = useState<SharePacket[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([sharesApi.quotes(), sharesApi.myPackets()])
      .then(([q, p]) => { if (!cancelled) { setShareHistory(q); setMyShares(p); } })
      .catch(() => { /* tolerate */ });
    return () => { cancelled = true; };
  }, []);

  // Текущая цена = последняя котировка (или 0 если их нет).
  const currentSharePrice = shareHistory.length ? shareHistory[shareHistory.length - 1].price : 0;

  // Сводка по пакетам.
  const sharesSummary = useMemo(() => {
    const total  = myShares.reduce((s, p) => s + p.quantity, 0);
    const cost   = myShares.reduce((s, p) => s + p.quantity * p.acquiredPrice, 0);
    const value  = total * currentSharePrice;
    const growth = value - cost;
    const growthPct = cost > 0 ? (growth / cost) * 100 : 0;
    return { total, cost, value, growth, growthPct, currentPrice: currentSharePrice };
  }, [myShares, currentSharePrice]);

  // Smart period filter:
  //  • If range === 'all'  → all quotes
  //  • Otherwise: take (a) last quote strictly BEFORE cutoff as starting anchor,
  //                     (b) all quotes within the period,
  //                     (c) virtual "today" point with the latest known price (if не совпадает с последней котировкой).
  const today = useMemo(() => new Date('2026-05-24'), []); // reference: today's date in app
  const chartData = useMemo(() => {
    if (range === 'all') {
      return [...shareHistory, { date: today.toISOString().slice(0, 10), price: currentSharePrice }]
        .filter((p, i, arr) => i === 0 || p.date !== arr[i - 1].date);
    }
    const months = range === '1m' ? 1 : range === '3m' ? 3 : range === '6m' ? 6 : 12;
    const cutoff = new Date(today.getFullYear(), today.getMonth() - months, today.getDate());
    const inRange = shareHistory.filter(p => new Date(p.date) >= cutoff);
    const lastBefore = [...shareHistory].reverse().find(p => new Date(p.date) < cutoff);
    const todayPoint = { date: today.toISOString().slice(0, 10), price: currentSharePrice };
    const arr = lastBefore ? [lastBefore, ...inRange, todayPoint] : [...inRange, todayPoint];
    // Dedup if last quote equals today
    return arr.filter((p, i) => i === 0 || p.date !== arr[i - 1].date);
  }, [range, today, shareHistory, currentSharePrice]);

  // Period change: from first to last point in chartData
  const firstPrice = chartData[0]?.price ?? currentSharePrice;
  const lastPrice = chartData[chartData.length - 1]?.price ?? currentSharePrice;
  const rangeDelta = lastPrice - firstPrice;
  const rangeDeltaPct = firstPrice > 0 ? (rangeDelta / firstPrice) * 100 : 0;
  const isUp = rangeDelta >= 0;

  // Year-over-year — последняя цена / цена примерно год назад (или ближайшая до этого)
  const yearAgoTs = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).getTime();
  const yearAgoQuote = [...shareHistory].reverse().find(p => new Date(p.date).getTime() <= yearAgoTs) || shareHistory[0];
  const yoyPct = yearAgoQuote && yearAgoQuote.price > 0
    ? ((currentSharePrice - yearAgoQuote.price) / yearAgoQuote.price) * 100
    : 0;

  return (
    <Box>
      {/* Hero: portfolio + price */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <Card sx={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
              <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 90% 0%, rgba(201,168,76,0.15) 0%, transparent 60%)' }} />
              <CardContent sx={{ p: 3, position: 'relative' }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Стоимость портфеля
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, color: '#F1F5F9', mt: 0.5, lineHeight: 1 }}>
                  {fmt(sharesSummary.value)} ₽
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                  {sharesSummary.growth >= 0 ? <TrendingUpRoundedIcon sx={{ color: '#22C55E', fontSize: 20 }} /> : <TrendingDownRoundedIcon sx={{ color: '#EF4444', fontSize: 20 }} />}
                  <Typography variant="body1" sx={{ fontWeight: 800, color: sharesSummary.growth >= 0 ? '#22C55E' : '#EF4444' }}>
                    {sharesSummary.growth >= 0 ? '+' : ''}{fmt(Math.round(sharesSummary.growth))} ₽
                  </Typography>
                  <Chip
                    label={`${sharesSummary.growth >= 0 ? '+' : ''}${sharesSummary.growthPct.toFixed(1)}%`}
                    size="small"
                    sx={{ background: sharesSummary.growth >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: sharesSummary.growth >= 0 ? '#22C55E' : '#EF4444', fontWeight: 700 }}
                  />
                  <Typography variant="caption" sx={{ color: '#64748B', ml: 1 }}>за всё время</Typography>
                </Box>

                <Divider sx={{ my: 2.5, borderColor: 'rgba(201,168,76,0.1)' }} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Акций</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{fmt(sharesSummary.total)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Средняя ст. покупки</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{sharesSummary.total > 0 ? fmt(Math.round(sharesSummary.cost / sharesSummary.total)) : 0} ₽</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Инвестировано</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{fmt(sharesSummary.cost)} ₽</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Текущая котировка W24
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: '#C9A84C', mt: 0.5, lineHeight: 1 }}>
                    {fmt(currentSharePrice)} ₽
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>за 1 акцию</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', fontSize: 11 }}>За год</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: yoyPct >= 0 ? '#22C55E' : '#EF4444' }}>
                      {yoyPct >= 0 ? '+' : ''}{yoyPct.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 1.5, borderRadius: 2, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', fontSize: 11 }}>Капитал</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: '#C9A84C' }}>
                      {fmtCompact(sharesSummary.value)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Price chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>График котировок</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  {isUp ? <TrendingUpRoundedIcon sx={{ color: '#22C55E', fontSize: 18 }} /> : <TrendingDownRoundedIcon sx={{ color: '#EF4444', fontSize: 18 }} />}
                  <Typography variant="body2" sx={{ fontWeight: 700, color: isUp ? '#22C55E' : '#EF4444' }}>
                    {isUp ? '+' : ''}{fmt(rangeDelta)} ₽ ({isUp ? '+' : ''}{rangeDeltaPct.toFixed(1)}%)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>за период</Typography>
                </Box>
              </Box>
              <ToggleButtonGroup exclusive value={range} onChange={(_, v) => v && setRange(v)} size="small">
                {RANGE_OPTIONS.map(o => (
                  <ToggleButton key={o.value} value={o.value} sx={{ px: 2, fontSize: 12, borderColor: 'rgba(201,168,76,0.2)', '&.Mui-selected': { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } }}>
                    {o.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ left: 8, right: 24, top: 8 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isUp ? '#22C55E' : '#EF4444'} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={isUp ? '#22C55E' : '#EF4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => new Date(v).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  domain={['dataMin - 200', 'dataMax + 200']}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
                />
                <RechartTooltip
                  contentStyle={{ background: '#0F1629', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8 }}
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  formatter={(v: number) => [`${fmt(v)} ₽`, 'Цена']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isUp ? '#22C55E' : '#EF4444'}
                  strokeWidth={2.5}
                  fill="url(#priceGrad)"
                  dot={{ fill: isUp ? '#22C55E' : '#EF4444', r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* My packets */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.3 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 2.5 }}>Мои пакеты акций</Typography>
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '110px 130px 1fr 130px 130px 130px 110px', background: 'rgba(255,255,255,0.03)' }}>
                {['Дата', 'Тип', 'Примечание', 'Кол-во', 'Цена входа', 'Тек. цена', '%'].map(h => (
                  <Box key={h} sx={{ p: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>{h}</Typography>
                  </Box>
                ))}
              </Box>
              {myShares.map((p) => {
                const cfg = TYPE_CFG[p.type];
                const packetCost = p.quantity * p.acquiredPrice;
                const packetValue = p.quantity * currentSharePrice;
                const growthPct = packetCost > 0 ? ((packetValue - packetCost) / packetCost) * 100 : 0;
                return (
                  <Box key={p.id} sx={{ display: 'grid', gridTemplateColumns: '110px 130px 1fr 130px 130px 130px 110px', borderTop: '1px solid rgba(255,255,255,0.04)', '&:hover': { background: 'rgba(201,168,76,0.04)' } }}>
                    <Box sx={{ p: 1.6 }}>
                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                        {new Date(p.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1.6 }}>
                      <Chip label={cfg.label} icon={cfg.icon} size="small" sx={{ background: `${cfg.color}20`, color: cfg.color, fontWeight: 700, fontSize: 11, '& .MuiChip-icon': { color: cfg.color } }} />
                    </Box>
                    <Box sx={{ p: 1.6 }}>
                      <Typography variant="body2" sx={{ color: '#F1F5F9' }}>{p.note}</Typography>
                    </Box>
                    <Box sx={{ p: 1.6 }}>
                      <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 700 }}>{fmt(p.quantity)}</Typography>
                    </Box>
                    <Box sx={{ p: 1.6 }}>
                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>{fmt(p.acquiredPrice)} ₽</Typography>
                    </Box>
                    <Box sx={{ p: 1.6 }}>
                      <Typography variant="body2" sx={{ color: '#C9A84C', fontWeight: 700 }}>{fmt(packetValue)} ₽</Typography>
                    </Box>
                    <Box sx={{ p: 1.6 }}>
                      <Chip
                        label={`${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(0)}%`}
                        size="small"
                        sx={{ background: growthPct >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: growthPct >= 0 ? '#22C55E' : '#EF4444', fontWeight: 700, fontSize: 11 }}
                      />
                    </Box>
                  </Box>
                );
              })}
              {/* Totals */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '110px 130px 1fr 130px 130px 130px 110px', borderTop: '2px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)' }}>
                <Box sx={{ p: 1.6 }}><Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>ИТОГО · {myShares.length}</Typography></Box>
                <Box sx={{ p: 1.6 }} />
                <Box sx={{ p: 1.6 }} />
                <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 900 }}>{fmt(sharesSummary.total)}</Typography></Box>
                <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>{fmt(sharesSummary.cost)} ₽</Typography></Box>
                <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#C9A84C', fontWeight: 900 }}>{fmt(sharesSummary.value)} ₽</Typography></Box>
                <Box sx={{ p: 1.6 }}>
                  <Chip
                    label={`${sharesSummary.growthPct >= 0 ? '+' : ''}${sharesSummary.growthPct.toFixed(1)}%`}
                    size="small"
                    sx={{ background: sharesSummary.growth >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: sharesSummary.growth >= 0 ? '#22C55E' : '#EF4444', fontWeight: 800, fontSize: 11 }}
                  />
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
