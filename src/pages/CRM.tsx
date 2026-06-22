// CRM — зонтичный раздел операционной инфраструктуры MLS (скрыт, super_admin).
// Хаб с ПЛИТКАМИ модулей: вход в CRM → плитки (Объекты живой + Лиды/Заявки/Сделки/Клиенты
// каркас «скоро» по дорожной карте mls-fable-review §2) → клик по плитке → модуль.
import { useState, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Chip, Stack, Card, CardContent, Grid, Button,
  Dialog, DialogContent, IconButton, Autocomplete, TextField, Divider, CircularProgress,
} from '@mui/material';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { getCurrentAgent } from '../auth/auth';
import { agentsApi } from '../api/agents';
import { getMlsWhitelist, updateMlsWhitelist } from '../api/mls';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import ObjectsView from '../components/crm/ObjectsView';
import RequestsView from '../components/crm/RequestsView';
import OwnerChatsView from '../components/crm/OwnerChatsView';
import ServicesAdminView from '../components/crm/ServicesAdminView';
import LeadsView from '../components/crm/LeadsView';
import ClaimsView from '../components/crm/ClaimsView';
import DealsView from '../components/crm/DealsView';
import ClientsView from '../components/crm/ClientsView';
import { listMlsProperties, getClientChats } from '../api/mls';

const GOLD = '#C9A84C';

interface Module {
  key: string;
  label: string;
  icon: ReactNode;
  ready?: boolean;
  desc: string;
  phase?: string;
}

const MODULES: Module[] = [
  { key: 'objects', label: 'Объекты', icon: <ApartmentRoundedIcon />, ready: true, desc: 'База объектов агентства: витрина, фильтры, карточка с фото, адресом и картой.' },
  { key: 'leads', label: 'Лиды', icon: <CampaignRoundedIcon />, ready: true, desc: 'Обращения покупателей: очередь + speed-to-lead агенту + SLA + квалификация и конвертация в заявку. Площадки/АТС — позже.' },
  { key: 'requests', label: 'Заявки покупателей', icon: <ManageSearchRoundedIcon />, ready: true, desc: 'Заявки-спрос с критериями (+ AI-разбор текста) и мэтчинг: подбор объектов под заявку и покупателей под объект.' },
  { key: 'chats', label: 'Чаты собственников', icon: <ChatRoundedIcon />, ready: true, desc: 'Инбокс переписок с собственниками по объектам: непрочитанные сверху, счётчик, переход в чат — не открывая каждую карточку.' },
  { key: 'services', label: 'Услуги (маркетплейс)', icon: <StorefrontRoundedIcon />, ready: true, desc: 'Очередь заказов услуг от клиентов (взять/статус) + каталог с CRUD и рейтингом партнёров.' },
  { key: 'claims', label: 'Закрепления (procuring)', icon: <GavelRoundedIcon />, ready: true, desc: 'Procuring cause: мои закрепления покупателей + очередь споров о закреплении для арбитра (выбор победителя).' },
  { key: 'deals', label: 'Сделки (co-broking)', icon: <HandshakeRoundedIcon />, ready: true, desc: 'Проведённые сделки по объектам: совместные (co-broking) с раскладкой по агентам, ВКД/доход, статус, отмена группы.' },
  { key: 'clients', label: 'Клиенты', icon: <GroupsRoundedIcon />, ready: true, desc: 'Единая база контактов: собственники, покупатели, лиды — роли, счётчики и связанные объекты/заявки/сделки. (Кабинет клиента — отдельное приложение …/client/.)' },
];

function ModuleTile({ m, count, badge, onOpen }: { m: Module; count?: number; badge?: number; onOpen: () => void }) {
  return (
    <Card onClick={onOpen}
      sx={{
        cursor: 'pointer', height: '100%', opacity: m.ready ? 1 : 0.9,
        transition: 'transform .2s, box-shadow .2s, border-color .2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 14px 36px rgba(0,0,0,0.45)', borderColor: `${GOLD}44` },
      }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'inline-flex', p: 1.25, borderRadius: 2, background: m.ready ? `${GOLD}16` : 'rgba(148,163,184,0.1)', color: m.ready ? GOLD : '#94A3B8', '& svg': { fontSize: 26 } }}>
            {m.icon}
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center">
            {badge != null && badge > 0 && (
              <Chip label={badge} size="small" sx={{ height: 20, minWidth: 22, fontSize: 11, fontWeight: 800, color: '#fff', background: '#EF4444' }} />
            )}
            {m.ready ? (
              <Chip label="Активен" size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.12)' }} />
            ) : (
              <Chip label="скоро" size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: '#64748B', background: 'rgba(148,163,184,0.12)' }} />
            )}
          </Stack>
        </Stack>
        <Typography sx={{ fontWeight: 800, color: '#F1F5F9', fontSize: 17 }}>{m.label}</Typography>
        {m.ready && count != null && (
          <Typography sx={{ color: GOLD, fontWeight: 700, fontSize: 14, mt: 0.25 }}>{count} объектов</Typography>
        )}
        {!m.ready && m.phase && (
          <Typography sx={{ color: '#64748B', fontSize: 12, fontWeight: 600, mt: 0.25 }}>{m.phase}</Typography>
        )}
        <Typography sx={{ color: '#94A3B8', fontSize: 13, mt: 1, lineHeight: 1.5 }}>{m.desc}</Typography>
      </CardContent>
    </Card>
  );
}

