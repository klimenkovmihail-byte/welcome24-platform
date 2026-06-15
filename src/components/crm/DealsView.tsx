// CRM → модуль «Сделки (co-broking)»: агрегированный вид MLS-сделок по объектам.
// Совместные сделки (вариант А, строки-на-агента) сгруппированы по deal_group_id: объект,
// дата, статус, ВКД/доход + строки агентов с долями. Деньги считает фин.ядро (computeDealSplit),
// здесь — read-only обзор + отмена группы (group-aware на бэке, /api/deals/:id/cancel).
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Chip, Stack, Select, MenuItem, Button, CircularProgress } from '@mui/material';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import { getMlsDeals, cancelMlsDeal, priceFmt, type MlsDealGroup } from '../../api/mls';
import { getCurrentAgent } from '../../auth/auth';

const GOLD = '#C9A84C';
const DEAL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Проведена', color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
  paid: { label: 'Выплачена', color: '#60A5FA', bg: 'rgba(96,165,250,0.14)' },
  pending: { label: 'Черновик', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
  cancelled: { label: 'Отменена', color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
};

export default function DealsView() {
  const qc = useQueryClient();
  const me = getCurrentAgent();
  const canCancel = me?.role === 'super_admin' || me?.role === 'admin';
  const [status, setStatus] = useState('');
  const [year, setYear] = useState('');
  const filters = useMemo(() => ({ status: status || undefined, year: year || undefined }), [status, year]);
  const { data, isLoading } = useQuery({ queryKey: ['mls-deals', filters], queryFn: () => getMlsDeals(filters), staleTime: 20_000 });
  const items = data?.items || [];
  const [busy, setBusy] = useState<number | null>(null);

  async function cancel(g: MlsDealGroup) {
    if (!g.agents.length) return;
    if (!window.confirm(`Отменить сделку по объекту «${g.property_address || g.property_id}»? Откатятся ВКД/АП/MLM всех участников, объект вернётся из «Продан».`)) return;
    setBusy(g.group_id);
    try { await cancelMlsDeal(g.agents[0].deal_id); ['mls-deals', 'mls-properties', 'mls-count'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }
    finally { setBusy(null); }
  }

  const selSx = { minWidth: 150, height: 36, color: '#F1F5F9', fontSize: 13, '& .MuiOutlinedInput-notchedOutline': { borderColor: `${GOLD}33` }, '& .MuiSvgIcon-root': { color: '#94A3B8' } };
  const years = ['2026', '2025', '2024'];

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
        <Select size="small" value={status} displayEmpty onChange={(e) => setStatus(e.target.value)} sx={selSx}>
          <MenuItem value="" sx={{ fontSize: 13 }}>Все статусы</MenuItem>
          {Object.entries(DEAL_STATUS).map(([k, v]) => <MenuItem key={k} value={k} sx={{ fontSize: 13 }}>{v.label}</MenuItem>)}
        </Select>
        <Select size="small" value={year} displayEmpty onChange={(e) => setYear(e.target.value)} sx={selSx}>
          <MenuItem value="" sx={{ fontSize: 13 }}>Все годы</MenuItem>
          {years.map((y) => <MenuItem key={y} value={y} sx={{ fontSize: 13 }}>{y}</MenuItem>)}
        </Select>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ color: '#64748B', fontSize: 13, alignSelf: 'center' }}>{items.length} сделок</Typography>
      </Stack>

      {isLoading ? <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Box>
        : items.length === 0 ? <Typography sx={{ color: '#64748B', fontSize: 14, py: 4, textAlign: 'center' }}>Сделок по объектам пока нет. Проводите сделки в карточке объекта («Провести сделку»).</Typography>
        : (
          <Stack spacing={1.5}>
            {items.map((g) => {
              const st = DEAL_STATUS[g.status] || { label: g.status, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
              return (
                <Box key={g.group_id} sx={{ p: 2, borderRadius: 2, background: 'linear-gradient(135deg,#0F1629,#0A0E1A)', border: `1px solid ${GOLD}22` }}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Chip label={st.label} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg }} />
                    {g.joint && <Chip icon={<HandshakeRoundedIcon sx={{ fontSize: 13 }} />} label="совместная" size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: GOLD, background: `${GOLD}1A`, '& .MuiChip-icon': { color: GOLD } }} />}
                    <Typography sx={{ color: '#F1F5F9', fontWeight: 600, fontSize: 14 }}>{g.property_address || `Объект #${g.property_id}`}</Typography>
                    {g.locality && <Typography sx={{ color: '#64748B', fontSize: 12 }}>{g.locality}</Typography>}
                    <Box sx={{ flex: 1 }} />
                    <Typography sx={{ color: '#64748B', fontSize: 12 }}>{g.date}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={3} sx={{ mb: 1 }}>
                    <Box><Typography sx={{ color: '#64748B', fontSize: 11 }}>ВКД сделки</Typography><Typography sx={{ color: GOLD, fontWeight: 800, fontSize: 18 }}>{priceFmt(g.total_vkd)}</Typography></Box>
                    <Box><Typography sx={{ color: '#64748B', fontSize: 11 }}>Доход агентов</Typography><Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 18 }}>{priceFmt(g.total_income)}</Typography></Box>
                    {g.client_name && <Box><Typography sx={{ color: '#64748B', fontSize: 11 }}>Покупатель</Typography><Typography sx={{ color: '#CBD5E1', fontWeight: 600, fontSize: 14, pt: 0.5 }}>{g.client_name}</Typography></Box>}
                  </Stack>
                  <Stack spacing={0.5}>
                    {g.agents.map((ag) => {
                      const share = g.total_vkd > 0 ? Math.round((ag.vkd / g.total_vkd) * 100) : 100;
                      return (
                        <Stack key={ag.deal_id} direction="row" alignItems="center" spacing={1} sx={{ p: 0.75, borderRadius: 1, background: `${GOLD}0A` }}>
                          <Typography sx={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, flex: 1 }}>{ag.agent_name || `Агент #${ag.agent_id}`}</Typography>
                          {g.joint && <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>{share}%</Typography>}
                          <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>ВКД {priceFmt(ag.vkd)} · {ag.commission}% · {priceFmt(ag.income)}</Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                  {canCancel && g.status !== 'cancelled' && (
                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                      <Button size="small" disabled={busy === g.group_id} onClick={() => cancel(g)} sx={{ color: '#EF4444', textTransform: 'none', fontSize: 12 }}>
                        {busy === g.group_id ? 'Отмена…' : 'Отменить сделку'}
                      </Button>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
    </Box>
  );
}
