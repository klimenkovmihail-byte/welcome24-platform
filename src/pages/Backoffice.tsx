import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Chip, Grid, alpha,
  IconButton, Tooltip, CircularProgress, Alert,
} from '@mui/material';
import { motion } from 'framer-motion';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import TelegramIcon from '@mui/icons-material/Telegram';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import { backofficeApi, type BackOfficeMember } from '../api/backoffice';

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
  const [team, setTeam] = useState<BackOfficeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    backofficeApi.list()
      .then(setTeam)
      .catch(err => setError(err?.message || 'Не удалось загрузить команду'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: '#C9A84C' }} /></Box>;
  }
  if (error) {
    return <Alert severity="error">{error}</Alert>;
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
      <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
        К этим людям ты можешь обращаться по специальным вопросам — бухгалтерия, юристы, HR, маркетинг, IT.
      </Typography>

      <Grid container spacing={3}>
        {team.map((m, i) => {
          const color = roleColors[m.role] || defaultColor;
          const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2);
          return (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={m.id}>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.06 }}>
                <Card sx={{
                  height: '100%',
                  border: `1px solid ${alpha(color, 0.15)}`,
                  '&:hover': { border: `1px solid ${alpha(color, 0.4)}`, boxShadow: `0 12px 32px ${alpha(color, 0.15)}` },
                  transition: 'all 0.3s',
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        src={m.photo || undefined}
                        sx={{
                          width: 64, height: 64, fontSize: 20, fontWeight: 800,
                          background: m.photo ? '#1A2340' : `linear-gradient(135deg, ${alpha(color, 0.4)}, ${alpha(color, 0.15)})`,
                          color: '#F1F5F9',
                          border: `2px solid ${alpha(color, 0.4)}`,
                        }}
                      >
                        {!m.photo && initials}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F1F5F9', lineHeight: 1.2 }}>
                          {m.name}
                        </Typography>
                        <Chip label={m.role} size="small" sx={{
                          mt: 0.5, height: 22, fontSize: 11, fontWeight: 700,
                          background: alpha(color, 0.15), color, border: `1px solid ${alpha(color, 0.3)}`,
                        }} />
                      </Box>
                    </Box>

                    {m.description && (
                      <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', lineHeight: 1.6, mb: 2, minHeight: 36 }}>
                        {m.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {m.phone && (
                        <Tooltip title={m.phone}>
                          <IconButton size="small" onClick={() => window.open(`tel:${m.phone}`)} sx={{ color: '#22C55E', background: 'rgba(34,197,94,0.1)', '&:hover': { background: 'rgba(34,197,94,0.2)' } }}>
                            <PhoneRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {m.email && (
                        <Tooltip title={m.email}>
                          <IconButton size="small" onClick={() => window.open(`mailto:${m.email}`)} sx={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', '&:hover': { background: 'rgba(245,158,11,0.2)' } }}>
                            <EmailRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {m.telegram && (
                        <Tooltip title={`@${m.telegram.replace('@', '')}`}>
                          <IconButton size="small" onClick={() => window.open(`https://t.me/${m.telegram.replace('@', '')}`)} sx={{ color: '#229ED9', background: 'rgba(34,158,217,0.1)', '&:hover': { background: 'rgba(34,158,217,0.2)' } }}>
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