function SoonPanel({ m }: { m: Module }) {
  return (
    <Box sx={{ py: 7, px: 3, textAlign: 'center', maxWidth: 560, mx: 'auto' }}>
      <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '50%', background: `${GOLD}14`, color: GOLD, mb: 2 }}>
        <ConstructionRoundedIcon sx={{ fontSize: 36 }} />
      </Box>
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{m.label}</Typography>
        <Chip label="в разработке" size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: GOLD, background: `${GOLD}1A`, border: `1px solid ${GOLD}33` }} />
        {m.phase && <Chip label={m.phase} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 600, color: '#94A3B8', background: 'rgba(148,163,184,0.12)' }} />}
      </Stack>
      <Typography sx={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6 }}>{m.desc}</Typography>
    </Box>
  );
}

const fieldSx = { '& .MuiOutlinedInput-root': { color: '#F1F5F9', '& fieldset': { borderColor: `${GOLD}33` } }, '& .MuiInputLabel-root': { color: '#94A3B8' } };

// Управление доступом к CRM (super_admin): кто из агентов видит раздел (settings.mls.whitelist).
function WhitelistDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['mls-whitelist'], queryFn: getMlsWhitelist, staleTime: 30_000 });
  const agentsQ = useQuery({ queryKey: ['agents-active-list'], queryFn: () => agentsApi.list({ role: 'agent', status: 'active' }), staleTime: 300_000 });
  const current = data?.items || [];
  const options = useMemo(() => {
    const have = new Set(data?.ids || []);
    return (agentsQ.data || []).filter((a) => !have.has(a.id)).map((a) => ({ id: a.id, name: a.name }));
  }, [agentsQ.data, data]);
  const [picked, setPicked] = useState<{ id: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const add = async () => { if (!picked) return; setBusy(true); try { await updateMlsWhitelist({ add: picked.id }); setPicked(null); qc.invalidateQueries({ queryKey: ['mls-whitelist'] }); } finally { setBusy(false); } };
  const remove = async (id: number) => { await updateMlsWhitelist({ remove: id }); qc.invalidateQueries({ queryKey: ['mls-whitelist'] }); };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { background: 'linear-gradient(135deg,#0F1629,#0A0E1A)', border: `1px solid ${GOLD}33`, borderRadius: 3 } } }}>
      <DialogContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <LockOpenRoundedIcon sx={{ color: GOLD }} />
          <Typography sx={{ color: GOLD, fontWeight: 800, fontSize: 18, flex: 1 }}>Доступ к CRM</Typography>
          <IconButton onClick={onClose} sx={{ color: '#94A3B8' }}><CloseRoundedIcon /></IconButton>
        </Stack>
        <Typography sx={{ color: '#94A3B8', fontSize: 13, mb: 2 }}>Агенты из списка видят раздел CRM (MLS) помимо вас. Всем остальным он скрыт.</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Autocomplete size="small" sx={{ flex: 1 }} options={options} getOptionLabel={(o) => o.name} value={picked} onChange={(_, v) => setPicked(v)} loading={agentsQ.isLoading} isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Добавить агента" sx={fieldSx} />} />
          <Button variant="contained" disabled={!picked || busy} onClick={add} sx={{ background: GOLD, color: '#06210F', fontWeight: 700, textTransform: 'none', '&.Mui-disabled': { background: '#475569', color: '#1E293B' } }}>Дать доступ</Button>
        </Stack>
        <Divider sx={{ my: 1, borderColor: 'rgba(201,168,76,0.1)' }} />
        {isLoading ? <CircularProgress sx={{ color: GOLD }} size={24} />
          : current.length === 0 ? <Typography sx={{ color: '#64748B', fontSize: 13 }}>Пока доступ только у вас (super_admin).</Typography>
          : (
            <Stack spacing={1}>
              {current.map((a) => (
                <Stack key={a.id} direction="row" alignItems="center" spacing={1} sx={{ p: 1, borderRadius: 1.5, background: `${GOLD}0A` }}>
                  <Typography sx={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600, flex: 1 }}>{a.name}</Typography>
                  {a.city && <Typography sx={{ color: '#64748B', fontSize: 12 }}>{a.city}</Typography>}
                  <Button size="small" onClick={() => remove(a.id)} sx={{ color: '#EF4444', textTransform: 'none', minWidth: 0 }}>Убрать</Button>
                </Stack>
              ))}
            </Stack>
          )}
      </DialogContent>
    </Dialog>
  );
}

