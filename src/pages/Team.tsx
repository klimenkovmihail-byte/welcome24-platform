import { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Grid, Avatar, LinearProgress, Tooltip, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody, Divider, ToggleButtonGroup, ToggleButton,
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
import {
  MARKETING_PLAN, teamAgents, teamDeals, computeTeamIncome, l1AgentsWithDeals,
} from '../data/mockData';

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
  const incomeBreakdown = useMemo(() => computeTeamIncome(), []);
  const totalPassiveIncome = incomeBreakdown.reduce((s, l) => s + l.cappedIncome, 0);
  const totalTeamVkd = incomeBreakdown.reduce((s, l) => s + l.totalVkd, 0);
  const totalTeamAgents = teamAgents.length;
  const totalTeamDeals = teamDeals.length;

  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'levels' | 'agents'>('levels');

  // Aggregates per agent for the "agents" view
  const agentStats = useMemo(() => {
    const dealsByAgent = new Map<number, { vkd: number; deals: number }>();
    teamDeals.forEach(d => {
      const cur = dealsByAgent.get(d.agentId) || { vkd: 0, deals: 0 };
      cur.vkd += d.vkd; cur.deals += 1;
      dealsByAgent.set(d.agentId, cur);
    });
    return teamAgents.map(a => ({
      ...a,
      vkd: dealsByAgent.get(a.id)?.vkd || 0,
      deals: dealsByAgent.get(a.id)?.deals || 0,
    })).sort((a, b) => a.teamLevel - b.teamLevel || b.vkd - a.vkd);
  }, []);

  return (
    <Box>
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
                  const nextLock = MARKETING_PLAN.find(p => p.required !== null && l1AgentsWithDeals < p.required);
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

            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Table size="small">
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
            teamDeals.forEach(d => {
              const cur = dealsByAgent.get(d.agentId) || { vkd: 0, deals: 0 };
              cur.vkd += d.vkd; cur.deals += 1;
              dealsByAgent.set(d.agentId, cur);
            });

            return (
              <motion.div key={l.level} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <Card sx={{ overflow: 'hidden' }}>
                  <Box
                    onClick={() => setExpandedLevel(expanded ? null : l.level)}
                    sx={{
                      p: 2.5, cursor: agentsOnLevel.length > 0 ? 'pointer' : 'default',
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr 140px 140px 160px 40px',
                      gap: 2, alignItems: 'center',
                      '&:hover': agentsOnLevel.length > 0 ? { background: `${color}08` } : undefined,
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Bubble L-number */}
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 2.5,
                      background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.6)})`,
                      color: '#0A0E1A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: 16,
                      boxShadow: `0 4px 16px ${alpha(color, 0.3)}`,
                    }}>
                      У{l.level}
                    </Box>

                    {/* Status + description */}
                    <Box>
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

                    {/* Agents count */}
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: 11 }}>Агентов</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1 }}>{l.count}</Typography>
                    </Box>

                    {/* ВКД */}
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: 11 }}>ВКД команды</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#F1F5F9', lineHeight: 1 }}>
                        {l.totalVkd > 0 ? `${fmtCompact(l.totalVkd)} ₽` : '—'}
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

                    {/* Expand arrow */}
                    <IconButton size="small" sx={{ color: '#64748B', visibility: agentsOnLevel.length > 0 ? 'visible' : 'hidden' }}>
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
                                      <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: 11 }}>{a.city}</Typography>
                                      {da && (
                                        <>
                                          <Box component="span" sx={{ width: 3, height: 3, borderRadius: '50%', background: '#475569' }} />
                                          <Typography variant="caption" sx={{ color: '#C9A84C', fontWeight: 700, fontSize: 11 }}>{da.deals} сд.</Typography>
                                        </>
                                      )}
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
            <Box sx={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 130px 110px 120px 110px', p: '12px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['У', 'Агент', 'Город', 'ВКД', 'Сделок', 'Статус', 'Дата'].map(h => (
                <Typography key={h} variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>{h}</Typography>
              ))}
            </Box>
            <AnimatePresence>
              {agentStats.map((a, i) => {
                const color = levelColors[a.teamLevel];
                return (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                    <Box sx={{
                      display: 'grid', gridTemplateColumns: '60px 1fr 120px 130px 110px 120px 110px',
                      alignItems: 'center', px: 3, py: 1.5,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      '&:hover': { background: 'rgba(201,168,76,0.04)' },
                    }}>
                      <Chip label={`У${a.teamLevel}`} size="small" sx={{ background: `${color}20`, color, fontWeight: 800, width: 36, height: 22, fontSize: 11 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: 11, fontWeight: 700, background: `${color}25`, color }}>
                          {a.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </Avatar>
                        <Typography variant="body2" sx={{ color: '#F1F5F9' }}>{a.name}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>{a.city}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: a.vkd > 0 ? '#C9A84C' : '#475569' }}>
                        {a.vkd > 0 ? `${fmt(a.vkd)} ₽` : '—'}
                      </Typography>
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
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
