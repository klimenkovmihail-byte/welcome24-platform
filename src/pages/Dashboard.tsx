import { useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, LinearProgress, Chip, Grid, Divider, ToggleButtonGroup, ToggleButton, MenuItem, Select, FormControl, InputLabel, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer } from 'recharts';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { useNavigate } from 'react-router-dom';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { currentUser, monthlyStats, teamData, myDeals, achievements } from '../data/mockData';

function getGreeting(hour: number): { text: string; emoji: string } {
  if (hour >= 5 && hour < 12)  return { text: 'Доброе утро',  emoji: '☀️' };
  if (hour >= 12 && hour < 18) return { text: 'Добрый день',  emoji: '👋' };
  if (hour >= 18 && hour < 23) return { text: 'Добрый вечер', emoji: '🌆' };
  return { text: 'Доброй ночи', emoji: '🌙' };
}

const tierColor: Record<string, { bg: string; ring: string; text: string }> = {
  bronze:   { bg: 'rgba(180,83,9,0.15)',  ring: 'rgba(217,119,6,0.4)',  text: '#D97706' },
  silver:   { bg: 'rgba(148,163,184,0.15)', ring: 'rgba(148,163,184,0.4)', text: '#94A3B8' },
  gold:     { bg: 'rgba(201,168,76,0.18)', ring: 'rgba(201,168,76,0.5)', text: '#C9A84C' },
  platinum: { bg: 'rgba(168,85,247,0.15)', ring: 'rgba(168,85,247,0.4)', text: '#A855F7' },
};

const fmt = (n: number) => n.toLocaleString('ru-RU');

const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45 },
});

