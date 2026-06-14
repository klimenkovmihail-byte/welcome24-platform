// CRM — зонтичный раздел операционной инфраструктуры MLS (скрыт, super_admin).
// Хаб с ПЛИТКАМИ модулей: вход в CRM → плитки (Объекты живой + Лиды/Заявки/Сделки/Клиенты
// каркас «скоро» по дорожной карте mls-fable-review §2) → клик по плитке → модуль.
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Chip, Stack, Card, CardContent, Grid, Button } from '@mui/material';
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
import ObjectsView from '../components/crm/ObjectsView';
import RequestsView from '../components/crm/RequestsView';
import OwnerChatsView from '../components/crm/OwnerChatsView';
import ServicesAdminView from '../components/crm/ServicesAdminView';
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
  { key: 'leads', label: 'Лиды', icon: <CampaignRoundedIcon />, desc: 'Обращения с площадок (Авито/ЦИАН): AI-квалификация в чатах 24/7 и мгновенный пуш агенту объекта с SLA.', phase: 'Фаза 2' },
  { key: 'requests', label: 'Заявки покупателей', icon: <ManageSearchRoundedIcon />, ready: true, desc: 'Заявки-спрос с критериями (+ AI-разбор текста) и мэтчинг: подбор объектов под заявку и покупателей под объект.' },
  { key: 'chats', label: 'Чаты собственников', icon: <ChatRoundedIcon />, ready: true, desc: 'Инбокс переписок с собственниками по объектам: непрочитанные сверху, счётчик, переход в чат — не открывая каждую карточку.' },
  { key: 'services', label: 'Услуги (маркетплейс)', icon: <StorefrontRoundedIcon />, ready: true, desc: 'Очередь заказов услуг от клиентов (взять/статус) + каталог с CRUD и рейтингом партнёров.' },
  { key: 'deals', label: 'Сделки (co-broking)', icon: <HandshakeRoundedIcon />, desc: 'Совместные сделки с защищённым делёжом комиссии, межгородские рефералы — внутренняя биржа спроса.', phase: 'Фаза 4–5' },
  { key: 'clients', label: 'Клиенты', icon: <GroupsRoundedIcon />, desc: 'Кабинет клиента (продавец/покупатель): этапы сделки, чат, отчёт собственнику + маркетплейс услуг.', phase: 'Фаза 4.5' },
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

export default function CRM() {
  const deepChat = new URLSearchParams(window.location.search).get('chat'); // deep-link из уведомления
  const [active, setActive] = useState<string | null>(deepChat ? 'chats' : null); // null = хаб (плитки)
  const mod = MODULES.find(m => m.key === active) || null;

  const countQ = useQuery({ queryKey: ['mls-count'], queryFn: () => listMlsProperties({ limit: 1 }), staleTime: 300_000 });
  const objectsCount = countQ.data?.total;
  const chatsQ = useQuery({ queryKey: ['mls-client-chats'], queryFn: getClientChats, staleTime: 60_000, refetchInterval: 30_000 });
  const chatsUnread = (chatsQ.data?.items || []).reduce((s, r) => s + (r.unread || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>CRM</Typography>
        <Chip icon={<VisibilityOffRoundedIcon sx={{ fontSize: 14 }} />} label="Скрытый раздел (только вы)" size="small"
          sx={{ height: 22, fontSize: 11, fontWeight: 600, color: GOLD, background: `${GOLD}1A`, border: `1px solid ${GOLD}33`, '& .MuiChip-icon': { color: GOLD } }} />
      </Box>
      <Typography sx={{ color: '#64748B', fontSize: 13, mb: 2.5 }}>Операционная инфраструктура MLS</Typography>

      {!mod ? (
        // ── Хаб: плитки модулей ──
        <Grid container spacing={2}>
          {MODULES.map(m => (
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
          {mod.key === 'objects' ? <ObjectsView /> : mod.key === 'requests' ? <RequestsView /> : mod.key === 'chats' ? <OwnerChatsView initialChatId={deepChat ? Number(deepChat) : null} /> : mod.key === 'services' ? <ServicesAdminView /> : <SoonPanel m={mod} />}
        </>
      )}
    </Box>
  );
}
