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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { aiApi, type AiUsage, type AiTool, type ChatSummary, type StoredMessage } from '../api/ai';

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
          <Chip
            icon={usage.remaining === 0 ? <LockRoundedIcon /> : undefined}
            label={`Осталось ${usage.remaining} из ${usage.limit} сегодня`}
            sx={{
              background: usage.remaining === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(201,168,76,0.10)',
              color: usage.remaining === 0 ? '#EF4444' : '#C9A84C',
              fontWeight: 700,
            }}
          />
        )}
        {usage?.unlimited && (
          <Chip label="Без лимита" sx={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontWeight: 700 }} />
        )}
      </Box>

      {activeTool === null ? (
        <ToolsGrid onPick={setActiveTool} />
      ) : activeTool === 'legal_advisor' ? (
        <LegalChat onBack={() => { setActiveTool(null); reloadUsage(); }} onUsageChange={setUsage} />
      ) : (
        <ToolForm tool={activeTool} onBack={() => { setActiveTool(null); reloadUsage(); }} onUsageChange={setUsage} />
      )}
    </Box>
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
// AI юрист Welcome 24 — чат с персистентной историей (в БД).
// Слева список прошлых диалогов, справа активный чат.
// ============================================================
interface ChatProps {
  onBack: () => void;
  onUsageChange: (u: AiUsage) => void;
}

function LegalChat({ onBack, onUsageChange }: ChatProps) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);     // AI отвечает
  const [chatsLoading, setChatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Загрузка списка чатов на старте.
  useEffect(() => {
    aiApi.listChats('legal_advisor')
      .then(list => {
        setChats(list);
        if (list.length > 0) setActiveChatId(list[0].id);
      })
      .catch(() => { /* tolerate */ })
      .finally(() => setChatsLoading(false));
  }, []);

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
      const c = await aiApi.createChat('legal_advisor');
      setChats(prev => [{ ...c, message_count: 0 }, ...prev]);
      setActiveChatId(c.id);
      setMessages([]);
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
        const c = await aiApi.createChat('legal_advisor');
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
      // Обновляем сообщения и summary в списке чатов.
      setMessages(r.chat.messages);
      setChats(prev => {
        const idx = prev.findIndex(c => c.id === r.chat.id);
        const summary: ChatSummary = {
          id: r.chat.id, tool: r.chat.tool, title: r.chat.title,
          created_at: r.chat.created_at, updated_at: r.chat.updated_at,
          message_count: r.chat.messages.length,
        };
        if (idx === -1) return [summary, ...prev];
        const next = prev.slice();
        next.splice(idx, 1);
        return [summary, ...next];
      });
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
              background: alpha('#22C55E', 0.15), color: '#22C55E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GavelRoundedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9' }}>AI юрист Welcome 24</Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Только юридические вопросы по недвижимости РФ. Это консультативная информация, не юр. заключение.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gap: 2, alignItems: 'start' }}>
        {/* Список диалогов */}
        <Card sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
          <CardContent sx={{ p: 2 }}>
            <Button
              variant="contained" fullWidth size="small" startIcon={<AddRoundedIcon />}
              onClick={newChat}
              sx={{ mb: 1.5, background: alpha('#22C55E', 0.18), color: '#22C55E', boxShadow: 'none',
                '&:hover': { background: alpha('#22C55E', 0.28), boxShadow: 'none' } }}
            >
              Новый чат
            </Button>
            <Typography variant="caption" sx={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 0.6, mb: 1, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              <HistoryRoundedIcon sx={{ fontSize: 14 }} /> История
            </Typography>
            <Box sx={{ maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {chatsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} sx={{ color: '#22C55E' }} />
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
                      background: active ? alpha('#22C55E', 0.12) : 'transparent',
                      border: `1px solid ${active ? 'rgba(34,197,94,0.3)' : 'transparent'}`,
                      '&:hover': { background: active ? alpha('#22C55E', 0.16) : 'rgba(255,255,255,0.04)' },
                      display: 'flex', alignItems: 'flex-start', gap: 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{
                        color: active ? '#22C55E' : '#94A3B8', fontWeight: 600, fontSize: 12,
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
                  <Box sx={{ textAlign: 'center', color: '#64748B', py: 6 }}>
                    <GavelRoundedIcon sx={{ fontSize: 40, color: 'rgba(34,197,94,0.3)', mb: 1 }} />
                    <Typography variant="body2">Задай вопрос — например:</Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                      «Какой минимальный срок владения чтобы продать квартиру без НДФЛ?»<br />
                      «Что обязательно прописать в договоре переуступки ДДУ?»<br />
                      «Как оформить сделку если один из собственников — несовершеннолетний?»
                    </Typography>
                  </Box>
                )}
                {messages.map(m => (
                  <Box key={m.id} sx={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    p: 1.8, borderRadius: 2.5,
                    background: m.role === 'user' ? alpha('#C9A84C', 0.12) : 'rgba(15,22,41,0.6)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(201,168,76,0.2)' : 'rgba(34,197,94,0.15)'}`,
                  }}>
                    <Typography variant="caption" sx={{
                      display: 'block', mb: 0.5,
                      color: m.role === 'user' ? '#C9A84C' : '#22C55E',
                      fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {m.role === 'user' ? 'Ты' : 'AI юрист Welcome 24'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#F1F5F9', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14 }}>
                      {m.content}
                    </Typography>
                  </Box>
                ))}
                {loading && (
                  <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1.5, p: 1.8 }}>
                    <CircularProgress size={16} sx={{ color: '#22C55E' }} />
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>AI думает…</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth multiline minRows={1} maxRows={6}
                  placeholder="Задай вопрос по сделке, договору, налогам…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  disabled={loading}
                  size="small"
                />
                <IconButton
                  onClick={send} disabled={!input.trim() || loading}
                  sx={{
                    background: alpha('#22C55E', 0.15),
                    color: '#22C55E',
                    width: 44, height: 44,
                    '&:hover': { background: alpha('#22C55E', 0.25) },
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
