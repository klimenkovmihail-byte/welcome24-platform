import { useEffect, useMemo, useState, useRef } from 'react';
import { Box, Card, CardContent, Typography, LinearProgress, Chip, Grid, Divider, ToggleButtonGroup, ToggleButton, MenuItem, Select, FormControl, InputLabel, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer } from 'recharts';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { useNavigate } from 'react-router-dom';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import type { Achievement } from '../data/mockData';
import { api } from '../api/apiClient';

// Достижения считаются на бэке (helpers/achievements.js) — endpoint /api/achievements/me.
// Раньше дашборд показывал хардкод из mockData (не обновлялся при новых ачивках).
type RawAchMe = { id: string; title: string; description: string; icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'; isYearly: boolean; period: string;
  earned: boolean; earnedAt: string | null };
import { useDeals, useTeam, useSharePackets, useShareQuotes, useSettings } from '../api/queries';
import type { TeamLevelStats, MarketingPlanLevel } from '../api/team';
import { getCurrentAgent } from '../auth/auth';
import { ErrorState, PageSkeleton } from '../components/States';
import OnboardingCard from '../components/OnboardingCard';
import type { Deal, ShareQuote, SharePacket } from '../types/api';

// Считает мой пассивный доход с команды по MLM-плану — идентично логике
// на странице Team.tsx, чтобы цифры на дашборде и в Команде совпадали.
function computePassiveIncome(levels: TeamLevelStats[], plan: MarketingPlanLevel[]): number {
  const l1WithDeals = levels[0]?.withDealCount ?? 0;
  return levels.reduce((sum, stats) => {
    const p = plan.find(x => x.level === stats.level);
    const growingUnlocked = p?.required == null ? true : l1WithDeals >= (p.required ?? 0);
    const effectivePct = (p?.protected || 0) + (growingUnlocked && p?.growing ? p.growing : 0);
    const rawIncome = Math.round(stats.totalVkd * effectivePct / 100);
    const capPerAgent = p?.capPerAgent ?? 0;
    const cappedIncome = Math.min(rawIncome, stats.withDealCount * capPerAgent);
    return sum + cappedIncome;
  }, 0);
}

// Пороги для уровней комиссии — фолбэк на правила Welcome 24, но реальные значения
// берём из настроек компании (useSettings), чтобы совпадать с бэком и админкой.
const LEVEL1_FALLBACK = 2_000_000; // ВКД для перехода 80% → 90%
const LEVEL2_FALLBACK = 5_000_000; // ВКД для перехода 90% → 95%
// «2 млн» / «2,5 млн» — подписи диапазонов считаем из порогов, не хардкодим.
const fmtMln = (n: number) => `${(n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`;

function commissionByVkd(totalVkd: number, l1 = LEVEL1_FALLBACK, l2 = LEVEL2_FALLBACK): { level: 1 | 2 | 3; commission: 80 | 90 | 95; nextThreshold: number; nextCommission: 80 | 90 | 95; toNext: number } {
  if (totalVkd >= l2) {
    return { level: 3, commission: 95, nextThreshold: l2, nextCommission: 95, toNext: 0 };
  }
  if (totalVkd >= l1) {
    return { level: 2, commission: 90, nextThreshold: l2, nextCommission: 95, toNext: l2 - totalVkd };
  }
  return { level: 1, commission: 80, nextThreshold: l1, nextCommission: 90, toNext: l1 - totalVkd };
}

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

// Между числом и единицей («₽», «шт», «млн») ставим неразрывный пробел, чтобы единица
// не отрывалась на новую строку на узких карточках (13"). Разделители групп в ru-RU
// уже неразрывные (U+00A0), рвался только пробел перед единицей.
const nbspUnit = (s: string) => s.replace(/ (₽|шт|млн)/g, ' $1');
const StatCard = ({ icon, label, value, sub, color, delay }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; delay: number }) => (
  <motion.div {...fadeIn(delay)} style={{ height: '100%' }}>
    <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: `${color}14` }} />
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#F1F5F9', mt: 0.5, lineHeight: 1.1, whiteSpace: 'nowrap', fontSize: { xs: 30, sm: 26, lg: 22 } }}>
              {typeof value === 'string' ? nbspUnit(value) : value}
            </Typography>
            {sub && <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>{nbspUnit(sub)}</Typography>}
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

