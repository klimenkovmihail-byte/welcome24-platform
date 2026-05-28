/**
 * AI — инструменты ИИ для риелтора.
 *
 * Главная: сетка карточек. Клик → форма → результат с копированием.
 * Лимит для L1: счётчик "осталось N из 10" сверху.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, TextField, Select, MenuItem, InputLabel,
  FormControl, Chip, Alert, CircularProgress, IconButton, Tooltip,
  Stack, Card, CardContent, alpha,
} from '@mui/material';
import { motion } from 'framer-motion';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import HomeWorkRoundedIcon from '@mui/icons-material/HomeWorkRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import { aiApi, type AiUsage, type AiTool, type ChatSummary, type StoredMessage, type MlmStats } from '../api/ai';

interface ToolMeta {
  key: AiTool;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const TOOLS: ToolMeta[] = [
  {
    key: 'listing',
    label: 'Описание объекта',
    description: 'Продающий текст для Avito / Циан / Telegram / Instagram. Введи параметры — получи готовое объявление за 5 секунд.',
    icon: <HomeWorkRoundedIcon sx={{ fontSize: 32 }} />,
    color: '#C9A84C',
  },
  {
    key: 'social_post',
    label: 'Пост в соцсеть',
    description: 'Пост про объект, акцию, отзыв или совет клиенту. Подгоняем тон под Instagram, Telegram или ВК.',
    icon: <CampaignRoundedIcon sx={{ fontSize: 32 }} />,
    color: '#4361EE',
  },
  {
    key: 'legal_advisor',
    label: 'AI юрист Welcome 24',
    description: 'Задай вопрос по сделкам, договорам, налогам, ДДУ, регистрации прав. Отвечает с опорой на законодательство РФ. Только юридические вопросы по недвижимости.',
    icon: <GavelRoundedIcon sx={{ fontSize: 32 }} />,
    color: '#22C55E',
  },
  {
    key: 'shares_advisor',
    label: 'AI Финансовый навигатор',
    description: 'Поможет разобраться в акциях, пассивном доходе, структуре и росте капитала внутри Welcome 24. Видит твои реальные данные: акции, ВКД, рекрутов, открытые тиры.',
    icon: <DiamondRoundedIcon sx={{ fontSize: 32 }} />,
    color: '#F59E0B',
  },
  {
    key: 'mlm_recruiter',
    label: 'AI-рекрутер MLM',
    description: 'Сгенерирует персональное приглашение в Welcome 24 для конкретного человека — под его мотивацию и канал связи (TG, звонок, встреча).',
    icon: <PersonAddAlt1RoundedIcon sx={{ fontSize: 32 }} />,
    color: '#EC4899',
  },
];

export default function AI() {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [activeTool, setActiveTool] = useState<AiTool | null>(null);

  const reloadUsage = () => aiApi.usage().then(setUsage).catch(() => { /* tolerate */ });
  useEffect(() => { reloadUsage(); }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeRoundedIcon sx={{ color: '#C9A84C' }} /> AI-помощник
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Инструменты на базе ИИ для ускорения работы риелтора
          </Typography>
        </Box>
        {usage && !usage.unlimited && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Chip
              icon={usage.remaining === 0 ? <LockRoundedIcon /> : undefined}
              label={`Осталось ${usage.remaining} из ${usage.limit} сегодня`}
              sx={{
                background: usage.remaining === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(201,168,76,0.10)',
                color: usage.remaining === 0 ? '#EF4444' : '#C9A84C',
                fontWeight: 700,
              }}
            />
            <TierProgress usage={usage} />
          </Box>
        )}
        {usage?.unlimited && (
          <Chip label="Без лимита" sx={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontWeight: 700 }} />
        )}
      </Box>

      {activeTool === null ? (
        <ToolsGrid onPick={setActiveTool} />
      ) : (activeTool === 'legal_advisor' || activeTool === 'shares_advisor') ? (
        <ChatTool tool={activeTool} onBack={() => { setActiveTool(null); reloadUsage(); }} onUsageChange={setUsage} />
      ) : (
        <ToolForm tool={activeTool} onBack={() => { setActiveTool(null); reloadUsage(); }} onUsageChange={setUsage} />
      )}
    </Box>
  );
}

