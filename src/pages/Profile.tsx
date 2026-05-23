import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Chip, Grid, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, IconButton, Alert, Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import TelegramIcon from '@mui/icons-material/Telegram';
import InstagramIcon from '@mui/icons-material/Instagram';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import InputAdornment from '@mui/material/InputAdornment';
import { currentUser, achievements } from '../data/mockData';

const tierColor: Record<string, { bg: string; ring: string; text: string }> = {
  bronze:   { bg: 'rgba(180,83,9,0.15)',    ring: 'rgba(217,119,6,0.4)',  text: '#D97706' },
  silver:   { bg: 'rgba(148,163,184,0.15)', ring: 'rgba(148,163,184,0.4)', text: '#94A3B8' },
  gold:     { bg: 'rgba(201,168,76,0.18)',  ring: 'rgba(201,168,76,0.5)', text: '#C9A84C' },
  platinum: { bg: 'rgba(168,85,247,0.15)',  ring: 'rgba(168,85,247,0.4)', text: '#A855F7' },
};

const daysAt = (() => {
  const ms = Date.now() - new Date(currentUser.joinDate).getTime();
  return Math.floor(ms / 86_400_000);
})();

export default function Profile() {
  const [editOpen, setEditOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sent, setSent] = useState(false);
  const [refCopied, setRefCopied] = useState(false);
  const [form, setForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    city: currentUser.city,
    specialization: currentUser.specialization.join(', '),
    telegram: currentUser.socials?.telegram || '',
    telegramChannel: currentUser.socials?.telegramChannel || '',
    instagram: currentUser.socials?.instagram || '',
    vk: currentUser.socials?.vk || '',
    max: currentUser.socials?.max || '',
  });
  const [supportForm, setSupportForm] = useState({ topic: '', message: '' });

  const referralLink = `https://app.welcome24.ru/r/${currentUser.id}-mk`;

  const handleSave = () => {
    setSaved(true); setEditOpen(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSupportSend = () => {
    setSupportOpen(false);
    setSent(true);
    setSupportForm({ topic: '', message: '' });
    setTimeout(() => setSent(false), 2500);
  };

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(referralLink);
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 1800);
  };

  const earned = achievements.filter(a => a.earned);
  const locked = achievements.filter(a => !a.earned);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Left column: avatar + contacts + actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
            <Card sx={{ mb: 3, textAlign: 'center', overflow: 'visible', position: 'relative' }}>
              <Box sx={{ height: 80, background: 'linear-gradient(135deg, rgba(201,168,76,0.3) 0%, rgba(67,97,238,0.2) 100%)', borderRadius: '16px 16px 0 0', position: 'relative' }}>
                <Box sx={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)' }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar sx={{ width: 80, height: 80, fontSize: 26, fontWeight: 900, background: 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', border: '4px solid #0F1629', boxShadow: '0 8px 32px rgba(201,168,76,0.4)' }}>
                      КМ
                    </Avatar>
                    <Tooltip title="Загрузить фото">
                      <IconButton
                        size="small"
                        onClick={() => setEditOpen(true)}
                        sx={{
                          position: 'absolute', bottom: 0, right: 0,
                          width: 28, height: 28,
                          background: '#C9A84C', color: '#0A0E1A',
                          border: '2px solid #0F1629',
                          '&:hover': { background: '#E2C97E' },
                        }}
                      >
                        <PhotoCameraRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
              <CardContent sx={{ pt: 7, pb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#F1F5F9', lineHeight: 1.3 }}>{currentUser.name}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1, mb: 2 }}>
                  <Chip label={`Уровень ${currentUser.level}`} size="small" sx={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', fontWeight: 700 }} />
                  <Chip label={`${currentUser.commission}%`} size="small" sx={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontWeight: 700 }} />
                </Box>
                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.08)' }} />
                {[
                  { icon: <EmailRoundedIcon sx={{ fontSize: 16 }} />, value: currentUser.email },
                  { icon: <PhoneRoundedIcon sx={{ fontSize: 16 }} />, value: currentUser.phone },
                  { icon: <LocationOnRoundedIcon sx={{ fontSize: 16 }} />, value: currentUser.city },
                  { icon: <CalendarTodayRoundedIcon sx={{ fontSize: 16 }} />, value: `В Welcome 24 с ${new Date(currentUser.joinDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })} · ${daysAt} дн.` },
                ].map(({ icon, value }) => (
                  <Box key={value} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 1 }}>
                    <Box sx={{ color: '#64748B', flexShrink: 0 }}>{icon}</Box>
                    <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'left' }}>{value}</Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 2, borderColor: 'rgba(201,168,76,0.08)' }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 1 }}>Специализация</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {currentUser.specialization.map(s => (
                      <Chip key={s} label={s} size="small" sx={{ background: 'rgba(67,97,238,0.12)', color: '#4361EE', fontWeight: 600 }} />
                    ))}
                  </Box>
                </Box>
                {/* Socials */}
                {(currentUser.socials?.telegram || currentUser.socials?.telegramChannel || currentUser.socials?.instagram || currentUser.socials?.vk || currentUser.socials?.max) && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 1 }}>Соцсети</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {currentUser.socials?.telegram && (
                        <Tooltip title={`@${currentUser.socials.telegram}`}>
                          <IconButton size="small" component="a" href={`https://t.me/${currentUser.socials.telegram}`} target="_blank" rel="noopener"
                            sx={{ color: '#229ED9', background: 'rgba(34,158,217,0.1)', border: '1px solid rgba(34,158,217,0.2)', '&:hover': { background: 'rgba(34,158,217,0.2)' } }}>
                            <TelegramIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {currentUser.socials?.telegramChannel && (
                        <Tooltip title={`Канал ${currentUser.socials.telegramChannel}`}>
                          <IconButton size="small" component="a" href={`https://t.me/${currentUser.socials.telegramChannel.replace('@', '')}`} target="_blank" rel="noopener"
                            sx={{ color: '#229ED9', background: 'rgba(34,158,217,0.1)', border: '1px solid rgba(34,158,217,0.2)', '&:hover': { background: 'rgba(34,158,217,0.2)' } }}>
                            <CampaignRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {currentUser.socials?.instagram && (
                        <Tooltip title={`@${currentUser.socials.instagram}`}>
                          <IconButton size="small" component="a" href={`https://instagram.com/${currentUser.socials.instagram}`} target="_blank" rel="noopener"
                            sx={{ color: '#E4405F', background: 'rgba(228,64,95,0.1)', border: '1px solid rgba(228,64,95,0.2)', '&:hover': { background: 'rgba(228,64,95,0.2)' } }}>
                            <InstagramIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {currentUser.socials?.vk && (
                        <Tooltip title={`vk.com/${currentUser.socials.vk}`}>
                          <IconButton size="small" component="a" href={`https://vk.com/${currentUser.socials.vk}`} target="_blank" rel="noopener"
                            sx={{ color: '#0077FF', background: 'rgba(0,119,255,0.1)', border: '1px solid rgba(0,119,255,0.2)', '&:hover': { background: 'rgba(0,119,255,0.2)' } }}>
                            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.13C2 20.67 3.33 22 8.93 22h6.13c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.07 14.27h-1.45c-.55 0-.72-.44-1.71-1.42-.86-.84-1.23-.94-1.45-.94-.3 0-.39.09-.39.51v1.31c0 .36-.12.58-1.07.58-1.59 0-3.35-.96-4.59-2.76-1.86-2.61-2.37-4.57-2.37-4.97 0-.22.09-.42.51-.42h1.45c.38 0 .52.17.66.58.71 2.07 1.91 3.88 2.4 3.88.18 0 .27-.09.27-.55v-2.13c-.06-.98-.58-1.07-.58-1.42 0-.17.14-.34.36-.34h2.28c.32 0 .43.17.43.55v2.87c0 .32.14.43.23.43.18 0 .33-.11.66-.44 1.02-1.14 1.74-2.9 1.74-2.9.09-.21.26-.4.64-.4h1.45c.44 0 .53.22.44.55-.18.85-1.96 3.36-1.96 3.36-.15.24-.21.36 0 .64.15.21.66.65 1 1.04.62.71 1.1 1.31 1.23 1.72.12.42-.09.62-.51.62z" /></svg>
                          </IconButton>
                        </Tooltip>
                      )}
                      {currentUser.socials?.max && (
                        <Tooltip title={`MAX: ${currentUser.socials.max}`}>
                          <IconButton size="small" component="a" href={`https://max.ru/${currentUser.socials.max.replace('@', '')}`} target="_blank" rel="noopener"
                            sx={{ color: '#7C3AED', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', '&:hover': { background: 'rgba(124,58,237,0.2)' } }}>
                            <ChatRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                )}
                <Button
                  variant="outlined" startIcon={<EditRoundedIcon />} fullWidth
                  onClick={() => setEditOpen(true)}
                  sx={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C', fontWeight: 700, '&:hover': { borderColor: '#C9A84C', background: 'rgba(201,168,76,0.06)' } }}
                >
                  Редактировать профиль
                </Button>
              </CardContent>
            </Card>

            {/* Referral card */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 1.5 }}>Реферальная ссылка</Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1.5 }}>
                  Приглашайте агентов и получайте бонусы с их сделок
                </Typography>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  p: 1.2, borderRadius: 2,
                  background: 'rgba(201,168,76,0.05)',
                  border: '1px dashed rgba(201,168,76,0.25)',
                }}>
                  <Typography variant="caption" sx={{ flex: 1, color: '#C9A84C', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {referralLink}
                  </Typography>
                  <Tooltip title={refCopied ? 'Скопировано!' : 'Скопировать'}>
                    <IconButton size="small" onClick={handleCopyRef} sx={{ color: refCopied ? '#22C55E' : '#64748B' }}>
                      {refCopied ? <CheckCircleRoundedIcon sx={{ fontSize: 16 }} /> : <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'rgba(67,97,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SupportAgentRoundedIcon sx={{ color: '#4361EE', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Техподдержка</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>Ответим в течение часа</Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained" fullWidth
                  onClick={() => setSupportOpen(true)}
                  sx={{ background: 'linear-gradient(135deg, #4361EE, #6B80F5)', color: '#fff', fontWeight: 700, '&:hover': { boxShadow: '0 6px 20px rgba(67,97,238,0.35)' } }}
                >
                  Написать в поддержку
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Right column: ALL achievements */}
        <Grid size={{ xs: 12, md: 8 }}>
          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9' }}>Достижения</Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>{earned.length} из {achievements.length} получено</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, borderRadius: 2, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                    <EmojiEventsRoundedIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#C9A84C' }}>{Math.round(earned.length / achievements.length * 100)}%</Typography>
                  </Box>
                </Box>

                {/* Earned */}
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>Получено</Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {earned.map((ach, i) => {
                    const c = tierColor[ach.tier];
                    return (
                      <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={ach.id}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                          <Tooltip title={ach.description} placement="top">
                            <Box sx={{
                              p: 2, borderRadius: 3, textAlign: 'center', cursor: 'default',
                              background: `linear-gradient(135deg, ${c.bg} 0%, transparent 100%)`,
                              border: `1px solid ${c.ring}`,
                              position: 'relative',
                            }}>
                              <Box sx={{ fontSize: 36 }}>{ach.icon}</Box>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: c.text, display: 'block', lineHeight: 1.3, mt: 0.5 }}>
                                {ach.title}
                              </Typography>
                              {ach.date && (
                                <Typography variant="caption" sx={{ color: '#64748B', fontSize: 10, display: 'block' }}>
                                  {new Date(ach.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                </Typography>
                              )}
                              <Chip label={ach.tier.toUpperCase()} size="small" sx={{
                                position: 'absolute', top: 6, right: 6,
                                height: 16, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                                background: c.ring, color: c.text,
                              }} />
                            </Box>
                          </Tooltip>
                        </motion.div>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* Locked */}
                {locked.length > 0 && (
                  <>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>Заблокировано</Typography>
                    <Grid container spacing={2}>
                      {locked.map((ach, i) => {
                        const c = tierColor[ach.tier];
                        return (
                          <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={ach.id}>
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.55, scale: 1 }} transition={{ delay: 0.2 + i * 0.04 }}>
                              <Tooltip title={ach.description} placement="top">
                                <Box sx={{
                                  p: 2, borderRadius: 3, textAlign: 'center', cursor: 'default',
                                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                                  filter: 'grayscale(0.7)',
                                  '&:hover': { filter: 'grayscale(0.3)', opacity: 1 },
                                  transition: 'all 0.2s',
                                }}>
                                  <Box sx={{ fontSize: 36, opacity: 0.6 }}>{ach.icon}</Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', lineHeight: 1.3, mt: 0.5 }}>
                                    {ach.title}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#475569', fontSize: 10, display: 'block' }}>🔒 {ach.tier}</Typography>
                                </Box>
                              </Tooltip>
                            </motion.div>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Toast: saved */}
      {saved && (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'fixed', top: 100, right: 32, zIndex: 1500 }}>
          <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ borderRadius: 2, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
            Профиль успешно обновлён
          </Alert>
        </motion.div>
      )}
      {sent && (
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'fixed', top: 100, right: 32, zIndex: 1500 }}>
          <Alert severity="success" icon={<CheckCircleRoundedIcon />} sx={{ borderRadius: 2, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
            Обращение отправлено в техподдержку
          </Alert>
        </motion.div>
      )}

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#F1F5F9' }}>Редактировать профиль</Typography>
          <IconButton size="small" onClick={() => setEditOpen(false)} sx={{ color: '#64748B' }}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)' }} />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar sx={{ width: 64, height: 64, background: 'linear-gradient(135deg, #C9A84C, #E2C97E)', color: '#0A0E1A', fontWeight: 900, fontSize: 22 }}>КМ</Avatar>
              <Button variant="outlined" startIcon={<PhotoCameraRoundedIcon />} sx={{ borderColor: 'rgba(201,168,76,0.3)', color: '#C9A84C', fontSize: 12 }}>
                Загрузить фото
              </Button>
            </Box>
            <TextField fullWidth size="small" label="ФИО" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField fullWidth size="small" label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <TextField fullWidth size="small" label="Телефон" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </Box>
            <TextField fullWidth size="small" label="Город" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <TextField fullWidth size="small" label="Специализация (через запятую)" value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} />

            <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)', my: 1 }}>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>СОЦСЕТИ И МЕССЕНДЖЕРЫ</Typography>
            </Divider>
            <TextField
              fullWidth size="small" label="Telegram"
              value={form.telegram} onChange={e => setForm(f => ({ ...f, telegram: e.target.value.replace(/^@/, '') }))}
              placeholder="username"
              slotProps={{ input: {
                startAdornment: <InputAdornment position="start"><TelegramIcon sx={{ color: '#229ED9', fontSize: 18 }} /></InputAdornment>,
                ...(form.telegram ? { startAdornment: <InputAdornment position="start"><TelegramIcon sx={{ color: '#229ED9', fontSize: 18 }} /><Typography sx={{ color: '#64748B', ml: 0.5, fontSize: 14 }}>@</Typography></InputAdornment> } : {}),
              } }}
            />
            <TextField
              fullWidth size="small" label="Telegram-канал"
              value={form.telegramChannel} onChange={e => setForm(f => ({ ...f, telegramChannel: e.target.value }))}
              placeholder="@yourchannel"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><CampaignRoundedIcon sx={{ color: '#229ED9', fontSize: 18 }} /></InputAdornment> } }}
            />
            <TextField
              fullWidth size="small" label="Instagram"
              value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value.replace(/^@/, '') }))}
              placeholder="username"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><InstagramIcon sx={{ color: '#E4405F', fontSize: 18 }} /></InputAdornment> } }}
            />
            <TextField
              fullWidth size="small" label="ВКонтакте"
              value={form.vk} onChange={e => setForm(f => ({ ...f, vk: e.target.value.replace(/^https?:\/\/vk\.com\//, '') }))}
              placeholder="username или id"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Box sx={{ color: '#0077FF', display: 'flex' }}><svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.13C2 20.67 3.33 22 8.93 22h6.13c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.07 14.27h-1.45c-.55 0-.72-.44-1.71-1.42-.86-.84-1.23-.94-1.45-.94-.3 0-.39.09-.39.51v1.31c0 .36-.12.58-1.07.58-1.59 0-3.35-.96-4.59-2.76-1.86-2.61-2.37-4.57-2.37-4.97 0-.22.09-.42.51-.42h1.45c.38 0 .52.17.66.58.71 2.07 1.91 3.88 2.4 3.88.18 0 .27-.09.27-.55v-2.13c-.06-.98-.58-1.07-.58-1.42 0-.17.14-.34.36-.34h2.28c.32 0 .43.17.43.55v2.87c0 .32.14.43.23.43.18 0 .33-.11.66-.44 1.02-1.14 1.74-2.9 1.74-2.9.09-.21.26-.4.64-.4h1.45c.44 0 .53.22.44.55-.18.85-1.96 3.36-1.96 3.36-.15.24-.21.36 0 .64.15.21.66.65 1 1.04.62.71 1.1 1.31 1.23 1.72.12.42-.09.62-.51.62z" /></svg></Box></InputAdornment> } }}
            />
            <TextField
              fullWidth size="small" label="MAX мессенджер"
              value={form.max} onChange={e => setForm(f => ({ ...f, max: e.target.value.replace(/^@/, '') }))}
              placeholder="username"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><ChatRoundedIcon sx={{ color: '#7C3AED', fontSize: 18 }} /></InputAdornment> } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: '#64748B' }}>Отмена</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim() || !form.email.trim()}>
            Сохранить изменения
          </Button>
        </DialogActions>
      </Dialog>

      {/* Support dialog */}
      <Dialog open={supportOpen} onClose={() => setSupportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#F1F5F9' }}>Написать в техподдержку</Typography>
          <IconButton size="small" onClick={() => setSupportOpen(false)} sx={{ color: '#64748B' }}><CloseRoundedIcon /></IconButton>
        </DialogTitle>
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.1)' }} />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ borderRadius: 2, py: 0.5 }}>
              Ваше обращение будет привязано к аккаунту <b>{currentUser.email}</b>
            </Alert>
            <TextField fullWidth size="small" label="Тема" value={supportForm.topic} onChange={e => setSupportForm(f => ({ ...f, topic: e.target.value }))} placeholder="Например, не могу занести сделку" />
            <TextField fullWidth label="Сообщение" multiline rows={5} value={supportForm.message} onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))} placeholder="Опишите подробно вашу проблему или вопрос" />
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Среднее время ответа: <b style={{ color: '#22C55E' }}>15 минут</b>. Можно прикрепить скриншот по почте <b style={{ color: '#C9A84C' }}>support@w24.agency</b>.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSupportOpen(false)} sx={{ color: '#64748B' }}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSupportSend}
            disabled={!supportForm.topic.trim() || !supportForm.message.trim()}
            sx={{ background: 'linear-gradient(135deg, #4361EE, #6B80F5)' }}
          >
            Отправить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
