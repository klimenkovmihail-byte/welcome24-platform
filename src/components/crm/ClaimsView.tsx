// CRM → модуль «Закрепления (procuring cause)».
// Две части: «Мои закрепления» (видит каждый агент — за кем закреплены его покупатели) +
// «Споры о закреплении» (только арбитр: листинг-менеджер/super_admin — выбирает победителя).
// Деньги делит co-broking-сделка (вариант А); закрепление лишь решает, кому достанется
// buyer-доля. Контакт покупателя в споре виден арбитру (он и так премодератор, 152-ФЗ ок).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Chip, Stack, Button, Divider } from '@mui/material';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import { getMyClaims, getClaimDisputes, resolveDispute, releaseClaim, type MyClaim, type DisputeGroup } from '../../api/mls';
import { getCurrentAgent } from '../../auth/auth';

const GOLD = '#C9A84C';
const CLAIM_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Закреплён', color: '#22C55E', bg: 'rgba(34,197,94,0.14)' },
  disputed: { label: 'Спор', color: '#F59E0B', bg: 'rgba(245,158,11,0.16)' },
  honored: { label: 'Реализован', color: '#60A5FA', bg: 'rgba(96,165,250,0.14)' },
};
const BASIS_LABEL: Record<string, string> = { showing: 'Показ', viewing_request: 'Заявка на показ', buyer_request: 'Заявка покупателя', manual: 'Вручную' };

function MyClaimsList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['mls-my-claims'], queryFn: getMyClaims, staleTime: 20_000 });
  const items = data?.items || [];
  const release = async (id: number) => { await releaseClaim(id); qc.invalidateQueries({ queryKey: ['mls-my-claims'] }); };
  return (
    <Box>
      <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 15, mb: 1 }}>Мои закрепления покупателей</Typography>
      {isLoading ? <Typography sx={{ color: '#64748B', fontSize: 13 }}>Загрузка…</Typography>
        : items.length === 0 ? <Typography sx={{ color: '#64748B', fontSize: 13 }}>Нет закреплений. Зафиксируйте показ в карточке объекта, чтобы закрепить покупателя.</Typography>
        : (
          <Stack spacing={1}>
            {items.map((c: MyClaim) => {
              const st = CLAIM_STATUS[c.status] || { label: c.status, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' };
              return (
                <Box key={c.id} sx={{ p: 1.25, borderRadius: 1.5, background: 'rgba(15,22,41,0.6)', border: '1px solid rgba(168,85,247,0.18)' }}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={st.label} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg }} />
                    <Typography sx={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>{c.buyer_name || 'Покупатель'}</Typography>
                    {c.buyer_phone && <Typography sx={{ color: GOLD, fontSize: 13 }}>{c.buyer_phone}</Typography>}
                    <Box sx={{ flex: 1 }} />
                    {(c.status === 'active' || c.status === 'disputed') && (
                      <Button size="small" onClick={() => release(c.id)} sx={{ color: '#EF4444', textTransform: 'none', minWidth: 0, fontSize: 12 }}>Отпустить</Button>
                    )}
                  </Stack>
                  <Typography sx={{ color: '#94A3B8', fontSize: 12, mt: 0.25 }}>
                    {c.property_address || `Объект #${c.property_id}`}{c.locality ? ` · ${c.locality}` : ''}
                  </Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 11 }}>
                    {BASIS_LABEL[c.basis] || c.basis}{c.status === 'active' ? ` · защита до ${c.protected_until?.slice(0, 10)}` : ''}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
    </Box>
  );
}

function DisputesList() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['mls-disputes'], queryFn: getClaimDisputes, staleTime: 15_000, retry: false });
  const groups = data?.items || [];
  const resolve = async (claimId: number) => { await resolveDispute(claimId); qc.invalidateQueries({ queryKey: ['mls-disputes'] }); qc.invalidateQueries({ queryKey: ['mls-my-claims'] }); };
  if (error) return null; // не-арбитру бэк отдаёт 403 → секцию скрываем
  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <GavelRoundedIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
        <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 15 }}>Споры о закреплении (арбитраж)</Typography>
        {groups.length > 0 && <Chip label={groups.length} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 800, color: '#fff', background: '#EF4444' }} />}
      </Stack>
      {isLoading ? <Typography sx={{ color: '#64748B', fontSize: 13 }}>Загрузка…</Typography>
        : groups.length === 0 ? <Typography sx={{ color: '#64748B', fontSize: 13 }}>Открытых споров нет.</Typography>
        : (
          <Stack spacing={1.5}>
            {groups.map((g: DisputeGroup) => (
              <Box key={`${g.property_id}:${g.buyer_contact_id}`} sx={{ p: 1.5, borderRadius: 2, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Typography sx={{ color: '#F1F5F9', fontSize: 14, fontWeight: 700 }}>{g.buyer_name || 'Покупатель'}{g.buyer_phone ? ` · ${g.buyer_phone}` : ''}</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: 12, mb: 1 }}>
                  {g.property_address || `Объект #${g.property_id}`}{g.locality ? ` · ${g.locality}` : ''} · листинг: {g.listing_agent_name || `#${g.listing_agent_id}`}
                </Typography>
                <Stack spacing={1}>
                  {g.claimants.map((cl) => (
                    <Stack key={cl.claim_id} direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap
                      sx={{ p: 1, borderRadius: 1.5, background: 'rgba(15,22,41,0.5)' }}>
                      <Typography sx={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>{cl.agent_name || `Агент #${cl.agent_id}`}</Typography>
                      <Chip label={BASIS_LABEL[cl.basis] || cl.basis} size="small" sx={{ height: 18, fontSize: 10, color: '#94A3B8', background: 'rgba(148,163,184,0.12)' }} />
                      {cl.verified && <Chip label="подтверждён" size="small" sx={{ height: 18, fontSize: 10, color: '#22C55E', background: 'rgba(34,197,94,0.12)' }} />}
                      <Typography sx={{ color: '#64748B', fontSize: 11 }}>с {cl.established_at?.slice(0, 10)}</Typography>
                      <Box sx={{ flex: 1 }} />
                      <Button size="small" variant="contained" onClick={() => resolve(cl.claim_id)}
                        sx={{ background: '#22C55E', color: '#06210F', fontWeight: 700, textTransform: 'none', minWidth: 0, '&:hover': { background: '#16A34A' } }}>Признать победителем</Button>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
    </Box>
  );
}

export default function ClaimsView() {
  const me = getCurrentAgent();
  const isArbiter = me?.role === 'super_admin' || me?.role === 'listing_manager';
  return (
    <Box>
      <MyClaimsList />
      {isArbiter && <><Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.1)' }} /><DisputesList /></>}
    </Box>
  );
}
