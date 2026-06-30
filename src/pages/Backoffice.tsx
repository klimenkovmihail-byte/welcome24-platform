import { useQuery } from '@tanstack/react-query';
import { useBackoffice } from '../api/queries';
import {
  Box, Card, CardContent, Typography, Avatar, Grid, alpha,
  IconButton, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import { ErrorState, PageSkeleton } from '../components/States';
import SmartAvatar from '../components/SmartAvatar';
import { motion } from 'framer-motion';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import TelegramIcon from '@mui/icons-material/Telegram';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import { settingsApi } from '../api/settings';

const DEFAULT_INTRO = 'К этим людям ты можешь обращаться по специальным вопросам — бухгалтерия, юристы, HR, маркетинг, IT.';

// Цвета по должностям — для визуального разнообразия карточек.
const roleColors: Record<string, string> = {
  'HR':            '#EC4899',
  'Юрист':         '#7B2FBE',
  'Юридический':   '#7B2FBE',
  'Бухгалтер':     '#22C55E',
  'Бухгалтерия':   '#22C55E',
  'Маркетинг':     '#F59E0B',
  'IT':            '#4361EE',
  'Поддержка':     '#06B6D4',
  'Руководитель':  '#C9A84C',
  'CEO':           '#C9A84C',
};
const defaultColor = '#94A3B8';

export default function Backoffice() {
  const teamQ = useBackoffice();
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get() });
  const team = teamQ.data ?? [];
  const intro = (settingsQ.data?.backoffice_intro?.trim()) || DEFAULT_INTRO;
  const error = teamQ.error as Error | null;

  if (teamQ.isLoading) {
    return <PageSkeleton />;
  }
  if (error) {
    return <ErrorState message={error.message} onRetry={() => teamQ.refetch()} />;
  }
  if (team.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <SupportAgentRoundedIcon sx={{ fontSize: 64, color: '#1E2A45', mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#F1F5F9', mb: 1 }}>Команда бэк-офиса пока не настроена</Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Администратор скоро добавит карточки сотрудников. Пока что — пиши в поддержку через раздел «Профиль».
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3, whiteSpace: 'pre-wrap' }}>
        {intro}
      </Typography>

      <Grid container spacing={3}>
        {team.map((m, i) => {
          // Цвет приоритетно из БД (задал админ), иначе fallback по должности.
          const color = m.color || roleColors[m.role] || defaultColor;
          const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2);
          // Маскируем телефон для tooltip (показываем только номер, не модифицируем)
          const tgClean = m.telegram?.replace('@', '');
          return (
            <Grid size={{ xs: 12, sm: 6, lg: 6, xl: 4 }} key={m.id}>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.06 }}>
                <Card sx={{
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  border: `1px solid ${alpha(color, 0.20)}`,
                  background: `linear-gradient(160deg, ${alpha(color, 0.08)} 0%, rgba(15,22,41,0.95) 60%)`,
                  transition: 'all 0.3s',
                  '&:hover': {
                    border: `1px solid ${alpha(color, 0.55)}`,
                    boxShadow: `0 18px 40px ${alpha(color, 0.20)}`,
                    transform: 'translateY(-3px)',
                  },
                }}>
                  {/* Акцентная полоса слева во весь рост */}
                  <Box sx={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                    background: `linear-gradient(180deg, ${color}, ${alpha(color, 0.5)})`,
                  }} />

                  {/* Декоративный градиент-кружок в правом верхнем углу */}
                  <Box sx={{
                    position: 'absolute', top: -60, right: -60,
                    width: 180, height: 180, borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(color, 0.35)} 0%, ${alpha(color, 0)} 70%)`,
                    pointerEvents: 'none',
                  }} />

                  <CardContent sx={{ p: 3, pl: 3.5, position: 'relative', zIndex: 1 }}>
                    {/* Аватар + имя + должность */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <SmartAvatar
                        src={m.photo}
                        name={m.name}
                        size={84}
                        sx={{
                          background: `linear-gradient(135deg, ${alpha(color, 0.55)}, ${alpha(color, 0.18)})`,
                          color: '#F1F5F9',
                          border: `3px solid ${alpha(color, 0.55)}`,
                          boxShadow: `0 6px 18px ${alpha(color, 0.25)}`,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F1F5F9', lineHeight: 1.25, mb: 0.7 }}>
                          {m.name}
                        </Typography>
                        <Box sx={{
                          display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.2,
                          background: alpha(color, 0.18),
                          border: `1px solid ${alpha(color, 0.35)}`,
                        }}>
                          <Typography variant="caption" sx={{ color, fontWeight: 700, letterSpacing: '0.02em', fontSize: 11.5 }}>
                            {m.role}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {m.description && (
                      <Typography variant="body2" sx={{
                        color: '#CBD5E1', display: 'block',
                        lineHeight: 1.65, mb: 2,
                        fontSize: 14,
                      }}>
                        {m.description}
                      </Typography>
                    )}

                    {/* Контакты — компактные кнопки-иконки с подсказками */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {m.phone && (
                        <Tooltip title={m.phone}>
                          <IconButton size="small" onClick={() => { window.location.href = `tel:${m.phone}`; }}
                            sx={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)', '&:hover': { background: 'rgba(34,197,94,0.2)' } }}>
                            <PhoneRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {m.email && (
                        <Tooltip title={m.email}>
                          <IconButton size="small" onClick={() => { window.location.href = `mailto:${m.email}`; }}
                            sx={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', '&:hover': { background: 'rgba(245,158,11,0.2)' } }}>
                            <EmailRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {m.telegram && (
                        <Tooltip title={`@${tgClean}`}>
                          <IconButton size="small" onClick={() => window.open(`https://t.me/${tgClean}`, '_blank', 'noopener')}
                            sx={{ color: '#229ED9', background: 'rgba(34,158,217,0.1)', '&:hover': { background: 'rgba(34,158,217,0.2)' } }}>
                            <TelegramIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
