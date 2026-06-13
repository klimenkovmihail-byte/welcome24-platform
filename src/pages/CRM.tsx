// CRM — зонтичный раздел операционной инфраструктуры MLS (скрыт, super_admin).
// Под-навигация модулей: Объекты (живой) + Лиды/Заявки/Сделки/Клиенты (каркас «скоро»
// по дорожной карте mls-fable-review §2). Гейт раздела — в isPortalPathAllowed (/crm).
import { useState } from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import ObjectsView from '../components/crm/ObjectsView';

const GOLD = '#C9A84C';

interface Module {
  key: string;
  label: string;
  icon: React.ReactNode;
  ready?: boolean;
  desc: string;     // что это / что будет
  phase?: string;   // ориентир по дорожной карте
}

const MODULES: Module[] = [
  { key: 'objects', label: 'Объекты', icon: <ApartmentRoundedIcon />, ready: true, desc: 'База объектов агентства: витрина, фильтры, карточка с фото и характеристиками.' },
  { key: 'leads', label: 'Лиды', icon: <CampaignRoundedIcon />, desc: 'Обращения с площадок (Авито/ЦИАН): AI-квалификация в чатах 24/7 и мгновенный пуш агенту объекта с SLA. Скорость на лиде — самый дешёвый рубль.', phase: 'Фаза 2' },
  { key: 'requests', label: 'Заявки покупателей', icon: <ManageSearchRoundedIcon />, desc: 'Заявки-покупатели с критериями (из лидов + вручную) и AI-мэтчинг под объекты коллег: «на твой объект 3 покупателя».', phase: 'Фаза 4' },
  { key: 'deals', label: 'Сделки (co-broking)', icon: <HandshakeRoundedIcon />, desc: 'Совместные сделки с защищённым платформой делёжом комиссии (ex-ante доля), межгородские рефералы — внутренняя биржа спроса.', phase: 'Фаза 4–5' },
  { key: 'clients', label: 'Клиенты', icon: <GroupsRoundedIcon />, desc: 'Кабинет клиента (продавец/покупатель): этапы сделки, чат, отчёт собственнику + маркетплейс доп. услуг с долей агента.', phase: 'Фаза 4.5' },
];

function SoonPanel({ m }: { m: Module }) {
  return (
    <Box sx={{ py: 8, px: 3, textAlign: 'center', maxWidth: 560, mx: 'auto' }}>
      <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '50%', background: `${GOLD}14`, color: GOLD, mb: 2 }}>
        <ConstructionRoundedIcon sx={{ fontSize: 36 }} />
      </Box>
      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{m.label}</Typography>
        <Chip label="в разработке" size="small" sx={{ height: 20, fontSize: 11, fontWeight: 700, color: GOLD, background: `${GOLD}1A`, border: `1px solid ${GOLD}33` }} />
        {m.phase && <Chip label={m.phase} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 600, color: '#94A3B8', background: 'rgba(148,163,184,0.12)' }} />}
      </Stack>
      <Typography sx={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6 }}>{m.desc}</Typography>
    </Box>
  );
}

export default function CRM() {
  const [active, setActive] = useState('objects');
  const mod = MODULES.find(m => m.key === active) || MODULES[0];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>CRM</Typography>
        <Chip icon={<VisibilityOffRoundedIcon sx={{ fontSize: 14 }} />} label="Скрытый раздел (только вы)" size="small"
          sx={{ height: 22, fontSize: 11, fontWeight: 600, color: GOLD, background: `${GOLD}1A`, border: `1px solid ${GOLD}33`, '& .MuiChip-icon': { color: GOLD } }} />
      </Box>
      <Typography sx={{ color: '#64748B', fontSize: 13, mb: 2 }}>Операционная инфраструктура MLS</Typography>

      {/* Под-навигация модулей */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 2.5, borderBottom: '1px solid rgba(201,168,76,0.12)', overflowX: 'auto', '&::-webkit-scrollbar': { height: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(201,168,76,0.25)', borderRadius: 2 } }}>
        {MODULES.map(m => {
          const on = m.key === active;
          return (
            <Box key={m.key} onClick={() => setActive(m.key)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, px: 1.75, py: 1.25, cursor: 'pointer',
                whiteSpace: 'nowrap', borderBottom: on ? `2px solid ${GOLD}` : '2px solid transparent',
                color: on ? GOLD : '#94A3B8', fontWeight: on ? 700 : 500, fontSize: 14,
                transition: 'color .2s', '&:hover': { color: on ? GOLD : '#E2C97E' },
                '& svg': { fontSize: 18 },
              }}>
              {m.icon}
              {m.label}
              {!m.ready && <Box component="span" sx={{ fontSize: 9, fontWeight: 700, color: '#64748B', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 1, px: 0.5, py: '1px' }}>скоро</Box>}
            </Box>
          );
        })}
      </Stack>

      {mod.ready ? <ObjectsView /> : <SoonPanel m={mod} />}
    </Box>
  );
}