// Прогресс-индикатор: сколько ещё нужно заработать до следующего тира лимита.
function TierProgress({ usage }: { usage: AiUsage }) {
  const fmt = (n: number) => n.toLocaleString('ru-RU');
  if (usage.tier === 'top' || usage.tier === 'unlimited') return null;

  // starter → growth: нужно income ≥ thresholds.incomeGrowth
  // growth → top: нужно vkd ≥ thresholds.vkdTop
  let label = '';
  let progress = 0;          // 0..1
  let goalText = '';

  if (usage.tier === 'starter') {
    const have = usage.ytdIncome || 0;
    const need = usage.thresholds.incomeGrowth;
    progress = Math.min(1, have / need);
    const left = Math.max(0, need - have);
    label = `До 10 запросов/день: ещё ${fmt(left)} ₽ комиссии`;
    goalText = `${fmt(have)} / ${fmt(need)} ₽ комиссии в этом году`;
  } else if (usage.tier === 'growth') {
    const have = usage.ytdVkd || 0;
    const need = usage.thresholds.vkdTop;
    progress = Math.min(1, have / need);
    const left = Math.max(0, need - have);
    label = `До 20 запросов/день: ещё ${fmt(left)} ₽ ВКД`;
    goalText = `${fmt(have)} / ${fmt(need)} ₽ ВКД в этом году (уровень L2)`;
  }

  return (
    <Tooltip title={goalText} arrow>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.2,
        px: 1.5, py: 0.6, borderRadius: 2,
        background: 'rgba(34,197,94,0.06)',
        border: '1px solid rgba(34,197,94,0.18)',
        cursor: 'default',
      }}>
        <Box sx={{ position: 'relative', width: 60, height: 4, borderRadius: 2, background: 'rgba(34,197,94,0.15)', overflow: 'hidden' }}>
          <Box sx={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #22C55E, #4ADE80)',
            transition: 'width 0.4s',
          }} />
        </Box>
        <Typography variant="caption" sx={{ color: '#22C55E', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

function ToolsGrid({ onPick }: { onPick: (t: AiTool) => void }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
      {TOOLS.map((t, i) => (
        <motion.div key={t.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <Card
            onClick={() => onPick(t.key)}
            sx={{
              cursor: 'pointer', height: '100%',
              transition: 'all 0.2s',
              border: '1px solid rgba(201,168,76,0.1)',
              '&:hover': { borderColor: alpha(t.color, 0.4), transform: 'translateY(-4px)' },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: 3, mb: 2,
                background: alpha(t.color, 0.15),
                border: `1px solid ${alpha(t.color, 0.3)}`,
                color: t.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {t.icon}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9', mb: 0.5 }}>{t.label}</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', lineHeight: 1.5 }}>{t.description}</Typography>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </Box>
  );
}

// ---------- Форма + результат ----------

interface FormProps {
  tool: AiTool;
  onBack: () => void;
  onUsageChange: (u: AiUsage) => void;
}

function ToolForm({ tool, onBack, onUsageChange }: FormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (input: Record<string, unknown>) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await aiApi.generate(tool, input);
      setResult(r.text);
      onUsageChange(r.usage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка генерации');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const meta = TOOLS.find(t => t.key === tool)!;

  return (
    <Box>
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ mb: 2, color: '#94A3B8' }}>
        К списку инструментов
      </Button>
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              background: alpha(meta.color, 0.15), color: meta.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {meta.icon}
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{meta.label}</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>{meta.description}</Typography>
            </Box>
          </Box>

          {tool === 'listing' && <ListingForm onSubmit={handleSubmit} loading={loading} />}
          {tool === 'social_post' && <SocialForm onSubmit={handleSubmit} loading={loading} />}
          {tool === 'mlm_recruiter' && <MlmRecruiterForm onSubmit={handleSubmit} loading={loading} />}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, gap: 2, alignItems: 'center' }}>
          <CircularProgress size={28} sx={{ color: '#C9A84C' }} />
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>AI думает…</Typography>
        </Box>
      )}

      {result && !loading && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#C9A84C' }}>Результат</Typography>
              <Tooltip title={copied ? 'Скопировано!' : 'Скопировать'}>
                <IconButton size="small" onClick={copyText} sx={{ color: copied ? '#22C55E' : '#94A3B8' }}>
                  <ContentCopyRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{
              p: 2.5, borderRadius: 2,
              background: 'rgba(15,22,41,0.6)',
              border: '1px solid rgba(201,168,76,0.1)',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: 14,
              lineHeight: 1.7,
              color: '#F1F5F9',
              maxHeight: 500, overflowY: 'auto',
            }}>
              {result}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// ---------- Формы для каждого инструмента ----------

interface SubProps { onSubmit: (input: Record<string, unknown>) => void; loading: boolean }

function ListingForm({ onSubmit, loading }: SubProps) {
  const [data, setData] = useState({
    propertyType: 'квартира',
    rooms: '',
    area: '',
    floor: '',
    totalFloors: '',
    district: '',
    address: '',
    price: '',
    condition: '',
    features: '',
    format: 'avito',
    tone: 'selling',
  });

  const set = (k: keyof typeof data, v: string) => setData(d => ({ ...d, [k]: v }));
  const canSubmit = !!data.propertyType && (!!data.area || !!data.rooms);

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        <FormControl size="small">
          <InputLabel>Тип</InputLabel>
          <Select value={data.propertyType} label="Тип" onChange={e => set('propertyType', e.target.value)}>
            <MenuItem value="квартира">Квартира</MenuItem>
            <MenuItem value="дом">Дом</MenuItem>
            <MenuItem value="апартаменты">Апартаменты</MenuItem>
            <MenuItem value="таунхаус">Таунхаус</MenuItem>
            <MenuItem value="коммерческая">Коммерческая недвижимость</MenuItem>
            <MenuItem value="земельный участок">Земельный участок</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" label="Комнат" value={data.rooms} onChange={e => set('rooms', e.target.value)} placeholder="2" />
        <TextField size="small" label="Площадь, м²" value={data.area} onChange={e => set('area', e.target.value)} placeholder="65" />
        <TextField size="small" label="Цена" value={data.price} onChange={e => set('price', e.target.value)} placeholder="например: 12 500 000 ₽" />
        <TextField size="small" label="Этаж" value={data.floor} onChange={e => set('floor', e.target.value)} placeholder="5" />
        <TextField size="small" label="Этажей в доме" value={data.totalFloors} onChange={e => set('totalFloors', e.target.value)} placeholder="9" />
        <TextField size="small" label="Район / ЖК" value={data.district} onChange={e => set('district', e.target.value)} />
        <TextField size="small" label="Адрес" value={data.address} onChange={e => set('address', e.target.value)} />
      </Box>
      <TextField size="small" label="Состояние" value={data.condition} onChange={e => set('condition', e.target.value)}
        placeholder="например: евроремонт 2024, дизайн-проект, мебель остаётся" />
      <TextField size="small" label="Особенности и фишки" value={data.features}
        onChange={e => set('features', e.target.value)}
        multiline rows={3}
        placeholder="вид из окна, балкон/лоджия, инфраструктура, школы, паркинг, что важно для покупателя" />

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        <FormControl size="small">
          <InputLabel>Площадка</InputLabel>
          <Select value={data.format} label="Площадка" onChange={e => set('format', e.target.value)}>
            <MenuItem value="avito">Avito</MenuItem>
            <MenuItem value="cian">ЦИАН</MenuItem>
            <MenuItem value="telegram">Telegram-канал</MenuItem>
            <MenuItem value="instagram">Instagram</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Тон</InputLabel>
          <Select value={data.tone} label="Тон" onChange={e => set('tone', e.target.value)}>
            <MenuItem value="selling">Продающий</MenuItem>
            <MenuItem value="expert">Экспертный</MenuItem>
            <MenuItem value="emotional">Эмоциональный</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Button variant="contained" size="large" onClick={() => onSubmit(data)} disabled={!canSubmit || loading}
        startIcon={<AutoAwesomeRoundedIcon />}>
        {loading ? 'Генерирую…' : 'Сгенерировать описание'}
      </Button>
    </Stack>
  );
}

function SocialForm({ onSubmit, loading }: SubProps) {
  const [data, setData] = useState({
    topic: 'new_listing',
    content: '',
    platform: 'instagram',
    tone: 'friendly',
  });

  const set = (k: keyof typeof data, v: string) => setData(d => ({ ...d, [k]: v }));
  const canSubmit = !!data.content.trim();

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        <FormControl size="small">
          <InputLabel>Тема</InputLabel>
          <Select value={data.topic} label="Тема" onChange={e => set('topic', e.target.value)}>
            <MenuItem value="new_listing">Новый объект в продаже</MenuItem>
            <MenuItem value="promo">Акция / спецпредложение</MenuItem>
            <MenuItem value="advice">Совет покупателю/продавцу</MenuItem>
            <MenuItem value="review">Отзыв клиента</MenuItem>
            <MenuItem value="market">Новость / аналитика рынка</MenuItem>
            <MenuItem value="personal">Личный пост о себе</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Платформа</InputLabel>
          <Select value={data.platform} label="Платформа" onChange={e => set('platform', e.target.value)}>
            <MenuItem value="instagram">Instagram</MenuItem>
            <MenuItem value="telegram">Telegram</MenuItem>
            <MenuItem value="vk">ВКонтакте</MenuItem>
            <MenuItem value="threads">Threads</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <FormControl size="small">
        <InputLabel>Тон</InputLabel>
        <Select value={data.tone} label="Тон" onChange={e => set('tone', e.target.value)}>
          <MenuItem value="friendly">Дружелюбный</MenuItem>
          <MenuItem value="professional">Профессиональный</MenuItem>
          <MenuItem value="humorous">С юмором</MenuItem>
          <MenuItem value="motivational">Мотивирующий</MenuItem>
        </Select>
      </FormControl>
      <TextField size="small" label="О чём пост (что нужно донести)"
        value={data.content} onChange={e => set('content', e.target.value)}
        multiline rows={4}
        placeholder="Опиши суть. Например: продаётся 2-к. квартира в новом ЖК «Парус», 70м², видовая, всё в шаговой доступности. Хочу подчеркнуть удобство для семьи с детьми." />

      <Button variant="contained" size="large" onClick={() => onSubmit(data)} disabled={!canSubmit || loading}
        startIcon={<AutoAwesomeRoundedIcon />}>
        {loading ? 'Генерирую…' : 'Сгенерировать пост'}
      </Button>
    </Stack>
  );
}