export default function CRM() {
  const params = new URLSearchParams(window.location.search); // deep-link из уведомлений
  const deepChat = params.get('chat');
  const [active, setActive] = useState<string | null>(deepChat ? 'chats' : params.get('leads') ? 'leads' : null); // null = хаб (плитки)
  const mod = MODULES.find(m => m.key === active) || null;

  const countQ = useQuery({ queryKey: ['mls-count'], queryFn: () => listMlsProperties({ limit: 1 }), staleTime: 300_000 });
  const objectsCount = countQ.data?.total;
  const chatsQ = useQuery({ queryKey: ['mls-client-chats'], queryFn: getClientChats, staleTime: 60_000, refetchInterval: 30_000 });
  const chatsUnread = (chatsQ.data?.items || []).reduce((s, r) => s + (r.unread || 0), 0);

  const me = getCurrentAgent();
  const isStaff = me?.role === 'super_admin' || me?.role === 'admin' || me?.role === 'manager';
  const isSuper = me?.role === 'super_admin';
  const [wlOpen, setWlOpen] = useState(false);
  // Помодульная видимость: «Услуги» — координаторский (staff) модуль; рядовому агенту скрываем.
  const modules = MODULES.filter((m) => m.key !== 'services' || isStaff);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>CRM</Typography>
        <Chip icon={<VisibilityOffRoundedIcon sx={{ fontSize: 14 }} />} label="Скрытый раздел" size="small"
          sx={{ height: 22, fontSize: 11, fontWeight: 600, color: GOLD, background: `${GOLD}1A`, border: `1px solid ${GOLD}33`, '& .MuiChip-icon': { color: GOLD } }} />
        <Box sx={{ flex: 1 }} />
        {isSuper && <Button size="small" startIcon={<LockOpenRoundedIcon sx={{ fontSize: 16 }} />} onClick={() => setWlOpen(true)} sx={{ color: GOLD, textTransform: 'none', '&:hover': { background: `${GOLD}11` } }}>Доступ</Button>}
      </Box>
      <Typography sx={{ color: '#64748B', fontSize: 13, mb: 2.5 }}>Операционная инфраструктура MLS</Typography>

      {!mod ? (
        // ── Хаб: плитки модулей ──
        <Grid container spacing={2}>
          {modules.map(m => (
            <Grid key={m.key} size={{ xs: 12, sm: 6, md: 4 }}>
              <ModuleTile m={m} count={m.key === 'objects' ? objectsCount : undefined} badge={m.key === 'chats' ? chatsUnread : undefined} onOpen={() => setActive(m.key)} />
            </Grid>
          ))}
        </Grid>
      ) : (
        // ── Модуль ──
        <>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => setActive(null)} size="small"
              sx={{ color: '#94A3B8', textTransform: 'none', '&:hover': { color: GOLD, background: 'transparent' } }}>
              Все модули
            </Button>
            <Typography sx={{ color: '#475569' }}>/</Typography>
            <Typography sx={{ color: '#F1F5F9', fontWeight: 700 }}>{mod.label}</Typography>
          </Stack>
          {mod.key === 'objects' ? <ObjectsView /> : mod.key === 'requests' ? <RequestsView /> : mod.key === 'chats' ? <OwnerChatsView initialChatId={deepChat ? Number(deepChat) : null} /> : mod.key === 'services' ? <ServicesAdminView /> : mod.key === 'leads' ? <LeadsView /> : mod.key === 'claims' ? <ClaimsView /> : mod.key === 'deals' ? <DealsView /> : mod.key === 'clients' ? <ClientsView /> : <SoonPanel m={mod} />}
        </>
      )}
      {wlOpen && <WhitelistDialog onClose={() => setWlOpen(false)} />}
    </Box>
  );
}
