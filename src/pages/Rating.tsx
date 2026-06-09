import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, Avatar, Chip, ToggleButton, ToggleButtonGroup, alpha, Menu, MenuItem, Divider, CircularProgress, Alert } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { PageSkeleton } from '../components/States';
import { useRating } from '../api/queries';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import { ratingApi, type RatingAgent } from '../api/rating';
import { getCurrentAgent } from '../auth/auth';

const fmt = (n: number) => n.toLocaleString('ru-RU');
const fmtCompact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} млн` :
  n >= 1_000     ? `${(n / 1_000).toFixed(0)} тыс` : String(n);

type SortKey = 'vkd' | 'deals';

// Генерим от 2022 до текущего года: захардкоженный список «протухал» 1 января —
// текущий год пропадал из фильтра (в Team.tsx годы уже генерятся так же).
const YEARS = Array.from({ length: new Date().getFullYear() - 2021 }, (_, i) => 2022 + i);
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** null = накопительный за весь год */
type MonthFilter = number | null;

interface AgentStat {
  agentId: number;
  agentName: string;
  city: string;
  level: 1 | 2 | 3;
  vkd: number;
  deals: number;
  isMe: boolean;
}

function agentToStat(a: RatingAgent, meId: number | null): AgentStat {
  return {
    agentId: a.id,
    agentName: a.name,
    city: a.city,
    level: (a.level || 1) as 1 | 2 | 3,
    vkd: a.vkd,
    deals: a.deals,
    isMe: meId != null && a.id === meId,
  };
}

const now = new Date();

interface PeriodPillProps {
  active: boolean;
  label: string;
  options: { value: string; label: string; divider?: boolean }[];
  value: string;
  onChange: (v: string) => void;
}

/** Pill button + dropdown. Always active visually if `active` is true. */
function PeriodPill({ active, label, options, value, onChange }: PeriodPillProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleSelect = (v: string) => { onChange(v); setAnchorEl(null); };

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={handleClick}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          border: '1px solid', borderColor: active ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.15)',
          background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
          color: active ? '#C9A84C' : '#94A3B8',
          borderRadius: '10px',
          px: 2, py: 0.85,
          fontWeight: 600, fontSize: 13,
          cursor: 'pointer',
          transition: 'all 0.15s',
          fontFamily: 'inherit',
          '&:hover': { background: active ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.05)' },
        }}
      >
        {label}
        <Box component="span" sx={{ ml: 0.4, opacity: 0.6, fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</Box>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: {
          mt: 0.8,
          background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)',
          border: '1px solid rgba(201,168,76,0.15)', borderRadius: 2,
          minWidth: 160,
        } } }}
      >
        {options.flatMap((opt, i) => {
          const items = [
            <MenuItem
              key={`item-${opt.value}`}
              selected={opt.value === value}
              onClick={() => handleSelect(opt.value)}
              sx={{
                fontSize: 13,
                '&.Mui-selected': { background: 'rgba(201,168,76,0.18)', color: '#C9A84C', fontWeight: 700 },
                '&:hover': { background: 'rgba(201,168,76,0.08)' },
              }}
            >
              {opt.label}
            </MenuItem>,
          ];
          if (opt.divider) {
            items.push(<Divider key={`d-${i}`} sx={{ borderColor: 'rgba(201,168,76,0.1)', my: 0.5 }} />);
          }
          return items;
        })}
      </Menu>
    </>
  );
}

export default function Rating() {
  const [sortBy, setSortBy] = useState<SortKey>('vkd');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<MonthFilter>(null);

  // Рейтинг через react-query (кэш по фильтру год/месяц).
  const ratingOpts = useMemo(() => {
    const o: { year?: string; month?: string; limit?: number } = { year: String(year), limit: 100 };
    if (month !== null) o.month = String(month).padStart(2, '0');
    return o;
  }, [year, month]);
  const ratingQ = useRating(ratingOpts);
  const agents: RatingAgent[] = ratingQ.data?.agents ?? [];
  const loading = ratingQ.isLoading;
  const error = ratingQ.error as Error | null;

  const me = getCurrentAgent();
  const meId = typeof me?.id === 'number' ? me.id : null;

  const periodLabel = month === null
    ? `${year} год`
    : `${MONTH_NAMES[month - 1]} ${year}`;

  // Общефирменный рейтинг (бэк уже отсортировал по ВКД desc).
  const ranking: AgentStat[] = useMemo(() => {
    const all = agents.map(a => agentToStat(a, meId));
    return all.sort((a, b) => sortBy === 'vkd' ? b.vkd - a.vkd : b.deals - a.deals);
  }, [agents, sortBy, meId]);

  const top3 = ranking.slice(0, 3);
  const top5 = ranking.slice(0, 5);

  const metricLabel = sortBy === 'vkd' ? 'ВКД' : 'Сделки';
  const renderMetric = (s: AgentStat) =>
    sortBy === 'vkd' ? `${fmt(s.vkd)} ₽` : `${s.deals} сд.`;

  // === Podium ===
  // We render 3 columns: pos 2 — left, pos 1 — center, pos 3 — right.
  const podiumOrder: (AgentStat | undefined)[] = [top3[1], top3[0], top3[2]];
  const podiumPositions = [2, 1, 3];
  const podiumHeights = [160, 200, 140];
  const badgeColors = ['#C9A84C', '#94A3B8', '#CD7F32'] as const;

  const toggleSx = {
    '& .MuiToggleButton-root': {
      color: '#64748B', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px !important',
      px: 2, fontWeight: 600, fontSize: 13,
      '&.Mui-selected': { background: 'rgba(201,168,76,0.15)', color: '#C9A84C', borderColor: 'rgba(201,168,76,0.3)' }
    }
  };
  const sortToggleSx = {
    '& .MuiToggleButton-root': {
      color: '#64748B', border: '1px solid rgba(67,97,238,0.15)', borderRadius: '10px !important',
      px: 2, fontWeight: 600, fontSize: 13,
      '&.Mui-selected': { background: 'rgba(67,97,238,0.15)', color: '#4361EE', borderColor: 'rgba(67,97,238,0.3)' }
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
      {loading && <PageSkeleton />}
      {/* Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Месяц: всегда видим, по умолчанию — «Весь год» */}
          <PeriodPill
            active={month !== null}
            label={month === null ? 'Весь год' : MONTH_NAMES[month - 1]}
            options={[
              { value: 'all' as const, label: 'Весь год', divider: true },
              ...MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name })),
            ]}
            value={month === null ? 'all' : String(month)}
            onChange={(v) => setMonth(v === 'all' ? null : Number(v))}
          />
          {/* Год: всегда видим */}
          <PeriodPill
            active={true}
            label={String(year)}
            options={YEARS.map(y => ({ value: String(y), label: String(y) }))}
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
          />
        </Box>

        <ToggleButtonGroup value={sortBy} exclusive onChange={(_, v) => v && setSortBy(v)} size="small" sx={sortToggleSx}>
          <ToggleButton value="vkd">ВКД</ToggleButton>
          <ToggleButton value="deals">Сделки</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Podium */}
      <Card sx={{ mb: 4, overflow: 'visible' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
              🏆 Топ-3 агентов Welcome 24
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {periodLabel} · по {metricLabel.toLowerCase()}
            </Typography>
          </Box>

          {top3.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography sx={{ color: '#64748B' }}>В этом периоде нет сделок</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
              {podiumOrder.map((agent, idx) => {
                if (!agent) return <Box key={idx} sx={{ width: 100 }} />;
                const pos = podiumPositions[idx];
                const height = podiumHeights[idx];
                const color = badgeColors[pos - 1];
                return (
                  <motion.div
                    key={`${year}-${month}-${sortBy}-${agent.agentId}-${idx}`}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.15, duration: 0.5 }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      {pos === 1 && (
                        <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                          <Typography sx={{ fontSize: 32 }}>👑</Typography>
                        </motion.div>
                      )}
                      <Avatar sx={{
                        width: pos === 1 ? 72 : 56, height: pos === 1 ? 72 : 56,
                        fontSize: pos === 1 ? 22 : 18, fontWeight: 800,
                        background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.6)})`,
                        color: pos === 1 ? '#0A0E1A' : '#fff',
                        border: `3px solid ${color}`,
                        boxShadow: `0 0 24px ${alpha(color, 0.4)}`,
                      }}>
                        {agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </Avatar>
                      <Box sx={{ textAlign: 'center', mb: 1, maxWidth: 130 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#F1F5F9', display: 'block', lineHeight: 1.3 }}>
                          {agent.agentName.split(' ').slice(0, 2).join(' ')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11 }}>{agent.city}</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {sortBy === 'vkd' ? (
                            <Chip
                              size="small"
                              label={fmtCompact(agent.vkd) + ' ₽'}
                              sx={{ height: 18, fontSize: 10, background: 'rgba(201,168,76,0.18)', color: '#C9A84C', fontWeight: 700, '& .MuiChip-label': { px: 1 } }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label={`${agent.deals} сделок`}
                              sx={{ height: 18, fontSize: 10, background: 'rgba(67,97,238,0.18)', color: '#60A5FA', fontWeight: 700, '& .MuiChip-label': { px: 1 } }}
                            />
                          )}
                        </Box>
                      </Box>
                      <Box sx={{
                        width: 100, height,
                        background: `linear-gradient(180deg, ${alpha(color, 0.25)} 0%, ${alpha(color, 0.08)} 100%)`,
                        border: `1px solid ${alpha(color, 0.3)}`, borderBottom: 'none',
                        borderRadius: '12px 12px 0 0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: alpha(color, 0.4) }}>{pos}</Typography>
                      </Box>
                    </Box>
                  </motion.div>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Top-5 table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Топ-5</Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {periodLabel} · сортировка по {metricLabel.toLowerCase()}
            </Typography>
          </Box>

          {/* Header */}
          <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 620 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr 130px 150px',
            p: '12px 24px',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {['#', 'Агент', 'Город', metricLabel].map(h => (
              <Typography key={h} variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>{h}</Typography>
            ))}
          </Box>

          {/* Rows */}
          <AnimatePresence mode="wait">
            <motion.div key={`${year}-${month}-${sortBy}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {top5.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: '#64748B' }}>Нет данных в этом периоде</Typography>
                </Box>
              ) : top5.map((agent, idx) => {
                const rank = idx + 1;
                const rankColor = rank === 1 ? '#C9A84C' : rank === 2 ? '#94A3B8' : rank === 3 ? '#CD7F32' : '#64748B';
                const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : String(rank);
                return (
                  <motion.div
                    key={agent.agentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                  >
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: '52px 1fr 130px 150px',
                      alignItems: 'center',
                      px: 3, py: 2,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: agent.isMe ? 'rgba(201,168,76,0.06)' : 'transparent',
                      borderLeft: agent.isMe ? '3px solid #C9A84C' : '3px solid transparent',
                      '&:hover': { background: agent.isMe ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.02)' },
                      transition: 'background 0.2s',
                    }}>
                      <Typography sx={{ fontWeight: 800, color: rankColor, fontSize: rank <= 3 ? 20 : 16 }}>
                        {medal}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{
                          width: 36, height: 36, fontSize: 13, fontWeight: 700,
                          background: `linear-gradient(135deg, ${rankColor}, ${alpha(rankColor, 0.5)})`,
                          color: rank <= 3 ? '#0A0E1A' : '#fff',
                        }}>
                          {agent.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#F1F5F9', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {agent.agentName}
                            {agent.isMe && <Chip label="Вы" size="small" sx={{ height: 16, fontSize: 10, background: 'rgba(201,168,76,0.2)', color: '#C9A84C', fontWeight: 800, '& .MuiChip-label': { px: 1 } }} />}
                          </Typography>
                          <Chip label={`Уровень ${agent.level}`} size="small" sx={{ height: 16, fontSize: 10, mt: 0.25, background: 'rgba(67,97,238,0.12)', color: '#4361EE', '& .MuiChip-label': { px: 1 } }} />
                        </Box>
                      </Box>

                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>{agent.city}</Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {sortBy === 'vkd' ? (
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#C9A84C' }}>{fmt(agent.vkd)} ₽</Typography>
                        ) : (
                          <>
                            <HandshakeRoundedIcon sx={{ color: '#4361EE', fontSize: 18 }} />
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{agent.deals} сделок</Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
          </Box>
          </Box>

        </CardContent>
      </Card>
    </Box>
  );
}