const DEAL_TYPE_RU: Record<Deal['type'], string> = {
  primary: 'новостройка',
  secondary: 'вторичка',
  commercial: 'коммерция',
  suburban: 'загородная',
  rent: 'аренда',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const greeting = getGreeting(new Date().getHours());

  // Реальные достижения агента с бэка (с зафиксированными датами).
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  useEffect(() => {
    let cancelled = false;
    api.get<RawAchMe[]>('/api/achievements/me')
      .then(rows => {
        if (cancelled) return;
        setAchievements(rows.map(r => ({
          id: r.id, title: r.title, description: r.description, icon: r.icon,
          tier: r.tier, earned: r.earned, date: r.earnedAt || '',
          period: r.period, isYearly: r.isYearly,
        })));
      })
      .catch(() => { /* пустой список при ошибке */ });
    return () => { cancelled = true; };
  }, []);

  const recentAchievements = achievements
    .filter(a => a.earned)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 3);
  const earnedCount = achievements.filter(a => a.earned).length;

  // === Мои данные с бэка через react-query (кэш/дедуп между страницами) ===
  const meId = (() => { const id = getCurrentAgent()?.id; return typeof id === 'number' ? id : undefined; })();
  // Фиксированный тариф комиссии (особые агенты вне годовой прогрессии). NULL = прогрессия по ВКД.
  const fixedPct = (() => {
    const v = (getCurrentAgent() as { commission_fixed?: number | null } | null)?.commission_fixed;
    return typeof v === 'number' && v > 0 ? v : null;
  })();
  const dealsQ = useDeals(meId);
  const teamQ = useTeam();
  const packetsQ = useSharePackets();
  const quotesQ = useShareQuotes();
  const settingsQ = useSettings();
  // Пороги уровней — из настроек компании (единый источник с бэком), фолбэк 2млн/5млн.
  const lvl1 = Number(settingsQ.data?.level1_threshold) || LEVEL1_FALLBACK;
  const lvl2 = Number(settingsQ.data?.level2_threshold) || LEVEL2_FALLBACK;

  const myDeals: Deal[] = dealsQ.data ?? [];
  const myShares: SharePacket[] = packetsQ.data ?? [];
  const shareQuotes: ShareQuote[] = quotesQ.data ?? [];
  // За всё время — итого людей в структуре и кумулятивный пассивный доход
  const teamAllTime = useMemo(() => {
    const t = teamQ.data;
    return {
      agents: t?.totals?.agents || 0,
      vkd: t?.totals?.vkd || 0,
      passiveIncome: t ? computePassiveIncome(t.levels || [], t.marketingPlan || []) : 0,
    };
  }, [teamQ.data]);

  const loading = dealsQ.isLoading || teamQ.isLoading || packetsQ.isLoading || quotesQ.isLoading;
  const error = (dealsQ.error || teamQ.error || packetsQ.error || quotesQ.error) as Error | null;
  const retry = () => { dealsQ.refetch(); teamQ.refetch(); packetsQ.refetch(); quotesQ.refetch(); };

  // === Вычисления ===
  const currentYear = String(new Date().getFullYear());
  const dealsThisYear = useMemo(() => myDeals.filter(d => d.date?.startsWith(currentYear)), [myDeals, currentYear]);
  const yearTotalVkd    = dealsThisYear.reduce((s, d) => s + d.vkd, 0);
  const yearTotalIncome = dealsThisYear.reduce((s, d) => s + d.income, 0);
  const yearTotalDeals  = dealsThisYear.length;

  const commission = useMemo(() => {
    // Фикс-тариф: показываем его как уровень, без прогрессии (toNext=0).
    if (fixedPct) {
      const lvl = (fixedPct >= 95 ? 3 : fixedPct >= 90 ? 2 : 1) as 1 | 2 | 3;
      const c = fixedPct as 80 | 90 | 95;
      return { level: lvl, commission: c, nextThreshold: lvl2, nextCommission: c, toNext: 0 };
    }
    return commissionByVkd(yearTotalVkd, lvl1, lvl2);
  }, [yearTotalVkd, lvl1, lvl2, fixedPct]);
  const progressToNext = commission.toNext > 0
    ? Math.min(100, (yearTotalVkd / commission.nextThreshold) * 100)
    : 100;

  // Акции (sale-пакеты уменьшают баланс).
  const totalShares       = myShares.reduce((s, p) => s + (p.type === 'sale' ? -1 : 1) * p.quantity, 0);
  const sharesCost        = myShares.reduce((s, p) => s + (p.type === 'sale' ? -1 : 1) * p.quantity * p.acquiredPrice, 0);
  const currentSharePrice = shareQuotes.length ? shareQuotes[shareQuotes.length - 1].price : 0;
  const sharesValue       = totalShares * currentSharePrice;
  // Бонусные акции — по номиналу 1 ₽ (за первую сделку, рекрута, 2 млн ВКД).
  // Процент роста для них бессмысленный (+704300%), скрываем.
  const sharesAvgPrice    = totalShares > 0 ? sharesCost / totalShares : 0;
  const sharesIsMostlyGifted = sharesAvgPrice > 0 && sharesAvgPrice <= 1;
  const sharesGrowthPct   = sharesCost > 0 ? Math.round((sharesValue - sharesCost) / sharesCost * 100) : 0;

  // Filter state: year + month ('all' = all months in year)
  // Годы со сделками + ТЕКУЩИЙ ГОД всегда (даже без сделок — агент должен видеть
  // «этот год» в фильтре, иначе он пропадает у тех, кто ещё не закрыл сделку в году).
  const dealYears = useMemo(
    () => Array.from(new Set(myDeals.map(d => d.date.slice(0, 4)).filter(Boolean))).sort(),
    [myDeals],
  );
  const availableYears = useMemo(() => {
    const set = new Set(dealYears);
    set.add(currentYear);
    return Array.from(set).sort();
  }, [dealYears, currentYear]);
  const [filterYear, setFilterYear] = useState<string>(currentYear);

  // График по месяцам ВЫБРАННОГО ГОДА (а не текущего). Синхронизирован с
  // фильтром «Отчёт по сделкам» — переключая 2024/2025/2026 в таблице,
  // график тоже меняется.
  const monthlyStats = useMemo(() => {
    const RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const dealsInYear = myDeals.filter(d => d.date?.slice(0, 4) === filterYear);
    return RU.map((m, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const inMonth = dealsInYear.filter(d => d.date?.slice(5, 7) === mm);
      return {
        month: m,
        vkd: inMonth.reduce((s, d) => s + d.vkd, 0),
        income: inMonth.reduce((s, d) => s + d.income, 0),
      };
    });
  }, [myDeals, filterYear]);
  // При первой загрузке сделок: если в текущем году сделок ещё нет — открываем
  // последний год СО сделками (но текущий год остаётся выбираемым в фильтре).
  // Одноразово (ref-гард) — ручной выбор года потом не перетирается.
  const didInitYear = useRef(false);
  useEffect(() => {
    if (didInitYear.current || !myDeals.length) return;
    didInitYear.current = true;
    if (!dealYears.includes(currentYear) && dealYears.length) {
      setFilterYear(dealYears[dealYears.length - 1]);
    }
  }, [myDeals, dealYears, currentYear]);
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const filteredDeals = useMemo(() => myDeals.filter(d => {
    const [y, m] = d.date.split('-');
    if (y !== filterYear) return false;
    if (filterMonth !== 'all' && m !== filterMonth) return false;
    return true;
  }), [myDeals, filterYear, filterMonth]);

  const filteredVkd = filteredDeals.reduce((s, d) => s + d.vkd, 0);
  const filteredIncome = filteredDeals.reduce((s, d) => s + d.income, 0);

  // Months that actually have deals (for compact toggle)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    myDeals.forEach(d => { if (d.date.startsWith(filterYear)) set.add(d.date.slice(5, 7)); });
    return Array.from(set).sort();
  }, [myDeals, filterYear]);

  const periodLabel = filterMonth === 'all'
    ? `${filterYear} год`
    : `${MONTH_NAMES[parseInt(filterMonth, 10) - 1]} ${filterYear}`;

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={retry} />;

  return (
    <Box>
      {/* Онбординг нового агента — приветствие основателя + чек-лист (виден только новичку) */}
      <OnboardingCard />

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
              {greeting.text}, {(getCurrentAgent()?.name || '').split(' ')[1] || 'агент'}! {greeting.emoji}
            </Typography>
            <Typography sx={{ color: '#94A3B8', mt: 0.5 }}>
              {fixedPct ? (
                <>Ваш фиксированный тариф комиссии <b style={{ color: '#C9A84C' }}>{fixedPct}%</b></>
              ) : commission.toNext > 0 ? (
                <>До уровня <b style={{ color: '#C9A84C' }}>{commission.nextCommission}%</b> осталось <b style={{ color: '#C9A84C' }}>{fmt(commission.toNext)} ₽</b> ВКД</>
              ) : (
                <>Вы достигли максимального уровня комиссии <b style={{ color: '#C9A84C' }}>{commission.commission}%</b></>
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
          { icon: <AccountBalanceWalletRoundedIcon />, label: `Доход ${currentYear}`, value: `${fmt(yearTotalIncome)} ₽`, sub: `ВКД: ${fmt(yearTotalVkd)} ₽`, color: '#22C55E', delay: 0.05 },
          { icon: <HandshakeRoundedIcon />, label: `Сделок ${currentYear}`, value: yearTotalDeals, sub: 'Личные сделки', color: '#4361EE', delay: 0.1 },
          { icon: <GroupsRoundedIcon />, label: 'Заработано с команды', value: `${fmt(teamAllTime.passiveIncome)} ₽`, sub: `${teamAllTime.agents} ${teamAllTime.agents % 10 === 1 && teamAllTime.agents % 100 !== 11 ? 'партнёр' : (teamAllTime.agents % 10 >= 2 && teamAllTime.agents % 10 <= 4 && (teamAllTime.agents % 100 < 12 || teamAllTime.agents % 100 > 14) ? 'партнёра' : 'партнёров')} на всех уровнях`, color: '#C9A84C', delay: 0.15 },
          { icon: <DiamondRoundedIcon />, label: 'Акции', value: `${totalShares} шт`,
            sub: totalShares === 0
              ? '—'
              : sharesIsMostlyGifted
                ? `${fmt(sharesValue)} ₽` // подарочные — % бессмысленный
                : `${sharesGrowthPct >= 0 ? '+' : ''}${sharesGrowthPct}% · ${fmt(sharesValue)} ₽`,
            color: '#7B2FBE', delay: 0.2 },
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
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Все месяцы {filterYear} года</Typography>
                  </Box>
                  <Chip label={filterYear} size="small" sx={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', fontWeight: 700 }} />
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
                  <CommissionLevel percent={80} range={`до ${fmtMln(lvl1)}`} active={commission.level === 1} completed={commission.level > 1} />
                  <CommissionLevel percent={90} range={`${fmtMln(lvl1)}–${fmtMln(lvl2)}`} active={commission.level === 2} completed={commission.level > 2} />
                  <CommissionLevel percent={95} range={`от ${fmtMln(lvl2)}`} active={commission.level === 3} completed={false} />
                </Box>
                {fixedPct ? (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                      Фиксированный тариф <b style={{ color: '#C9A84C' }}>{fixedPct}%</b> — вне годовой прогрессии по ВКД.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>Текущий ВКД</Typography>
                      <Typography variant="caption" sx={{ color: '#C9A84C', fontWeight: 700 }}>
                        {fmt(yearTotalVkd)} / {fmt(commission.nextThreshold)} ₽
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={progressToNext} />
                    <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
                      До {commission.nextCommission}% осталось: <b style={{ color: '#F59E0B' }}>{fmt(commission.toNext)} ₽</b>
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.08)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Вознаграждение</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#C9A84C' }}>{commission.commission}%</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Уровень агента</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{commission.level}</Typography>
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

                <Box sx={{ borderRadius: 2, overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Box sx={{ minWidth: 560 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr', background: 'rgba(255,255,255,0.03)' }}>
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
                    <Box key={d.id} sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.04)', '&:hover': { background: 'rgba(201,168,76,0.04)' } }}>
                      <Box sx={{ p: 1.6 }}>
                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>{new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}</Typography>
                      </Box>
                      <Box sx={{ p: 1.6 }}>
                        <Chip label={DEAL_TYPE_RU[d.type] || d.type} size="small" sx={{
                          background: d.type === 'secondary' ? 'rgba(67,97,238,0.12)' : d.type === 'primary' ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.12)',
                          color: d.type === 'secondary' ? '#60A5FA' : d.type === 'primary' ? '#22C55E' : '#A78BFA',
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
                    <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr', borderTop: '2px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)' }}>
                      <Box sx={{ p: 1.6 }}><Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>ИТОГО · {filteredDeals.length}</Typography></Box>
                      <Box sx={{ p: 1.6 }} />
                      <Box sx={{ p: 1.6 }} />
                      <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#C9A84C', fontWeight: 900 }}>{fmt(filteredVkd)} ₽</Typography></Box>
                      <Box sx={{ p: 1.6 }}><Typography variant="body2" sx={{ color: '#22C55E', fontWeight: 900 }}>{fmt(filteredIncome)} ₽</Typography></Box>
                    </Box>
                  )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
}
