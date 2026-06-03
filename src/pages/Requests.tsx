import { useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Stack, Button, Chip, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import Cases from './Cases';
import { AdSimpleRequestsTab, AdPackagesTab } from './AdRequests';
import { useRequestsData } from '../hooks/useRequestsData';

type View = null | 'lawyers' | 'mortgage' | 'ads' | 'ads-requests' | 'ads-packages' | 'newbuild';

interface CardMeta {
  key: Exclude<View, null>;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  soon?: boolean;
}

// Верхний уровень — отделы.
const SECTIONS: CardMeta[] = [
  { key: 'lawyers', label: 'Юристы', color: '#22C55E', icon: <GavelRoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Проверка документов, договор, задаток, ДКП, сделка. Штатные юристы Welcome 24 сопровождают сделку.' },
  { key: 'mortgage', label: 'Ипотека', color: '#8B5CF6', icon: <AccountBalanceRoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Подбор и одобрение ипотеки, страхование. Ипотечные брокеры Welcome 24 ведут заявку до выдачи.' },
  { key: 'ads', label: 'Реклама объектов', color: '#C9A84C', icon: <CampaignRoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Квоты, подключение к Авито / Циан / ДомКлик, работа с ошибками в объявлениях и сбор пакетов размещения.' },
  { key: 'newbuild', label: 'Новостройки', color: '#64748B', soon: true, icon: <ApartmentRoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Фиксация клиента у застройщика, уникализация лида, взаиморасчёты по ЖК. Раздел в разработке.' },
];

// Внутри «Рекламы» — два направления.
const AD_SECTIONS: CardMeta[] = [
  { key: 'ads-requests', label: 'Заявки в отдел рекламы', color: '#C9A84C', icon: <ReceiptLongRoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Покупка разовой квоты, подключение к площадкам, работа с ошибками в объектах. Отдел берёт в работу.' },
  { key: 'ads-packages', label: 'Сбор пакета', color: '#F59E0B', icon: <Inventory2RoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Подай заявку в общий пакет размещения на площадку — количество по категориям, сумма считается автоматически.' },
];

export default function Requests({ initialTab = 0 }: { initialTab?: number }) {
  // Deep-link из пушей: /ad-requests → заявки рекламы, /ad-packages → сбор пакета.
  const initialView: View = initialTab === 1 ? 'ads-requests' : initialTab === 2 ? 'ads-packages' : null;
  const [view, setView] = useState<View>(initialView);

  // Непрочитанные по отделам — из общего singleton-поллера (без своего таймера).
  const { cases, adRequests } = useRequestsData();
  const badges = useMemo<Record<string, number>>(() => {
    const lawyers = cases.filter(c => (c.unread || 0) > 0 && (c.tasks || []).some(t => t.track === 'legal')).length;
    const mortgage = cases.filter(c => (c.unread || 0) > 0 && (c.tasks || []).some(t => t.track === 'mortgage')).length;
    const ads = adRequests.filter(r => (r.unread || 0) > 0).length;
    return { lawyers, mortgage, ads, 'ads-requests': ads };
  }, [cases, adRequests]);

  const back = () => {
    if (view === 'ads-requests' || view === 'ads-packages') setView('ads');
    else setView(null);
  };

  // Посадочная сетка карточек.
  if (view === null || view === 'ads') {
    const cards = view === null ? SECTIONS : AD_SECTIONS;
    return (
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {view === 'ads' && (
            <Button onClick={back} startIcon={<ArrowBackRoundedIcon />} sx={{ color: '#94A3B8', textTransform: 'none' }}>Назад</Button>
          )}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 1 }}>
              {view === 'ads' ? <CampaignRoundedIcon sx={{ color: '#C9A84C' }} /> : <AssignmentRoundedIcon sx={{ color: '#C9A84C' }} />}
              {view === 'ads' ? 'Реклама объектов' : 'Заявки'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              {view === 'ads' ? 'Заявки в отдел рекламы и сбор пакетов размещения' : 'Выберите отдел — заявка попадёт нужным специалистам'}
            </Typography>
          </Box>
        </Box>
        <HubGrid cards={cards} onPick={setView} badges={badges} />
      </Box>
    );
  }

  // Разделы (drill-in).
  return (
    <Box>
      <Button onClick={back} startIcon={<ArrowBackRoundedIcon />} sx={{ color: '#94A3B8', textTransform: 'none', mb: 1 }}>Назад</Button>
      {view === 'lawyers' && <Cases track="legal" />}
      {view === 'mortgage' && <Cases track="mortgage" />}
      {view === 'ads-requests' && <AdSimpleRequestsTab />}
      {view === 'ads-packages' && <AdPackagesTab />}
      {view === 'newbuild' && <NewbuildStub />}
    </Box>
  );
}

function HubGrid({ cards, onPick, badges = {} }: { cards: CardMeta[]; onPick: (v: View) => void; badges?: Record<string, number> }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
      {cards.map((c, i) => {
        const badge = badges[c.key] || 0;
        return (
        <motion.div key={c.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <Card
            onClick={() => onPick(c.key)}
            sx={{
              cursor: 'pointer', height: '100%', position: 'relative',
              transition: 'all 0.2s', border: badge > 0 ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(201,168,76,0.1)',
              opacity: c.soon ? 0.75 : 1,
              '&:hover': { borderColor: alpha(c.color, 0.4), transform: 'translateY(-4px)' },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {c.soon && <Chip label="В разработке" size="small" sx={{ position: 'absolute', top: 14, right: 14, height: 22, fontSize: 11, fontWeight: 700, background: 'rgba(148,163,184,0.15)', color: '#94A3B8' }} />}
              {badge > 0 && <Box sx={{ position: 'absolute', top: 12, right: 12, minWidth: 24, height: 24, px: 0.6, borderRadius: 12, background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>{badge}</Box>}
              <Box sx={{
                width: 56, height: 56, borderRadius: 3, mb: 2,
                background: alpha(c.color, 0.15), border: `1px solid ${alpha(c.color, 0.3)}`, color: c.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {c.icon}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9', mb: 0.5 }}>{c.label}</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', lineHeight: 1.5 }}>{c.description}</Typography>
            </CardContent>
          </Card>
        </motion.div>
        );
      })}
    </Box>
  );
}

function NewbuildStub() {
  return (
    <Card sx={{ border: '1px solid rgba(201,168,76,0.1)' }}>
      <CardContent sx={{ py: 8, textAlign: 'center' }}>
        <Box sx={{ width: 72, height: 72, borderRadius: 4, mx: 'auto', mb: 2, background: 'rgba(100,116,139,0.12)', border: '1px solid rgba(100,116,139,0.25)', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ConstructionRoundedIcon sx={{ fontSize: 38 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>Новостройки — раздел в разработке</Typography>
        <Typography variant="body2" sx={{ color: '#64748B', maxWidth: 480, mx: 'auto', mt: 1 }}>
          Здесь появятся: фиксация клиента у застройщика, уникализация лида по ЖК, воронка от брони до выплаты комиссии и взаиморасчёты. Скоро.
        </Typography>
      </CardContent>
    </Card>
  );
}
