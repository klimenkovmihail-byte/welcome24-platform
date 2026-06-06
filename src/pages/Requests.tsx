import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import { AdSimpleRequestsTab, AdPackagesTab, AdActivePackages } from './AdRequests';
import { useRequestsData } from '../hooks/useRequestsData';
import { STATUS_RU, type CaseItem } from '../api/cases';
import { AD_STATUS_RU, type AdRequest } from '../api/adRequests';

// Относительное время для списка обращений.
function fmtWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (!d) return '';
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} дн назад`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const STATUS_COLOR: Record<string, string> = {
  new: '#94A3B8', consultation: '#94A3B8',
  in_progress: '#4361EE', approval: '#4361EE', contract: '#4361EE', deposit: '#4361EE', dkp: '#4361EE', deal: '#4361EE', check: '#4361EE',
  approved: '#22C55E', done: '#22C55E', issued: '#22C55E', act: '#22C55E',
  cancelled: '#EF4444', rejected: '#EF4444',
};
const trackName = (t: string) => t === 'legal' ? 'Юрист' : t === 'mortgage' ? 'Ипотека' : t;

type View = null | 'lawyers' | 'mortgage' | 'ads' | 'ads-requests' | 'ads-packages' | 'ads-connect' | 'ads-active' | 'newbuild';
type AdPreset = 'quota' | 'fix';

interface CardMeta {
  key: string;
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

// Внутри «Рекламы» — плитки по типам заявок (разделено: реклама объектов vs прикрепление).
const AD_SECTIONS: CardMeta[] = [
  { key: 'go-quota', label: 'Разовое размещение объекта', color: '#C9A84C', icon: <ReceiptLongRoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Заказ и оплата размещения конкретного объекта на площадке.' },
  { key: 'go-from-package', label: 'Реклама объекта из пакета', color: '#F59E0B', icon: <Inventory2RoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Списать квоту из действующего пакета на объект — бесплатно (в рамках купленного пакета).' },
  { key: 'go-fix', label: 'Ошибка при выгрузке', color: '#EF4444', icon: <ConstructionRoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Объект не выгрузился или ошибка в объявлении — отдел разберётся.' },
  { key: 'go-active', label: 'Действующий пакет', color: '#22C55E', icon: <Inventory2RoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Сколько квот куплено, списано и осталось по площадкам, и до какого числа действует пакет.' },
  { key: 'go-packages', label: 'Сбор пакета', color: '#F59E0B', icon: <Inventory2RoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Подай заявку в общий пакет размещения — количество по категориям, сумма считается автоматически.' },
  { key: 'go-connect', label: 'Прикрепление к площадкам', color: '#4361EE', icon: <CampaignRoundedIcon sx={{ fontSize: 32 }} />,
    description: 'Подключение твоих объектов к Авито / ЦИАН / ДомКлик.' },
];

export default function Requests({ initialTab = 0 }: { initialTab?: number }) {
  // Deep-link из пушей: /ad-requests → заявки рекламы, /ad-packages → сбор пакета.
  const initialView: View = initialTab === 1 ? 'ads-requests' : initialTab === 2 ? 'ads-packages' : null;
  const [view, setView] = useState<View>(initialView);
  // Какую заявку авто-открыть после перехода из «Мои обращения».
  const [openTarget, setOpenTarget] = useState<{ kind: 'case' | 'ad'; id: number } | null>(null);
  // Пресет типа для авто-открытия окна новой заявки (клик по плитке).
  const [adPreset, setAdPreset] = useState<AdPreset | null>(null);
  const [adFromPackage, setAdFromPackage] = useState(false);

  // Клик по плитке внутри «Рекламы».
  const pickAd = (key: string) => {
    setOpenTarget(null); setAdPreset(null); setAdFromPackage(false);
    if (key === 'go-quota') { setAdPreset('quota'); setView('ads-requests'); }
    else if (key === 'go-fix') { setAdPreset('fix'); setView('ads-requests'); }
    else if (key === 'go-from-package') { setAdFromPackage(true); setView('ads-requests'); }
    else if (key === 'go-packages') setView('ads-packages');
    else if (key === 'go-connect') setView('ads-connect');
    else if (key === 'go-active') setView('ads-active');
  };

  // Сброс по смене location.key: клик «Заявки» → обзор карточек (#5).
  // Deep-link из бота/пуша/колокола: /ad-requests?open=<id> → открыть саму заявку.
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openId = Number(params.get('open'));
    const track = params.get('track'); // legal/mortgage → заявка юрист/ипотека; без него → отдел рекламы
    setAdPreset(null); setAdFromPackage(false);
    if (openId && (track === 'legal' || track === 'mortgage')) {
      setOpenTarget({ kind: 'case', id: openId }); setView(track === 'mortgage' ? 'mortgage' : 'lawyers');
    } else if (openId) {
      setOpenTarget({ kind: 'ad', id: openId }); setView('ads-requests');
    } else { setOpenTarget(null); setView(initialView); }
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const openSection = (v: View) => { setOpenTarget(null); setAdPreset(null); setAdFromPackage(false); setView(v); };
  const openItem = (v: View, kind: 'case' | 'ad', id: number) => { setAdPreset(null); setAdFromPackage(false); setOpenTarget({ kind, id }); setView(v); };

  // Непрочитанные по отделам — из общего singleton-поллера (без своего таймера).
  const { cases, adRequests } = useRequestsData();
  const badges = useMemo<Record<string, number>>(() => {
    const lawyers = cases.filter(c => (c.unread || 0) > 0 && (c.tasks || []).some(t => t.track === 'legal')).length;
    const mortgage = cases.filter(c => (c.unread || 0) > 0 && (c.tasks || []).some(t => t.track === 'mortgage')).length;
    const ads = adRequests.filter(r => (r.unread || 0) > 0).length;
    return { lawyers, mortgage, ads, 'ads-requests': ads };
  }, [cases, adRequests]);

  const back = () => {
    setOpenTarget(null); setAdPreset(null); setAdFromPackage(false);
    if (view === 'ads-requests' || view === 'ads-packages' || view === 'ads-connect' || view === 'ads-active') setView('ads');
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
        {/* Отделы (создать обращение) — наверху */}
        <HubGrid cards={cards} onPick={view === 'ads' ? pickAd : (k) => openSection(k as View)} badges={badges} />
        {/* Активные обращения — под отделами */}
        {view === null && (
          <Box sx={{ mt: 4 }}>
            <MyRequests cases={cases} adRequests={adRequests} onOpen={openItem} />
          </Box>
        )}
      </Box>
    );
  }

  // Разделы (drill-in).
  return (
    <Box>
      <Button onClick={back} startIcon={<ArrowBackRoundedIcon />} sx={{ color: '#94A3B8', textTransform: 'none', mb: 1 }}>Назад</Button>
      {view === 'lawyers' && <Cases track="legal" initialOpenId={openTarget?.kind === 'case' ? openTarget.id : undefined} />}
      {view === 'mortgage' && <Cases track="mortgage" initialOpenId={openTarget?.kind === 'case' ? openTarget.id : undefined} />}
      {view === 'ads-requests' && <AdSimpleRequestsTab key={`adreq-${adPreset ?? (adFromPackage ? 'pkg' : 'list')}`} autoCreateKind={adPreset ?? undefined} autoFromPackage={adFromPackage} initialOpenId={openTarget?.kind === 'ad' ? openTarget.id : undefined} />}
      {view === 'ads-connect' && <AdSimpleRequestsTab kinds={['connect']} createKinds={['connect']} initialOpenId={openTarget?.kind === 'ad' ? openTarget.id : undefined} />}
      {view === 'ads-active' && <AdActivePackages />}
      {view === 'ads-packages' && <AdPackagesTab />}
      {view === 'newbuild' && <NewbuildStub />}
    </Box>
  );
}

function HubGrid({ cards, onPick, badges = {} }: { cards: CardMeta[]; onPick: (key: string) => void; badges?: Record<string, number> }) {
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

// Единый список «Мои обращения» — все дорожки (юрист/ипотека/реклама) одним списком
// со статусом и непрочитанными. Клик ведёт в нужный раздел.
function MyRequests({ cases, adRequests, onOpen }: { cases: CaseItem[]; adRequests: AdRequest[]; onOpen: (v: View, kind: 'case' | 'ad', id: number) => void }) {
  const rows = [
    // Только активные обращения — завершённые/закрытые не засоряют список.
    ...cases.filter(c => c.status !== 'closed').map(c => ({
      key: 'c' + c.id, id: c.id, kind: 'case' as const, updated: c.updated_at, unread: c.unread || 0,
      title: c.client_name || 'Заявка', sub: c.object_address || c.city || '',
      chips: (c.tasks || []).map(t => ({ label: `${trackName(t.track)}: ${STATUS_RU[t.status] || t.status}`, color: STATUS_COLOR[t.status] || '#94A3B8' })),
      view: ((c.tasks || []).some(t => t.track === 'legal') ? 'lawyers' : 'mortgage') as View,
    })),
    ...adRequests.filter(a => a.status !== 'done' && a.status !== 'cancelled').map(a => ({
      key: 'a' + a.id, id: a.id, kind: 'ad' as const, updated: a.updated_at, unread: a.unread || 0,
      title: a.kind_label || 'Заявка в отдел рекламы', sub: [a.object_ref, a.region].filter(Boolean).join(' · '),
      chips: [{ label: `Реклама: ${AD_STATUS_RU[a.status] || a.status}`, color: STATUS_COLOR[a.status] || '#94A3B8' }],
      view: (a.kind === 'connect' ? 'ads-connect' : 'ads-requests') as View,
    })),
  ].sort((x, y) => (y.updated || '').localeCompare(x.updated || ''));

  if (rows.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, mb: 1.5 }}>Активные обращения ({rows.length})</Typography>
      <Stack spacing={1.2}>
        {rows.map(r => (
          <Card key={r.key} onClick={() => onOpen(r.view, r.kind, r.id)} sx={{
            cursor: 'pointer', border: r.unread > 0 ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(201,168,76,0.1)',
            transition: 'all .2s', '&:hover': { borderColor: 'rgba(201,168,76,0.4)', transform: 'translateY(-2px)' },
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ flexShrink: 0, width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: r.kind === 'ad' ? 'rgba(201,168,76,0.12)' : 'rgba(67,97,238,0.12)', color: r.kind === 'ad' ? '#C9A84C' : '#4361EE' }}>
                {r.kind === 'ad' ? <CampaignRoundedIcon /> : <GavelRoundedIcon />}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</Typography>
                {r.sub && <Typography variant="caption" sx={{ color: '#64748B', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</Typography>}
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {r.chips.map((ch, i) => (
                    <Chip key={i} label={ch.label} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, background: `${ch.color}22`, color: ch.color }} />
                  ))}
                </Box>
              </Box>
              <Box sx={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                {r.unread > 0 && <Box sx={{ minWidth: 22, height: 22, px: 0.6, borderRadius: 11, background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.unread}</Box>}
                <Typography variant="caption" sx={{ color: '#475569', whiteSpace: 'nowrap' }}>{fmtWhen(r.updated)}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
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