// ============================================================
// Калькулятор пассивного дохода (для AI Финансового навигатора).
// Считает доход с MLM-структуры по таблице из ТЗ Welcome 24.
// Автозаполнение из реальных данных бэка, можно править для what-if.
// ============================================================
const MLM_TABLE = [
  { level: 1, protected: 3.5, growth: 0,   requires: 0,  cap: 100_000 },
  { level: 2, protected: 0.1, growth: 2.8, requires: 5,  cap: 120_000 },
  { level: 3, protected: 0.1, growth: 2.4, requires: 10, cap: 80_000  },
  { level: 4, protected: 0.1, growth: 1.4, requires: 15, cap: 60_000  },
  { level: 5, protected: 0.1, growth: 0.9, requires: 20, cap: 30_000  },
  { level: 6, protected: 0.5, growth: 2.0, requires: 25, cap: 50_000  },
  { level: 7, protected: 0.5, growth: 4.0, requires: 40, cap: 100_000 },
];

function fmtRub(n: number): string {
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}

function PassiveIncomeCalculator() {
  const [stats, setStats] = useState<MlmStats | null>(null);
  const [agentsByLevel, setAgentsByLevel] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [l1FirstDeal, setL1FirstDeal] = useState(0);
  const [avgVkd, setAvgVkd] = useState(300_000);
  const [dealsPerMonth, setDealsPerMonth] = useState(0.5);
  const [loading, setLoading] = useState(true);

  // Автозаполнение при монтировании.
  useEffect(() => {
    aiApi.mlmStats()
      .then(s => {
        setStats(s);
        setAgentsByLevel(s.byLevel);
        setL1FirstDeal(s.l1WithFirstDeal);
        if (s.avgDealVkd > 0) setAvgVkd(s.avgDealVkd);
        if (s.dealsPerMonth > 0) setDealsPerMonth(s.dealsPerMonth);
      })
      .catch(() => { /* tolerate, оставляем дефолты */ })
      .finally(() => setLoading(false));
  }, []);

  // Расчёт.
  const rows = MLM_TABLE.map(t => {
    const agentsCount = agentsByLevel[t.level - 1] || 0;
    const dealsPerYearPerAgent = dealsPerMonth * 12;
    const vkdPerYearPerAgent = avgVkd * dealsPerYearPerAgent;
    const growthUnlocked = l1FirstDeal >= t.requires;
    const effectivePct = t.protected + (growthUnlocked ? t.growth : 0);

    const raw = vkdPerYearPerAgent * agentsCount * (effectivePct / 100);
    const cap = agentsCount * t.cap;
    const capped = Math.min(raw, cap);
    return {
      ...t,
      agentsCount,
      growthUnlocked,
      effectivePct,
      yearlyIncome: capped,
      monthlyIncome: capped / 12,
      cappedBy: raw > cap && cap > 0,
    };
  });

  const totalYearly = rows.reduce((s, r) => s + r.yearlyIncome, 0);
  const totalMonthly = totalYearly / 12;

  const setAgentsAtLevel = (idx: number, val: number) => {
    setAgentsByLevel(prev => {
      const next = [...prev];
      next[idx] = Math.max(0, Math.floor(val) || 0);
      return next;
    });
  };

  const resetFromStats = () => {
    if (!stats) return;
    setAgentsByLevel(stats.byLevel);
    setL1FirstDeal(stats.l1WithFirstDeal);
    if (stats.avgDealVkd > 0) setAvgVkd(stats.avgDealVkd);
    if (stats.dealsPerMonth > 0) setDealsPerMonth(stats.dealsPerMonth);
  };

  return (
    <Box>
      <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1.5, lineHeight: 1.6 }}>
        Введи структуру команды и параметры одного агента — увидишь сколько можно зарабатывать пассивно.
        Поля автозаполнены реальными данными, можно править для сценариев «а что если».
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} sx={{ color: '#A855F7' }} />
        </Box>
      )}

      {/* Параметры агента */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 2 }}>
        <TextField
          label="Средний ВКД сделки, ₽" size="small" type="number"
          value={avgVkd} onChange={e => setAvgVkd(Number(e.target.value) || 0)}
        />
        <TextField
          label="Сделок в месяц на агента" size="small" type="number" inputProps={{ step: 0.1 }}
          value={dealsPerMonth} onChange={e => setDealsPerMonth(Number(e.target.value) || 0)}
        />
        <TextField
          label="L1 с первой сделкой" size="small" type="number"
          value={l1FirstDeal} onChange={e => setL1FirstDeal(Math.max(0, Number(e.target.value) || 0))}
          helperText="открывают растущие %"
        />
      </Box>

      {/* Поля по уровням + расчёт по строкам */}
      <Box sx={{ overflowX: 'auto', mb: 2 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '70px 90px 120px 90px 1fr 1fr',
          gap: 0.5,
          minWidth: 720,
          alignItems: 'center',
        }}>
          {/* Header */}
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>Уровень</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>Агентов</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>Защ. % / Раст. %</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>Итого %</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>В месяц</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>В год</Typography>

          {rows.map(r => (
            <Box key={r.level} sx={{ display: 'contents' }}>
              <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 700, py: 0.7 }}>L{r.level}</Typography>
              <TextField
                size="small" type="number"
                value={r.agentsCount}
                onChange={e => setAgentsAtLevel(r.level - 1, Number(e.target.value))}
                slotProps={{ input: { sx: { fontSize: 13, py: 0.5 } } }}
              />
              <Typography variant="caption" sx={{ color: '#94A3B8', py: 0.7, fontSize: 11 }}>
                {r.protected}% / {r.growth}%{!r.growthUnlocked && r.level > 1 && (
                  <Tooltip title={`Нужно ${r.requires} L1 с первой сделкой, есть ${l1FirstDeal}`}>
                    <span style={{ color: '#EF4444', marginLeft: 4 }}>×</span>
                  </Tooltip>
                )}
              </Typography>
              <Chip
                label={`${r.effectivePct.toFixed(1)}%`}
                size="small"
                sx={{
                  background: r.growthUnlocked || r.level === 1 ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.15)',
                  color: r.growthUnlocked || r.level === 1 ? '#22C55E' : '#94A3B8',
                  fontWeight: 700, fontSize: 11, height: 22,
                  justifySelf: 'start',
                }}
              />
              <Typography variant="body2" sx={{ color: '#F1F5F9', py: 0.7, fontWeight: 600 }}>
                {fmtRub(r.monthlyIncome)}
                {r.cappedBy && (
                  <Tooltip title={`Ограничено cap'ом ${fmtRub(r.cap)} в год с агента`}>
                    <span style={{ color: '#F59E0B', marginLeft: 4, fontSize: 11 }}>cap</span>
                  </Tooltip>
                )}
              </Typography>
              <Typography variant="body2" sx={{ color: '#C9A84C', py: 0.7, fontWeight: 700 }}>
                {fmtRub(r.yearlyIncome)}
              </Typography>
            </Box>
          ))}

          {/* Итого */}
          <Box sx={{ display: 'contents' }}>
            <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 900, py: 1.2, borderTop: '2px solid rgba(201,168,76,0.3)' }}>ИТОГО</Typography>
            <Box sx={{ borderTop: '2px solid rgba(201,168,76,0.3)' }} />
            <Box sx={{ borderTop: '2px solid rgba(201,168,76,0.3)' }} />
            <Box sx={{ borderTop: '2px solid rgba(201,168,76,0.3)' }} />
            <Typography variant="body2" sx={{ color: '#22C55E', fontWeight: 900, py: 1.2, borderTop: '2px solid rgba(201,168,76,0.3)' }}>
              {fmtRub(totalMonthly)}
            </Typography>
            <Typography variant="body2" sx={{ color: '#C9A84C', fontWeight: 900, py: 1.2, borderTop: '2px solid rgba(201,168,76,0.3)' }}>
              {fmtRub(totalYearly)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontSize: 11, fontStyle: 'italic' }}>
          Расчёт носит информационный характер. Это не гарантия дохода.
        </Typography>
        {stats && (
          <Button size="small" onClick={resetFromStats} sx={{ color: '#A855F7', fontSize: 11 }}>
            Сбросить к моим реальным данным
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ============================================================
// AI-рекрутер MLM — one-shot форма
// ============================================================
function MlmRecruiterForm({ onSubmit, loading }: SubProps) {
  const [data, setData] = useState({
    recipientName: '',
    source: '',
    situation: '',
    motivation: 'money',
    channel: 'telegram',
    tone: 'friendly',
    customNotes: '',
  });
  const set = (k: keyof typeof data, v: string) => setData(d => ({ ...d, [k]: v }));
  const canSubmit = !!data.recipientName && !!data.channel;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        <TextField size="small" label="Имя адресата *"
          value={data.recipientName} onChange={e => set('recipientName', e.target.value)}
          placeholder="Антон" />
        <TextField size="small" label="Откуда знакомы"
          value={data.source} onChange={e => set('source', e.target.value)}
          placeholder="бывший коллега / встретились на сделке / порекомендовали" />
      </Box>

      <TextField size="small" label="Текущая ситуация адресата"
        value={data.situation} onChange={e => set('situation', e.target.value)}
        multiline rows={2}
        placeholder="например: работает риелтором в небольшом агентстве 3 года, основной поток через Циан, чувствует что упёрся в потолок" />

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
        <FormControl size="small">
          <InputLabel>Мотивация</InputLabel>
          <Select value={data.motivation} label="Мотивация" onChange={e => set('motivation', e.target.value)}>
            <MenuItem value="money">Деньги / доход</MenuItem>
            <MenuItem value="growth">Развитие / обучение</MenuItem>
            <MenuItem value="independence">Независимость</MenuItem>
            <MenuItem value="team">Команда / среда</MenuItem>
            <MenuItem value="status">Статус / бренд</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Канал *</InputLabel>
          <Select value={data.channel} label="Канал *" onChange={e => set('channel', e.target.value)}>
            <MenuItem value="telegram">Сообщение TG / WhatsApp</MenuItem>
            <MenuItem value="voice">Голосовое сообщение</MenuItem>
            <MenuItem value="call">Холодный звонок</MenuItem>
            <MenuItem value="meeting">Встреча оффлайн</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Тон</InputLabel>
          <Select value={data.tone} label="Тон" onChange={e => set('tone', e.target.value)}>
            <MenuItem value="friendly">Дружеский (на ты)</MenuItem>
            <MenuItem value="professional">Профессиональный (на вы)</MenuItem>
            <MenuItem value="confident">Уверенный</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TextField size="small" label="Дополнительно (опционально)"
        value={data.customNotes} onChange={e => set('customNotes', e.target.value)}
        multiline rows={2}
        placeholder="что-то ещё что важно учесть — общие знакомые, личные интересы, болевые точки" />

      <Button variant="contained" size="large" onClick={() => onSubmit(data)} disabled={!canSubmit || loading}
        startIcon={<AutoAwesomeRoundedIcon />}>
        {loading ? 'Генерирую…' : 'Сгенерировать приглашение'}
      </Button>
    </Stack>
  );
}

// ============================================================
// Универсальный чат-инструмент (юрист, эксперт по акциям).
// Слева список прошлых диалогов, справа активный чат.
// ============================================================
interface ChatProps {
  tool: 'legal_advisor' | 'shares_advisor';
  onBack: () => void;
  onUsageChange: (u: AiUsage) => void;
}

const CHAT_META: Record<ChatProps['tool'], {
  title: string; color: string; icon: React.ReactNode;
  subtitle: string; placeholder: string; emptyState: React.ReactNode;
}> = {
  legal_advisor: {
    title: 'AI юрист Welcome 24',
    color: '#22C55E',
    icon: <GavelRoundedIcon sx={{ fontSize: 24 }} />,
    subtitle: 'Только юридические вопросы по недвижимости РФ. Это консультативная информация, не юр. заключение.',
    placeholder: 'Задай вопрос по сделке, договору, налогам…',
    emptyState: (
      <>
        <Typography variant="body2">Задай вопрос — например:</Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
          «Какой минимальный срок владения чтобы продать квартиру без НДФЛ?»<br />
          «Что обязательно прописать в договоре переуступки ДДУ?»<br />
          «Как оформить сделку если один из собственников — несовершеннолетний?»
        </Typography>
      </>
    ),
  },
  shares_advisor: {
    title: 'AI Финансовый навигатор',
    color: '#F59E0B',           // янтарный — яркий и заметный для финансового инструмента
    icon: <DiamondRoundedIcon sx={{ fontSize: 28 }} />,
    subtitle: 'Поможет разобраться в акциях, пассивном доходе, структуре и росте капитала внутри Welcome 24.',
    placeholder: 'Спроси про акции, пассивный доход, структуру…',
    emptyState: (
      <>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800, color: '#F1F5F9', fontSize: 20 }}>
          Привет! Я Финансовый навигатор Welcome 24
        </Typography>
        <Typography variant="body1" sx={{ display: 'block', color: '#CBD5E1', lineHeight: 1.7, maxWidth: 640, mx: 'auto', fontSize: 15 }}>
          Помогу разобраться в акциях, пассивном доходе и росте капитала внутри компании.
          Посчитаю сколько акций ты можешь купить, покажу стоимость пакета,
          объясню правила продажи, рассчитаю пассивный доход и подскажу сколько
          агентов не хватает до следующего уровня.
        </Typography>
      </>
    ),
  },
};

