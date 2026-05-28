import { useEffect, useState, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Divider,
  ToggleButtonGroup, ToggleButton, Avatar, Tooltip, IconButton,
} from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
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

// reason из БД (en) → подпись в столбце «Примечание» (русский)
const REASON_LABEL: Record<string, string> = {
  founder: 'Основатель',
  first_deal_bonus: 'Бонус за первую сделку',
  recruit_bonus: 'Бонус за сделку приглашённого',
  yearly_2m_vkd: 'Бонус за 2 млн ВКД в год',
  discount_purchase: 'Покупка со скидкой',
};
const formatReason = (s?: string) => (s && REASON_LABEL[s]) || s || '';

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

const PACKETS_PER_PAGE = 20;

export default function Shares() {
  const [range, setRange] = useState<RangeKey>('all');
  const [packetsPage, setPacketsPage] = useState(0);

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
    // sale-пакеты уменьшают баланс агента (передача / выкуп).
    const sign = (p: SharePacket) => p.type === 'sale' ? -1 : 1;
    const total = myShares.reduce((s, p) => s + sign(p) * p.quantity, 0);
    const cost  = myShares.reduce((s, p) => s + sign(p) * p.quantity * p.acquiredPrice, 0);
    const value  = total * currentSharePrice;
    const growth = value - cost;
    const growthPct = cost > 0 ? (growth / cost) * 100 : 0;
    // Бонусные акции — по номиналу 1 ₽ (за первую сделку, рекрута, 2 млн ВКД).
    const avgPrice = total > 0 ? cost / total : 0;
    const isMostlyGifted = avgPrice > 0 && avgPrice <= 1;
    return { total, cost, value, growth, growthPct, isMostlyGifted, currentPrice: currentSharePrice };
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
                  {!sharesSummary.isMostlyGifted && (
                    <Chip
                      label={`${sharesSummary.growth >= 0 ? '+' : ''}${sharesSummary.growthPct.toFixed(1)}%`}
                      size="small"
                      sx={{ background: sharesSummary.growth >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: sharesSummary.growth >= 0 ? '#22C55E' : '#EF4444', fontWeight: 700 }}
                    />
                  )}
                  <Typography variant="caption" sx={{ color: '#64748B', ml: 1 }}>
                    {sharesSummary.isMostlyGifted ? 'бонусные акции' : 'за всё время'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2.5, borderColor: 'rgba(201,168,76,0.1)' }} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Акций</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{fmt(sharesSummary.total)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Tooltip title="Средняя цена акции в вашем портфеле = Сумма инвестиций ÷ Количество акций. Учитывает бонусные акции по 1 ₽ и покупки со скидкой.">
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', cursor: 'help', textDecoration: 'underline dotted', textDecorationColor: 'rgba(100,116,139,0.4)' }}>
                        Средняя цена в портфеле
                      </Typography>
                    </Tooltip>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Мои пакеты акций</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>Всего транзакций: {myShares.length}</Typography>
            </Box>
            {(() => {
              const sortedPackets = [...myShares].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
              const totalPages = Math.max(1, Math.ceil(sortedPackets.length / PACKETS_PER_PAGE));
              const safePage = Math.min(packetsPage, totalPages - 1);
              const pagePackets = sortedPackets.slice(safePage * PACKETS_PER_PAGE, (safePage + 1) * PACKETS_PER_PAGE);
              return (
            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '110px 130px 1fr 130px 130px 130px 110px', background: 'rgba(255,255,255,0.03)' }}>
                {['Дата', 'Тип', 'Примечание', 'Кол-во', 'Цена входа', 'Тек. цена', '%'].map(h => (
                  <Box key={h} sx={{ p: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>{h}</Typography>
                  </Box>
                ))}
              </Box>
              {pagePackets.map((p) => {
                const cfg = TYPE_CFG[p.type];
                const packetCost = p.quantity * p.acquiredPrice;
                const packetValue = p.quantity * currentSharePrice;
                const growthPct = packetCost > 0 ? ((packetValue - packetCost) / packetCost) * 100 : 0;
                // Бонусные пакеты — выданы по номиналу 1 ₽. Покупки по нормальной цене (даже со скидкой 10%) — обычный %.
                const isGift = p.acquiredPrice > 0 && p.acquiredPrice <= 1;
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
                      <Typography variant="body2" sx={{ color: '#F1F5F9' }}>{formatReason(p.note)}</Typography>
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
                        label={isGift ? 'бонус' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(0)}%`}
                        size="small"
                        sx={{
                          background: isGift ? 'rgba(201,168,76,0.15)' : (growthPct >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'),
                          color: isGift ? '#C9A84C' : (growthPct >= 0 ? '#22C55E' : '#EF4444'),
                          fontWeight: 700, fontSize: 11,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
              {/* Totals — всегда по всем пакетам, не только текущей странице */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '110px 130px 1fr 130px 130px 130px 110px', borderTop: '2px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)' }}>
                <Box sx={{ p: 1.6 }}><Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>ИТОГО · {myShares.length}</Typography></Box>
                <Box sx={{ p: 1.6 }} />
                <Box sx={{ p: 1.6 }} />
                <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 900 }}>{fmt(sharesSummary.total)}</Typography></Box>
                <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>{fmt(sharesSummary.cost)} ₽</Typography></Box>
                <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#C9A84C', fontWeight: 900 }}>{fmt(sharesSummary.value)} ₽</Typography></Box>
                <Box sx={{ p: 1.6 }}>
                  <Chip
                    label={sharesSummary.isMostlyGifted
                      ? 'бонус'
                      : `${sharesSummary.growthPct >= 0 ? '+' : ''}${sharesSummary.growthPct.toFixed(1)}%`
                    }
                    size="small"
                    sx={{
                      background: sharesSummary.isMostlyGifted
                        ? 'rgba(201,168,76,0.2)'
                        : (sharesSummary.growth >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'),
                      color: sharesSummary.isMostlyGifted
                        ? '#C9A84C'
                        : (sharesSummary.growth >= 0 ? '#22C55E' : '#EF4444'),
                      fontWeight: 800, fontSize: 11,
                    }}
                  />
                </Box>
              </Box>
            </Box>
              );
            })()}

            {/* Пагинация */}
            {myShares.length > PACKETS_PER_PAGE && (() => {
              const totalPages = Math.ceil(myShares.length / PACKETS_PER_PAGE);
              const safePage = Math.min(packetsPage, totalPages - 1);
              const from = safePage * PACKETS_PER_PAGE + 1;
              const to = Math.min((safePage + 1) * PACKETS_PER_PAGE, myShares.length);
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5, mt: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    {from}–{to} из {myShares.length}
                  </Typography>
                  <IconButton size="small" disabled={safePage === 0}
                    onClick={() => setPacketsPage(safePage - 1)}
                    sx={{ color: '#94A3B8', '&:hover': { color: '#C9A84C' } }}
                  >
                    <ChevronLeftRoundedIcon />
                  </IconButton>
                  <Typography variant="caption" sx={{ color: '#94A3B8', minWidth: 40, textAlign: 'center' }}>
                    {safePage + 1} / {totalPages}
                  </Typography>
                  <IconButton size="small" disabled={safePage >= totalPages - 1}
                    onClick={() => setPacketsPage(safePage + 1)}
                    sx={{ color: '#94A3B8', '&:hover': { color: '#C9A84C' } }}
                  >
                    <ChevronRightRoundedIcon />
                  </IconButton>
                </Box>
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
}
