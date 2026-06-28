// Онбординг нового агента на Дашборде: приветствие основателя + чек-лист первых шагов.
// Виден только новичку (бэк решает через /api/onboarding/me: show=true). Статусы шагов
// считает бэк по факту (профиль/бот/курс/заявка), фронт рисует и ведёт по deep-link.
import { useMemo } from 'react';
import { Box, Card, CardContent, Typography, LinearProgress, IconButton, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useOnboarding } from '../api/queries';
import { onboardingApi, type OnboardingStepKey } from '../api/onboarding';
import founder from '../assets/founder.png';

const GOLD = '#C9A84C';

const STEP_META: Record<OnboardingStepKey, { title: string; desc: string; to: string }> = {
  profile: { title: 'Заполнить профиль', desc: 'Фото, о себе и хотя бы одна соцсеть — в разделе Профиль', to: '/profile' },
  bot:     { title: 'Подключить бота', desc: 'MAX или Telegram на выбор — уведомления о заявках и сделках', to: '/profile' },
  course:  { title: 'Пройти курс онбординга', desc: 'Вводный курс в Академии — как устроена наша компания', to: '/academy' },
  request: { title: 'Оставить заявку специалисту', desc: 'Реклама, ипотека или юрист — в разделе Заявки', to: '/cases' },
};
const STEP_ORDER: OnboardingStepKey[] = ['profile', 'bot', 'course', 'request'];

export default function OnboardingCard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useOnboarding();

  const doneCount = useMemo(() => (data?.steps || []).filter((s) => s.done).length, [data]);

  if (!data?.show) return null;

  const total = data.steps.length || 4;
  const pct = Math.round((doneCount / total) * 100);
  const doneMap = new Map(data.steps.map((s) => [s.key, s.done]));

  const dismiss = async () => {
    try { await onboardingApi.dismiss(); } catch { /* noop — блок просто останется */ }
    qc.invalidateQueries({ queryKey: ['onboarding'] });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mb: 4 }}>

        {/* Приветствие основателя */}
        <Card sx={{ position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', right: -50, top: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)' }} />
          <CardContent sx={{ p: 3, position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box component="img" src={founder} alt="Михаил Клименков"
                sx={{ width: 58, height: 58, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center top', border: `2px solid ${GOLD}55`, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, color: '#F1F5F9', fontSize: 15 }}>Михаил Клименков</Typography>
                <Typography sx={{ color: '#94A3B8', fontSize: 13 }}>Генеральный директор, сооснователь</Typography>
              </Box>
            </Box>
            <Box sx={{ borderLeft: `2px solid ${GOLD}66`, pl: 1.75 }}>
              <Typography sx={{ color: '#E2E8F0', fontSize: 14.5, lineHeight: 1.7, mb: 1 }}>
                Привет, {data.name}! Добро пожаловать в Welcome 24. Меня зовут Михаил Клименков, я генеральный директор и сооснователь.
              </Typography>
              <Typography sx={{ color: '#CBD5E1', fontSize: 14, lineHeight: 1.7 }}>
                Welcome 24 — это цифровая платформа для риелторов: самый высокий процент в стране, каждый агент становится акционером и строит свой пассивный доход. Команда, обучение и партнёры по всей стране — всё в одном портале. Идём к цели в 10 000 агентов и хотим стать крупнейшей компанией для риелторов в России. Рад, что ты с нами — пройди первые шаги ниже, чтобы освоиться быстрее.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Чек-лист первых шагов */}
        <Card sx={{ position: 'relative', overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
              <Typography sx={{ fontWeight: 800, color: '#F1F5F9', fontSize: 15 }}>Ваши первые шаги</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ color: '#94A3B8', fontSize: 13, mr: 0.5 }}>{doneCount} из {total}</Typography>
                <Tooltip title="Скрыть">
                  <IconButton size="small" onClick={dismiss} sx={{ color: '#64748B', '&:hover': { color: '#94A3B8' } }}>
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <LinearProgress variant="determinate" value={pct} sx={{ mb: 1.5 }} />
            {STEP_ORDER.map((key, i) => {
              const meta = STEP_META[key];
              const done = !!doneMap.get(key);
              return (
                <Box key={key}
                  onClick={() => { if (!done) navigate(meta.to); }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, py: 1.15,
                    borderTop: i === 0 ? 'none' : '1px solid rgba(201,168,76,0.08)',
                    cursor: done ? 'default' : 'pointer',
                    '&:hover .step-title': done ? {} : { color: GOLD },
                  }}>
                  {done
                    ? <CheckCircleRoundedIcon sx={{ color: '#22C55E', fontSize: 22, flexShrink: 0 }} />
                    : <RadioButtonUncheckedRoundedIcon sx={{ color: '#64748B', fontSize: 22, flexShrink: 0 }} />}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography className="step-title" sx={{ fontSize: 14, color: done ? '#64748B' : '#F1F5F9', textDecoration: done ? 'line-through' : 'none', transition: 'color 0.2s' }}>
                      {meta.title}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>{meta.desc}</Typography>
                  </Box>
                  {done
                    ? <Typography sx={{ fontSize: 12, color: '#22C55E', whiteSpace: 'nowrap', flexShrink: 0 }}>готово</Typography>
                    : <ChevronRightRoundedIcon sx={{ color: '#64748B', fontSize: 18, flexShrink: 0 }} />}
                </Box>
              );
            })}
          </CardContent>
        </Card>

      </Box>
    </motion.div>
  );
}
