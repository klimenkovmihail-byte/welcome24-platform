import { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Avatar, LinearProgress, Tooltip, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Divider, ToggleButtonGroup, ToggleButton, Button,
  Collapse, alpha,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { type TeamMember, type TeamLevelStats, type MarketingPlanLevel } from '../api/team';
import { Tabs, Tab } from '@mui/material';
import { CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { PageSkeleton } from '../components/States';
import { useTeam } from '../api/queries';

const MONTHS = [
  { value: '01', label: 'Январь' }, { value: '02', label: 'Февраль' }, { value: '03', label: 'Март' },
  { value: '04', label: 'Апрель' }, { value: '05', label: 'Май' }, { value: '06', label: 'Июнь' },
  { value: '07', label: 'Июль' }, { value: '08', label: 'Август' }, { value: '09', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' }, { value: '11', label: 'Ноябрь' }, { value: '12', label: 'Декабрь' },
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = ['all', ...Array.from({ length: CURRENT_YEAR - 2022 + 1 }, (_, i) => String(2022 + i)).reverse()];

/** Считает пассивный доход агента по уровням MLM-плана.
 *  Доход с КАЖДОГО члена команды обрезается по cap уровня (capPerAgent), а
 *  итог уровня = сумма этих обрезанных значений. Так строки раскрытого списка
 *  суммируются ровно в итог уровня, и ни одна строка/итог не превышает cap. */
function computeIncome(
  levels: TeamLevelStats[],
  plan: MarketingPlanLevel[],
  l1WithDeals: number,
  agents: TeamMember[],
) {
  return levels.map(stats => {
    const p = plan.find(x => x.level === stats.level);
    const growingUnlocked = p?.required == null ? true : l1WithDeals >= (p.required ?? 0);
    const effectivePct = (p?.protected || 0) + (growingUnlocked && p?.growing ? p.growing : 0);
    const capPerAgent = p?.capPerAgent ?? 0;
    const onLevel = agents.filter(a => a.teamLevel === stats.level);
    const perAgentRaw = (a: TeamMember) => Math.round((a.vkd || 0) * effectivePct / 100);
    const perAgentCapped = (a: TeamMember) =>
      capPerAgent > 0 ? Math.min(perAgentRaw(a), capPerAgent) : perAgentRaw(a);
    const rawIncome = onLevel.reduce((s, a) => s + perAgentRaw(a), 0);
    const cappedIncome = onLevel.reduce((s, a) => s + perAgentCapped(a), 0);
    return { ...stats, growingUnlocked, effectivePct, rawIncome, cappedIncome, capPerAgent, required: p?.required ?? null, protected: p?.protected ?? 0, growing: p?.growing ?? null };
  });
}

const fmt = (n: number) => n.toLocaleString('ru-RU');
const fmtCompact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} млн` :
  n >= 1_000     ? `${(n / 1_000).toFixed(0)} тыс` : String(n);

const levelColors: Record<number, string> = {
  1: '#C9A84C', // золото
  2: '#4361EE', // синий
  3: '#22C55E', // зелёный
  4: '#F59E0B', // оранжевый
  5: '#A855F7', // фиолетовый
  6: '#EC4899', // розовый
  7: '#06B6D4', // циан
};

export default function Team() {
  // Фильтр периода: «всё время» / конкретный год / год+месяц
  const [filterYear, setFilterYear] = useState<string>(String(CURRENT_YEAR));
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Команда через react-query (кэш по фильтру; данные team делятся с Дашбордом).
  const teamOpts = useMemo(() => {
    const o: { year?: string; month?: string } = {};
    if (filterYear !== 'all') o.year = filterYear;
    if (filterMonth !== 'all' && filterYear !== 'all') o.month = filterMonth;
    return o;
  }, [filterYear, filterMonth]);
  const teamQ = useTeam(teamOpts);
  const teamAgents: TeamMember[] = teamQ.data?.agents ?? [];
  const levels: TeamLevelStats[] = teamQ.data?.levels ?? [];
  const marketingPlan: MarketingPlanLevel[] = teamQ.data?.marketingPlan ?? [];
  const totals = teamQ.data?.totals ?? { agents: 0, active: 0, deals: 0, vkd: 0, income: 0 };
  const loading = teamQ.isLoading;
  const error = teamQ.error as Error | null;


  const periodLabel = filterYear === 'all'
    ? 'за всё время'
    : filterMonth === 'all'
      ? `за ${filterYear} год`
      : `${MONTHS.find(m => m.value === filterMonth)?.label} ${filterYear}`;

  const l1AgentsWithDeals = levels[0]?.withDealCount ?? 0;
  const incomeBreakdown = useMemo(
    () => computeIncome(levels, marketingPlan, l1AgentsWithDeals, teamAgents),
    [levels, marketingPlan, l1AgentsWithDeals, teamAgents],
  );
  const totalPassiveIncome = incomeBreakdown.reduce((s, l) => s + l.cappedIncome, 0);
  // Ставка (effectivePct) и cap по уровню — чтобы показать рубли дохода ментора
  // с конкретного агента, обрезанные по потолку уровня (как и итог уровня).
  const rateByLevel = useMemo(() => new Map(incomeBreakdown.map(l => [l.level, l.effectivePct])), [incomeBreakdown]);
  const capByLevel = useMemo(() => new Map(incomeBreakdown.map(l => [l.level, l.capPerAgent])), [incomeBreakdown]);
  // Доход с агента + флаг «упёрся в потолок уровня» (capped).
  const agentIncomeInfo = (a: TeamMember) => {
    const raw = Math.round((a.vkd || 0) * (rateByLevel.get(a.teamLevel) || 0) / 100);
    const cap = capByLevel.get(a.teamLevel) || 0;
    const capped = cap > 0 && raw > cap;
    return { value: capped ? cap : raw, capped };
  };
  const agentIncome = (a: TeamMember) => agentIncomeInfo(a).value;
  const totalTeamVkd = totals.vkd;
  const totalTeamAgents = totals.agents;
  const totalTeamDeals = totals.deals;

  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'levels' | 'agents'>('levels');
  const TEAM_PAGE = 50;
  const [teamVisible, setTeamVisible] = useState(TEAM_PAGE); // не рендерим всю команду разом

  // Все агенты команды, отсортированные для табличного вида.
  const agentStats = useMemo(
    () => [...teamAgents].sort((a, b) => a.teamLevel - b.teamLevel || b.vkd - a.vkd),
    [teamAgents],
  );


  return (
    <Box>

      {<>
      {/* ===== Период (год / месяц) ===== */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>Период:</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Год</InputLabel>
          <Select label="Год" value={filterYear} onChange={e => { setFilterYear(e.target.value); if (e.target.value === 'all') setFilterMonth('all'); }}>
            {YEARS.map(y => <MenuItem key={y} value={y}>{y === 'all' ? 'Все годы' : y}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }} disabled={filterYear === 'all'}>
          <InputLabel>Месяц</InputLabel>
          <Select label="Месяц" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <MenuItem value="all">Весь год</MenuItem>
            {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ color: '#64748B', ml: 'auto' }}>
          Доход и сделки — {periodLabel}. Состав команды (MLM) — актуальный.
        </Typography>
      </Box>

      {loading && <PageSkeleton />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>
      )}

      {/* ===== Hero — passive income summary ===== */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <Card sx={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
              <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 90% 10%, rgba(201,168,76,0.18) 0%, transparent 60%)' }} />
              <CardContent sx={{ p: 3, position: 'relative' }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Пассивный доход с команды
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, color: '#F1F5F9', mt: 0.5, lineHeight: 1 }}>
                  {fmt(totalPassiveIncome)} ₽
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                  <TrendingUpRoundedIcon sx={{ color: '#22C55E', fontSize: 18 }} />
                  <Typography variant="body2" sx={{ color: '#22C55E', fontWeight: 700 }}>
                    с {totalTeamAgents} агентов · {totalTeamDeals} сделок · {fmtCompact(totalTeamVkd)} ₽ ВКД команды
                  </Typography>
                </Box>

                <Divider sx={{ my: 2.5, borderColor: 'rgba(201,168,76,0.1)' }} />

                <Grid container spacing={2}>
                  {incomeBreakdown.map(l => {
                    const hasData = l.count > 0;
                    const c = levelColors[l.level];
                    return (
                      <Grid size={{ xs: 4, sm: 12 / 7 }} key={l.level}>
                        <Box sx={{
                          textAlign: 'center', p: 1,
                          borderRadius: 2,
                          background: hasData ? `${c}18` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${hasData ? `${c}45` : 'rgba(255,255,255,0.08)'}`,
                        }}>
                          <Typography variant="caption" sx={{ color: hasData ? c : '#94A3B8', fontSize: 11, fontWeight: 800, display: 'block', letterSpacing: '0.04em' }}>
                            У{l.level}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: hasData ? c : '#94A3B8', lineHeight: 1.1, fontSize: 18 }}>
                            {l.count}
                          </Typography>
                          <Typography variant="caption" sx={{ color: hasData ? '#E2E8F0' : '#64748B', fontSize: 10.5, fontWeight: 600, display: 'block' }}>
                            {l.cappedIncome > 0 ? `${fmtCompact(l.cappedIncome)} ₽` : '—'}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Ваш ключ к доходу
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                    Количество агентов на 1 уровне с минимум 1 сделкой
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h2" sx={{ fontWeight: 900, color: '#C9A84C', lineHeight: 1 }}>
                    {l1AgentsWithDeals}
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#64748B' }}>агентов</Typography>
                </Box>

                {/* Next unlock progress */}
                {(() => {
                  const nextLock = marketingPlan.find(p => p.required !== null && p.required !== undefined && l1AgentsWithDeals < p.required);
                  if (!nextLock) {
                    return (
                      <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmojiEventsRoundedIcon sx={{ color: '#22C55E', fontSize: 20 }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#22C55E' }}>
                            Все 7 уровней разблокированы
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }
                  const need = nextLock.required! - l1AgentsWithDeals;
                  const progress = (l1AgentsWithDeals / nextLock.required!) * 100;
                  return (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          До разблокировки <b style={{ color: '#C9A84C' }}>У{nextLock.level} ({nextLock.growing}%)</b>
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#C9A84C', fontWeight: 700 }}>
                          {l1AgentsWithDeals} / {nextLock.required}
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                      <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.8, display: 'block' }}>
                        Осталось привлечь <b style={{ color: '#F59E0B' }}>{need} {need === 1 ? 'агента' : need < 5 ? 'агента' : 'агентов'}</b> на 1 уровень с сделками
                      </Typography>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* ===== Marketing plan table — interactive guide ===== */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2 }}>
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <InfoOutlinedIcon sx={{ color: '#C9A84C' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Маркетинговый план</Typography>
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  Чем больше агентов на 1 уровне с сделкой — тем больше уровней дохода открыто
                </Typography>
              </Box>
            </Box>

            <Box sx={{ borderRadius: 2, overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Table size="small" sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 100, fontWeight: 700, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Уровень</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Защищённый доход
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Растущий доход
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Условие
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Кап с агента в год
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#64748B', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Статус
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incomeBreakdown.map(l => {
                    const color = levelColors[l.level];
                    return (
                      <TableRow key={l.level} sx={{
                        background: l.growingUnlocked ? `${color}08` : 'transparent',
                        '&:hover': { background: `${color}12` },
                        transition: 'background 0.15s',
                      }}>
                        <TableCell>
                          <Chip
                            label={`Уровень ${l.level}`}
                            size="small"
                            sx={{ background: `${color}20`, color, fontWeight: 800, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
                            {l.protected}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {l.growing === null ? (
                            <Typography variant="caption" sx={{ color: '#475569' }}>—</Typography>
                          ) : (
                            <Typography variant="body2" sx={{ fontWeight: 700, color: l.growingUnlocked ? '#22C55E' : '#64748B' }}>
                              +{l.growing}%
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.required === null ? (
                            <Typography variant="caption" sx={{ color: '#64748B' }}>всегда активен</Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                              {l.required} агентов на У1 с сделкой
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#F1F5F9' }}>{fmt(l.capPerAgent)} ₽</Typography>
                        </TableCell>
                        <TableCell align="center">
                          {l.required === null || l.growingUnlocked ? (
                            <Chip
                              size="small"
                              icon={<LockOpenRoundedIcon sx={{ fontSize: 14 }} />}
                              label="Открыто"
                              sx={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontWeight: 700, fontSize: 11, '& .MuiChip-icon': { color: '#22C55E' } }}
                            />
                          ) : (
                            <Tooltip title={`Нужно ещё ${l.required! - l1AgentsWithDeals} агентов с сделкой на У1`}>
                              <Chip
                                size="small"
                                icon={<LockRoundedIcon sx={{ fontSize: 14 }} />}
                                label={`${l1AgentsWithDeals}/${l.required}`}
                                sx={{ background: 'rgba(100,116,139,0.15)', color: '#94A3B8', fontWeight: 700, fontSize: 11, '& .MuiChip-icon': { color: '#94A3B8' } }}
                              />
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Levels OR Agents view ===== */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
            {viewMode === 'levels' ? 'Команда по уровням' : 'Все агенты в команде'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            {viewMode === 'levels'
              ? 'Клик по уровню — раскрыть список агентов'
              : `${teamAgents.length} человек в вашей структуре`}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: '#64748B', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px !important',
              px: 2, fontWeight: 600, fontSize: 13,
              '&.Mui-selected': { background: 'rgba(201,168,76,0.15)', color: '#C9A84C', borderColor: 'rgba(201,168,76,0.3)' },
            },
          }}
        >
          <ToggleButton value="levels">По уровням</ToggleButton>
          <ToggleButton value="agents">Все агенты</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === 'levels' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {incomeBreakdown.map((l, idx) => {
            const color = levelColors[l.level];
            const agentsOnLevel = teamAgents.filter(a => a.teamLevel === l.level);
            const expanded = expandedLevel === l.level;
            const dealsByAgent = new Map<number, { vkd: number; deals: number }>();
            agentsOnLevel.forEach(a => {
              dealsByAgent.set(a.id, { vkd: a.vkd, deals: a.deals });
            });

            return (
              <motion.div key={l.level} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <Card sx={{ overflow: 'hidden' }}>
                  <Box
                    onClick={() => setExpandedLevel(expanded ? null : l.level)}
                    sx={{
                      p: 2.5, cursor: agentsOnLevel.length > 0 ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                      '&:hover': agentsOnLevel.length > 0 ? { background: `${color}08` } : undefined,
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Bubble L-number */}
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2.5, flexShrink: 0,
                      background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.6)})`,
                      color: '#0A0E1A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: 16,
                      boxShadow: `0 4px 16px ${alpha(color, 0.3)}`,
                    }}>
                      У{l.level}
                    </Box>

                    {/* Status + description */}
                    <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
                          Уровень {l.level}
                        </Typography>
                        {l.required === null || l.growingUnlocked ? (
                          <Chip icon={<LockOpenRoundedIcon sx={{ fontSize: 12 }} />} label="Открыт" size="small" sx={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', fontWeight: 700, fontSize: 10, height: 18, '& .MuiChip-icon': { color: '#22C55E' } }} />
                        ) : (
                          <Chip icon={<LockRoundedIcon sx={{ fontSize: 12 }} />} label="Закрыт" size="small" sx={{ background: 'rgba(100,116,139,0.15)', color: '#94A3B8', fontWeight: 700, fontSize: 10, height: 18, '& .MuiChip-icon': { color: '#94A3B8' } }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        {l.protected}% защищённый {l.growing !== null && (
                          <>
                            · {l.growingUnlocked ? '+' : ''}<b style={{ color: l.growingUnlocked ? '#22C55E' : '#475569' }}>{l.growing}% растущий</b>
                          </>
                        )}
                        · {fmt(l.capPerAgent)} ₽ кап
                      </Typography>
                    </Box>

                    {/* Stats group — на мобиле переносится на отдельную строку (order:1) */}
                    <Box sx={{
                      display: 'flex', alignItems: 'flex-start', gap: { xs: 1, sm: 3 },
                      flexShrink: 0, order: { xs: 1, sm: 0 },
                      width: { xs: '100%', sm: 'auto' },
                      justifyContent: { xs: 'space-between', sm: 'flex-end' },
                    }}>
                      {/* Agents count */}
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: 11 }}>Агентов</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1 }}>{l.count}</Typography>
                      </Box>

                      {/* ВКД */}
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: 11 }}>ВКД команды</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#F1F5F9', lineHeight: 1 }}>
                          {l.totalVkd > 0 ? `${fmt(l.totalVkd)} ₽` : '—'}
                        </Typography>
                      </Box>

                      {/* Passive income */}
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: 11 }}>Ваш доход</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: l.cappedIncome > 0 ? '#22C55E' : '#475569', lineHeight: 1 }}>
                          {l.cappedIncome > 0 ? `${fmt(l.cappedIncome)} ₽` : '—'}
                        </Typography>
                        {l.cappedIncome > 0 && (
                          <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10 }}>
                            по ставке {l.effectivePct.toFixed(1)}%
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Expand arrow */}
                    <IconButton size="small" sx={{ color: '#64748B', flexShrink: 0, visibility: agentsOnLevel.length > 0 ? 'visible' : 'hidden' }}>
                      <KeyboardArrowDownRoundedIcon sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </IconButton>
                  </Box>

                  <Collapse in={expanded}>
                    <Divider sx={{ borderColor: 'rgba(201,168,76,0.08)' }} />
                    <Box sx={{ p: 2, background: 'rgba(255,255,255,0.015)' }}>
                      {agentsOnLevel.length === 0 ? (
                        <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 2 }}>
                          На этом уровне пока нет агентов
                        </Typography>
                      ) : (
                        <Grid container spacing={1.5}>
                          {agentsOnLevel.map(a => {
                            const da = dealsByAgent.get(a.id);
                            return (
                              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={a.id}>
                                <Box sx={{
                                  p: 1.5, borderRadius: 2,
                                  background: 'rgba(15,22,41,0.6)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  display: 'flex', alignItems: 'center', gap: 1.5,
                                }}>
                                  <Avatar sx={{ width: 36, height: 36, fontSize: 12, fontWeight: 700, background: `${color}30`, color, border: `1px solid ${color}40` }}>
                                    {a.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                  </Avatar>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#F1F5F9', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {a.name.split(' ').slice(0, 2).join(' ')}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center' }}>
                                      <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.city}</Typography>
                                      {(() => { const inc = agentIncomeInfo(a); return inc.value > 0 && (
                                        <>
                                          <Box component="span" sx={{ width: 3, height: 3, borderRadius: '50%', background: '#475569', flexShrink: 0 }} />
                                          <Typography variant="caption" sx={{ color: inc.capped ? '#EF4444' : '#22C55E', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>+{fmt(inc.value)} ₽</Typography>
                                          {inc.capped && (
                                            <Chip label="cap" size="small" sx={{ height: 15, fontSize: 9, fontWeight: 800, background: 'rgba(239,68,68,0.15)', color: '#EF4444', '& .MuiChip-label': { px: 0.6 } }} />
                                          )}
                                        </>
                                      ); })()}
                                    </Box>
                                  </Box>
                                  {a.status === 'inactive' && (
                                    <Chip label="не активен" size="small" sx={{ background: 'rgba(100,116,139,0.15)', color: '#64748B', fontSize: 9, height: 16 }} />
                                  )}
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      )}
                    </Box>
                  </Collapse>
                </Card>
              </motion.div>
            );
          })}
        </Box>
      ) : (
        // === Agents flat table view ===
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '52px 230px 150px 120px 120px 84px 110px 92px', minWidth: 958, p: '12px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['У', 'Агент', 'Город', 'ВКД', 'Доход', 'Сделок', 'Статус', 'Дата'].map(h => (
                <Typography key={h} variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>{h}</Typography>
              ))}
            </Box>
              {agentStats.slice(0, teamVisible).map((a) => {
                const color = levelColors[a.teamLevel];
                return (
                  <div key={a.id}>
                    <Box sx={{
                      display: 'grid', gridTemplateColumns: '52px 230px 150px 120px 120px 84px 110px 92px', minWidth: 958,
                      alignItems: 'center', px: 3, py: 1.5,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      '&:hover': { background: 'rgba(201,168,76,0.04)' },
                    }}>
                      <Chip label={`У${a.teamLevel}`} size="small" sx={{ background: `${color}20`, color, fontWeight: 800, width: 36, height: 22, fontSize: 11 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, pr: 1 }}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, background: `${color}25`, color, flexShrink: 0 }}>
                          {a.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </Avatar>
                        <Typography variant="body2" sx={{ color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pr: 1 }}>{a.city || '—'}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: a.vkd > 0 ? '#C9A84C' : '#475569' }}>
                        {a.vkd > 0 ? `${fmt(a.vkd)} ₽` : '—'}
                      </Typography>
                      {(() => { const inc = agentIncomeInfo(a); return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: inc.value > 0 ? (inc.capped ? '#EF4444' : '#22C55E') : '#475569' }}>
                            {inc.value > 0 ? `+${fmt(inc.value)} ₽` : '—'}
                          </Typography>
                          {inc.capped && (
                            <Chip label="cap" size="small" sx={{ height: 16, fontSize: 9, fontWeight: 800, background: 'rgba(239,68,68,0.15)', color: '#EF4444', '& .MuiChip-label': { px: 0.6 } }} />
                          )}
                        </Box>
                      ); })()}
                      <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 600 }}>{a.deals || '—'}</Typography>
                      <Chip label={a.status === 'active' ? 'активен' : 'не активен'} size="small" sx={{
                        background: a.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.12)',
                        color: a.status === 'active' ? '#22C55E' : '#64748B',
                        fontWeight: 600, fontSize: 11, width: 'fit-content',
                      }} />
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        {new Date(a.joinDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </Typography>
                    </Box>
                  </div>
                );
              })}
            </Box>
            {agentStats.length > teamVisible && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Button variant="outlined" onClick={() => setTeamVisible(c => c + TEAM_PAGE)}
                  sx={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C', fontWeight: 700, '&:hover': { borderColor: '#C9A84C' } }}>
                  Показать ещё ({agentStats.length - teamVisible})
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      </>}
    </Box>
  );
}