const StatCard = ({ icon, label, value, sub, color, delay }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; delay: number }) => (
  <motion.div {...fadeIn(delay)} style={{ height: '100%' }}>
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: `${color}14` }} />
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#F1F5F9', mt: 0.5, lineHeight: 1 }}>
              {value}
            </Typography>
            {sub && <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>{sub}</Typography>}
          </Box>
          <Box sx={{ width: 48, height: 48, borderRadius: 3, background: `${color}26`, border: `1px solid ${color}4D`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  </motion.div>
);

const CommissionLevel = ({ percent, range, active, completed }: { percent: number; range: string; active: boolean; completed: boolean }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, opacity: completed || active ? 1 : 0.4 }}>
    <Box sx={{
      width: active ? 64 : 52, height: active ? 64 : 52, borderRadius: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'linear-gradient(135deg, #C9A84C, #E2C97E)' : completed ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
      border: active ? 'none' : completed ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
      boxShadow: active ? '0 8px 24px rgba(201,168,76,0.4)' : 'none',
    }}>
      <Typography variant="h6" sx={{ fontWeight: 900, color: active ? '#0A0E1A' : completed ? '#22C55E' : '#94A3B8' }}>
        {percent}%
      </Typography>
    </Box>
    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, fontSize: 10, textAlign: 'center' }}>
      {range}
    </Typography>
  </Box>
);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <Box sx={{ background: '#1A2340', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 2, p: 1.5 }}>
        <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>{label}</Typography>
        {payload.map((p) => (
          <Typography key={p.name} variant="caption" sx={{ color: p.color, display: 'block', fontWeight: 700 }}>
            {p.name}: {fmt(p.value)} ₽
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export default function Dashboard() {
  const navigate = useNavigate();
  const greeting = getGreeting(new Date().getHours());
  const recentAchievements = achievements
    .filter(a => a.earned)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 3);
  const earnedCount = achievements.filter(a => a.earned).length;
  const progressToNext = Math.min(100, (currentUser.totalVkd / currentUser.nextLevelThreshold) * 100);

  // Filter state: year + month ('all' = all months in year)
  const availableYears = useMemo(() => Array.from(new Set(myDeals.map(d => d.date.slice(0, 4)))).sort(), []);
  const [filterYear, setFilterYear] = useState<string>(availableYears[availableYears.length - 1] || '2026');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const filteredDeals = useMemo(() => myDeals.filter(d => {
    const [y, m] = d.date.split('-');
    if (y !== filterYear) return false;
    if (filterMonth !== 'all' && m !== filterMonth) return false;
    return true;
  }), [filterYear, filterMonth]);

  const filteredVkd = filteredDeals.reduce((s, d) => s + d.vkd, 0);
  const filteredIncome = filteredDeals.reduce((s, d) => s + d.income, 0);

  // Months that actually have deals (for compact toggle)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    myDeals.forEach(d => { if (d.date.startsWith(filterYear)) set.add(d.date.slice(5, 7)); });
    return Array.from(set).sort();
  }, [filterYear]);

  const periodLabel = filterMonth === 'all'
    ? `${filterYear} год`
    : `${MONTH_NAMES[parseInt(filterMonth, 10) - 1]} ${filterYear}`;

  return (
    <Box>
      {/* Welcome banner + achievements */}
      <motion.div {...fadeIn(0)}>
        <Box sx={{
          mb: 4, p: 3, borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(67,97,238,0.1) 50%, rgba(201,168,76,0.05) 100%)',
          border: '1px solid rgba(201,168,76,0.2)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3,
        }}>
          <Box sx={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)' }} />
          <Box sx={{ flex: '1 1 320px', minWidth: 0, position: 'relative' }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>
              {greeting.text}, Михаил! {greeting.emoji}
            </Typography>
            <Typography sx={{ color: '#94A3B8', mt: 0.5 }}>
              {currentUser.toNextLevel > 0 ? (
                <>До уровня <b style={{ color: '#C9A84C' }}>{currentUser.nextLevelCommission}%</b> осталось <b style={{ color: '#C9A84C' }}>{fmt(currentUser.toNextLevel)} ₽</b> ВКД</>
              ) : (
                <>Вы достигли максимального уровня комиссии <b style={{ color: '#C9A84C' }}>{currentUser.commission}%</b></>
              )}
            </Typography>
          </Box>

          {/* Recent achievements */}
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {recentAchievements.map((a) => {
                const c = tierColor[a.tier];
                return (
                  <Tooltip key={a.id} title={<><b>{a.title}</b><br />{a.description}{a.date ? <><br /><span style={{ opacity: 0.7 }}>{new Date(a.date).toLocaleDateString('ru-RU')}</span></> : null}</>} placement="top">
                    <Box sx={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: c.bg, border: `2px solid ${c.ring}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26, cursor: 'pointer',
                      transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' },
                    }}>
                      {a.icon}
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
            <Box
              onClick={() => navigate('/profile')}
              sx={{
                px: 2, py: 1.2, borderRadius: 2.5, cursor: 'pointer',
                background: 'rgba(201,168,76,0.1)', border: '1px dashed rgba(201,168,76,0.3)',
                display: 'flex', alignItems: 'center', gap: 1,
                '&:hover': { background: 'rgba(201,168,76,0.15)' },
              }}
            >
              <EmojiEventsRoundedIcon sx={{ fontSize: 18, color: '#C9A84C' }} />
              <Box>
                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', fontSize: 11, lineHeight: 1 }}>Достижений</Typography>
                <Typography variant="body2" sx={{ color: '#C9A84C', fontWeight: 800, lineHeight: 1.1 }}>
                  {earnedCount} / {achievements.length}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { icon: <AccountBalanceWalletRoundedIcon />, label: 'Доход 2026', value: `${fmt(currentUser.totalIncome)} ₽`, sub: `ВКД: ${fmt(currentUser.totalVkd)} ₽`, color: '#22C55E', delay: 0.05 },
          { icon: <HandshakeRoundedIcon />, label: 'Сделок 2026', value: currentUser.totalDeals, sub: 'Личные сделки', color: '#4361EE', delay: 0.1 },
          { icon: <GroupsRoundedIcon />, label: 'Команда', value: `${teamData.totalAgents} агентов`, sub: `С команды: ${fmt(teamData.totalIncome)} ₽`, color: '#C9A84C', delay: 0.15 },
          { icon: <DiamondRoundedIcon />, label: 'Акции', value: `${currentUser.shares} шт`, sub: `+${currentUser.sharesGrowth}% · ${fmt(currentUser.sharesValue)} ₽`, color: '#7B2FBE', delay: 0.2 },
        ].map((s) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={s.label}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <motion.div {...fadeIn(0.25)}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Динамика доходов</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Все месяцы 2026 года</Typography>
                  </Box>
                  <Chip label="2026" size="small" sx={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', fontWeight: 700 }} />
                </Box>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyStats}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="vkdGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4361EE" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4361EE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : String(v)} />
                    <RechartTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="vkd" name="ВКД" stroke="#4361EE" strokeWidth={2} fill="url(#vkdGrad)" />
                    <Area type="monotone" dataKey="income" name="Доход" stroke="#C9A84C" strokeWidth={2} fill="url(#incomeGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Commission level */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <motion.div {...fadeIn(0.3)}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 0.5 }}>Уровень комиссии</Typography>
                <Typography variant="caption" sx={{ color: '#64748B' }}>Личный объем ВКД</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', my: 3, px: 1 }}>
                  <CommissionLevel percent={80} range="до 2 млн" active={currentUser.level === 1} completed={currentUser.level > 1} />
                  <CommissionLevel percent={90} range="2–5 млн" active={currentUser.level === 2} completed={currentUser.level > 2} />
                  <CommissionLevel percent={95} range="от 5 млн" active={currentUser.level === 3} completed={false} />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>Текущий ВКД</Typography>
                    <Typography variant="caption" sx={{ color: '#C9A84C', fontWeight: 700 }}>
                      {fmt(currentUser.totalVkd)} / {fmt(currentUser.nextLevelThreshold)} ₽
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progressToNext} />
                  <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                    До {currentUser.nextLevelCommission}% осталось: <b style={{ color: '#F59E0B' }}>{fmt(currentUser.toNextLevel)} ₽</b>
                  </Typography>
                </Box>
                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.08)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Вознаграждение</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#C9A84C' }}>{currentUser.commission}%</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Уровень агента</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{currentUser.level}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Recent deals */}
        <Grid size={{ xs: 12 }}>
          <motion.div {...fadeIn(0.35)}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Отчёт по сделкам</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      {periodLabel} · {filteredDeals.length} сделок · {fmt(filteredVkd)} ₽ ВКД · {fmt(filteredIncome)} ₽ доход
                    </Typography>
                  </Box>

                  {/* Filter controls */}
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel>Год</InputLabel>
                      <Select value={filterYear} label="Год" onChange={e => { setFilterYear(e.target.value); setFilterMonth('all'); }}>
                        {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <ToggleButtonGroup
                      exclusive value={filterMonth}
                      onChange={(_, v) => v && setFilterMonth(v)}
                      size="small"
                      sx={{ flexWrap: 'wrap' }}
                    >
                      <ToggleButton value="all" sx={{ px: 2, fontSize: 12, borderColor: 'rgba(201,168,76,0.2)', '&.Mui-selected': { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } }}>
                        Весь год
                      </ToggleButton>
                      {availableMonths.map(m => (
                        <ToggleButton key={m} value={m} sx={{ px: 1.5, fontSize: 12, borderColor: 'rgba(201,168,76,0.2)', '&.Mui-selected': { background: 'rgba(201,168,76,0.15)', color: '#C9A84C' } }}>
                          {MONTH_NAMES[parseInt(m, 10) - 1].slice(0, 3)}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                </Box>

                <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 1fr', background: 'rgba(255,255,255,0.03)' }}>
                    {['Дата', 'Тип', 'Комиссия', 'ВКД', 'Доход'].map((h) => (
                      <Box key={h} sx={{ p: 2 }}>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>{h}</Typography>
                      </Box>
                    ))}
                  </Box>
                  {filteredDeals.length === 0 ? (
                    <Box sx={{ py: 5, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <Typography variant="body2" sx={{ color: '#64748B' }}>В этом периоде сделок нет</Typography>
                    </Box>
                  ) : filteredDeals.map((d) => (
                    <Box key={d.id} sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.04)', '&:hover': { background: 'rgba(201,168,76,0.04)' } }}>
                      <Box sx={{ p: 1.6 }}>
                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>{new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Typography>
                      </Box>
                      <Box sx={{ p: 1.6 }}>
                        <Chip label={d.type} size="small" sx={{
                          background: d.type === 'вторичка' ? 'rgba(67,97,238,0.12)' : d.type === 'новостройка' ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.12)',
                          color: d.type === 'вторичка' ? '#60A5FA' : d.type === 'новостройка' ? '#22C55E' : '#A78BFA',
                          fontWeight: 600, fontSize: 11, height: 20,
                        }} />
                      </Box>
                      <Box sx={{ p: 1.6 }}>
                        <Typography variant="body2" sx={{ color: '#C9A84C', fontWeight: 700 }}>{d.commission}%</Typography>
                      </Box>
                      <Box sx={{ p: 1.6 }}>
                        <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 700 }}>{fmt(d.vkd)} ₽</Typography>
                      </Box>
                      <Box sx={{ p: 1.6 }}>
                        <Typography variant="body2" sx={{ color: '#22C55E', fontWeight: 700 }}>{fmt(d.income)} ₽</Typography>
                      </Box>
                    </Box>
                  ))}
                  {filteredDeals.length > 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr 1fr', borderTop: '2px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)' }}>
                      <Box sx={{ p: 1.6 }}><Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>ИТОГО · {filteredDeals.length}</Typography></Box>
                      <Box sx={{ p: 1.6 }} />
                      <Box sx={{ p: 1.6 }} />
                      <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#C9A84C', fontWeight: 900 }}>{fmt(filteredVkd)} ₽</Typography></Box>
                      <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#22C55E', fontWeight: 900 }}>{fmt(filteredIncome)} ₽</Typography></Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
}