// Быстрые вопросы — клик отправляет вопрос в чат.
const QUICK_QUESTIONS: Record<string, string[]> = {
  shares_advisor: [
    'Сколько акций я могу купить со своей комиссии?',
    'Сколько сейчас стоят мои акции?',
    'Как работает пассивный доход?',
    'Сколько агентов мне нужно до следующего уровня?',
    'Что такое защищённый и растущий доход?',
    'Можно ли продать акции?',
    'Что будет с акциями, если я уйду?',
    'Как мне увеличить капитал в Welcome 24?',
  ],
  legal_advisor: [],
};

function ChatTool({ tool, onBack, onUsageChange }: ChatProps) {
  const meta = CHAT_META[tool];
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);    // калькулятор пассивного дохода (только для shares_advisor)
  const scrollRef = useRef<HTMLDivElement>(null);

  // Загрузка списка чатов на старте — изолированно по инструменту.
  useEffect(() => {
    setChatsLoading(true);
    setActiveChatId(null);
    setMessages([]);
    aiApi.listChats(tool)
      .then(list => {
        setChats(list);
        if (list.length > 0) setActiveChatId(list[0].id);
      })
      .catch(() => { /* tolerate */ })
      .finally(() => setChatsLoading(false));
  }, [tool]);

  // При смене активного чата — подгрузить сообщения.
  useEffect(() => {
    if (activeChatId == null) { setMessages([]); return; }
    aiApi.getChat(activeChatId)
      .then(full => setMessages(full.messages))
      .catch(() => setMessages([]));
  }, [activeChatId]);

  // Авто-скролл вниз при новых сообщениях.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const newChat = async () => {
    try {
      const c = await aiApi.createChat(tool);
      setActiveChatId(c.id);
      setMessages([]);
      // Синхронизируем список — бэк хранит только последние 5, старые могли быть удалены.
      const list = await aiApi.listChats(tool);
      setChats(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать чат');
    }
  };

  const deleteChat = async (id: number) => {
    if (!confirm('Удалить этот диалог? Действие необратимо.')) return;
    try {
      await aiApi.deleteChat(id);
      setChats(prev => prev.filter(c => c.id !== id));
      if (activeChatId === id) {
        const remaining = chats.filter(c => c.id !== id);
        setActiveChatId(remaining[0]?.id ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Если активного чата нет — создаём.
    let chatId = activeChatId;
    if (chatId == null) {
      try {
        const c = await aiApi.createChat(tool);
        chatId = c.id;
        setChats(prev => [{ ...c, message_count: 0 }, ...prev]);
        setActiveChatId(chatId);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось создать чат');
        return;
      }
    }

    setInput('');
    setLoading(true);
    setError(null);
    // Оптимистично добавляем сообщение пользователя.
    const optimisticUser: StoredMessage = { id: -Date.now(), role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticUser]);
    try {
      const r = await aiApi.sendMessage(chatId, text);
      setMessages(r.chat.messages);
      // Бэк хранит только 5 последних — перезагружаем список целиком для синхронизации.
      const list = await aiApi.listChats(tool);
      setChats(list);
      onUsageChange(r.usage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      // Откатываем оптимистичное сообщение и возвращаем ввод.
      setMessages(prev => prev.filter(m => m.id !== optimisticUser.id));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ mb: 2, color: '#94A3B8' }}>
        К списку инструментов
      </Button>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 2,
              background: alpha(meta.color, 0.15), color: meta.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {meta.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>{meta.title}</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>{meta.subtitle}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Калькулятор пассивного дохода — только для shares_advisor */}
      {tool === 'shares_advisor' && (
        <Card sx={{ mb: 2 }}>
          <Box
            onClick={() => setCalcOpen(o => !o)}
            sx={{
              p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
              cursor: 'pointer',
              '&:hover': { background: alpha(meta.color, 0.04) },
            }}
          >
            <CalculateRoundedIcon sx={{ color: meta.color, fontSize: 22 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
                Калькулятор пассивного дохода
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Посчитай сколько можно зарабатывать на своей структуре по 7 уровням
              </Typography>
            </Box>
            {calcOpen
              ? <ExpandLessRoundedIcon sx={{ color: '#94A3B8' }} />
              : <ExpandMoreRoundedIcon sx={{ color: '#94A3B8' }} />}
          </Box>
          {calcOpen && (
            <Box sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <PassiveIncomeCalculator />
            </Box>
          )}
        </Card>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gap: 2, alignItems: 'start' }}>
        {/* Список диалогов */}
        <Card sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
          <CardContent sx={{ p: 2 }}>
            <Button
              variant="contained" fullWidth size="small" startIcon={<AddRoundedIcon />}
              onClick={newChat}
              sx={{ mb: 1.5, background: alpha(meta.color, 0.18), color: meta.color, boxShadow: 'none',
                '&:hover': { background: alpha(meta.color, 0.28), boxShadow: 'none' } }}
            >
              Новый чат
            </Button>
            <Typography variant="caption" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.6, mb: 1, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              <HistoryRoundedIcon sx={{ fontSize: 14 }} /> История
            </Typography>
            <Box sx={{ maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {chatsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} sx={{ color: meta.color }} />
                </Box>
              )}
              {!chatsLoading && chats.length === 0 && (
                <Typography variant="caption" sx={{ color: '#64748B', textAlign: 'center', py: 3, display: 'block' }}>
                  Пока нет диалогов. Задай первый вопрос — он сохранится автоматически.
                </Typography>
              )}
              {chats.map(c => {
                const active = c.id === activeChatId;
                return (
                  <Box
                    key={c.id}
                    onClick={() => setActiveChatId(c.id)}
                    sx={{
                      p: 1.2, borderRadius: 1.5, cursor: 'pointer',
                      background: active ? alpha(meta.color, 0.12) : 'transparent',
                      border: `1px solid ${active ? alpha(meta.color, 0.3) : 'transparent'}`,
                      '&:hover': { background: active ? alpha(meta.color, 0.16) : 'rgba(255,255,255,0.04)' },
                      display: 'flex', alignItems: 'flex-start', gap: 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{
                        color: active ? meta.color : '#94A3B8', fontWeight: 600, fontSize: 12,
                        display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.title || 'Новый диалог'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#475569', fontSize: 10 }}>
                        {new Date(c.updated_at.replace(' ', 'T') + 'Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {c.message_count} сообщ.
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                      sx={{ color: '#475569', '&:hover': { color: '#EF4444' }, p: 0.4 }}
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* Активный чат */}
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box ref={scrollRef} sx={{
                maxHeight: 520, minHeight: 280, overflowY: 'auto',
                p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5,
              }}>
                {messages.length === 0 && !loading && (
                  <Box sx={{ textAlign: 'center', color: '#64748B', py: 5, px: 1 }}>
                    <Box sx={{
                      fontSize: 56, color: meta.color, mb: 2,
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      width: 72, height: 72, borderRadius: '50%',
                      background: alpha(meta.color, 0.15),
                      border: `2px solid ${alpha(meta.color, 0.35)}`,
                      mx: 'auto',
                    }}>
                      {meta.icon}
                    </Box>
                    {meta.emptyState}
                  </Box>
                )}
                {messages.map(m => (
                  <Box key={m.id} sx={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    p: 1.8, borderRadius: 2.5,
                    background: m.role === 'user' ? alpha('#C9A84C', 0.12) : 'rgba(15,22,41,0.6)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(201,168,76,0.2)' : alpha(meta.color, 0.15)}`,
                  }}>
                    <Typography variant="caption" sx={{
                      display: 'block', mb: 0.5,
                      color: m.role === 'user' ? '#C9A84C' : meta.color,
                      fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {m.role === 'user' ? 'Ты' : meta.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#F1F5F9', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14 }}>
                      {m.content}
                    </Typography>
                  </Box>
                ))}
                {loading && (
                  <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1.5, p: 1.8 }}>
                    <CircularProgress size={16} sx={{ color: meta.color }} />
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>AI думает…</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

          {/* Быстрые вопросы — всегда видны над полем ввода (не только при пустом чате) */}
          {QUICK_QUESTIONS[tool] && QUICK_QUESTIONS[tool].length > 0 && (
            <Box sx={{
              mb: 1.5, display: 'flex', gap: 0.8, overflowX: 'auto', pb: 0.5,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: 2 },
            }}>
              {QUICK_QUESTIONS[tool].map(q => (
                <Chip
                  key={q}
                  label={q}
                  onClick={() => setInput(q)}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    background: alpha(meta.color, 0.12),
                    color: '#F1F5F9',
                    border: `1px solid ${alpha(meta.color, 0.35)}`,
                    fontWeight: 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    '&:hover': { background: alpha(meta.color, 0.22), borderColor: meta.color },
                  }}
                />
              ))}
            </Box>
          )}

          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth multiline minRows={1} maxRows={6}
                  placeholder={meta.placeholder}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  disabled={loading}
                  size="small"
                />
                <IconButton
                  onClick={send} disabled={!input.trim() || loading}
                  sx={{
                    background: alpha(meta.color, 0.15),
                    color: meta.color,
                    width: 44, height: 44,
                    '&:hover': { background: alpha(meta.color, 0.25) },
                    '&.Mui-disabled': { background: 'rgba(255,255,255,0.04)', color: '#475569' },
                  }}
                >
                  <SendRoundedIcon />
                </IconButton>
              </Box>
              <Typography variant="caption" sx={{ color: '#475569', mt: 1, display: 'block', fontSize: 10 }}>
                Enter — отправить, Shift+Enter — новая строка
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
