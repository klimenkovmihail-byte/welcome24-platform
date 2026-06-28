// Самоактивация агента (запуск портала для всех): «Первый вход».
// Телефон → подтверждение ЗВОНКОМ (callcheck) → форма (email-код + анкета + пароль) → вход.
// Уже активированным «Забыли пароль» уходит в восстановление по почте.
import { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, Typography, TextField, Button, Stack, Box, Alert,
  CircularProgress, MenuItem, FormControlLabel, Checkbox, IconButton, InputAdornment,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import PhoneInTalkRoundedIcon from '@mui/icons-material/PhoneInTalkRounded';
import { api, ApiError } from '../api/apiClient';
import { applySession } from '../auth/auth';

const GOLD = '#C9A84C';
const SPECS = ['Первичная', 'Вторичная', 'Аренда', 'Коммерческая', 'Загородная'];
const EXP_OPTIONS = [
  { v: 0, label: 'Нет опыта' }, { v: 1, label: 'Меньше года' }, { v: 2, label: '1–3 года' },
  { v: 4, label: '3–5 лет' }, { v: 6, label: 'Более 5 лет' },
];
const errOf = (e: unknown) => (e instanceof ApiError ? ((e.data as { error?: string })?.error || e.message) : (e as Error)?.message) || 'Что-то пошло не так';

type Step = 'phone' | 'call' | 'form' | 'recover';

export default function Activation({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<Step>('phone');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [callPhone, setCallPhone] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [activateToken, setActivateToken] = useState('');
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [birth, setBirth] = useState('');
  const [exp, setExp] = useState<number | ''>('');
  const [spec, setSpec] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [city2, setCity2] = useState('');
  const [city3, setCity3] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [recoverHint, setRecoverHint] = useState('');
  const pollRef = useRef<number | null>(null);

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  useEffect(() => () => stopPoll(), []);
  useEffect(() => {
    if (!open) { stopPoll(); setStep('phone'); setErr(null); setBusy(false); setPwd(''); setPwd2(''); setEmailSent(false); setEmailCode(''); }
  }, [open]);

  async function startActivation() {
    if (!phone.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.post<{ method?: string; call_phone?: string; call_phone_pretty?: string; pendingToken?: string; recovery?: boolean; email_hint?: string; resetToken?: string | null; debug_code?: string }>('/api/auth/activate/start', { phone });
      if (r.recovery) {
        if (!r.resetToken) { setErr('Восстановление по почте недоступно. Обратитесь к администратору.'); return; }
        setResetToken(r.resetToken); setRecoverHint(r.email_hint || ''); if (r.debug_code) setEmailCode(r.debug_code); setStep('recover');
        return;
      }
      setCallPhone(r.call_phone_pretty || r.call_phone || ''); setPendingToken(r.pendingToken || ''); setStep('call');
      stopPoll(); pollRef.current = window.setInterval(pollCall, 4000); pollCall();
    } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  }

  async function pollCall() {
    try {
      const r = await api.post<{ confirmed?: boolean; activateToken?: string; email_prefill?: string }>('/api/auth/activate/call-status', { pendingToken });
      if (r.confirmed) { stopPoll(); setActivateToken(r.activateToken || ''); setEmail(r.email_prefill || ''); setStep('form'); }
    } catch (e) { stopPoll(); setErr(errOf(e)); setStep('phone'); }
  }

  async function sendEmailCode() {
    if (!email.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await api.post<{ ok: boolean; debug_code?: string }>('/api/auth/activate/email-code', { activateToken, email });
      setEmailSent(true); if (r.debug_code) setEmailCode(r.debug_code);
    } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  }

  async function complete() {
    if (pwd !== pwd2) { setErr('Пароли не совпадают'); return; }
    setBusy(true); setErr(null);
    try {
      const cities = [city2, city3].map((s) => s.trim()).filter(Boolean);
      const r = await api.post<{ token: string; user: unknown }>('/api/auth/activate/complete', {
        activateToken, email, emailCode, password: pwd,
        birth_date: birth || null, experience_years: exp === '' ? null : exp,
        specialization: spec, city: city || null, cities_extra: cities,
      });
      applySession(r.token, r.user as never); onDone();
    } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  }

  async function recoverComplete() {
    if (pwd !== pwd2) { setErr('Пароли не совпадают'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await api.post<{ token: string; user: unknown }>('/api/auth/recover/complete', { resetToken, code: emailCode, password: pwd });
      applySession(r.token, r.user as never); onDone();
    } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  }

  const fld = { fullWidth: true, size: 'small' as const };
  const pwdHint = 'Минимум 8 символов, буква и цифра';
  const pwdAdorn = {
    endAdornment: (
      <InputAdornment position="end">
        <IconButton onClick={() => setShowPwd((s) => !s)} size="small">{showPwd ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}</IconButton>
      </InputAdornment>
    ),
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#0f172a', mb: 0.5 }}>
          {step === 'recover' ? 'Восстановление пароля' : 'Первый вход в портал'}
        </Typography>
        {err && <Alert severity="error" sx={{ my: 1.5 }}>{err}</Alert>}

        {step === 'phone' && (
          <Stack spacing={2} sx={{ mt: 1.5 }}>
            <Typography sx={{ color: '#64748B', fontSize: 13 }}>Введите номер телефона, указанный при регистрации в Welcome 24.</Typography>
            <TextField {...fld} label="Телефон" placeholder="+7 999 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
            <Button variant="contained" disabled={busy} onClick={startActivation} sx={{ py: 1.2, fontWeight: 700, background: GOLD, '&:hover': { background: GOLD } }}>
              {busy ? <CircularProgress size={20} /> : 'Продолжить'}
            </Button>
          </Stack>
        )}

        {step === 'call' && (
          <Stack spacing={2} sx={{ mt: 1.5, alignItems: 'center', textAlign: 'center' }}>
            <PhoneInTalkRoundedIcon sx={{ fontSize: 40, color: GOLD }} />
            <Typography sx={{ color: '#334155', fontSize: 14 }}>Позвоните <b>с этого же телефона</b> на номер (звонок бесплатный, сбросится сам):</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 22, color: '#0f172a', letterSpacing: 1 }}>{callPhone}</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#64748B' }}>
              <CircularProgress size={16} /><Typography sx={{ fontSize: 13 }}>Ждём подтверждения звонка…</Typography>
            </Stack>
            <Button size="small" onClick={() => { stopPoll(); setStep('phone'); }} sx={{ color: '#94A3B8', textTransform: 'none' }}>Изменить номер</Button>
          </Stack>
        )}

        {step === 'form' && (
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <Typography sx={{ color: '#16A34A', fontSize: 13 }}>✓ Телефон подтверждён. Заполните профиль и задайте пароль.</Typography>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField {...fld} label="Email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailSent(false); }} />
              <Button onClick={sendEmailCode} disabled={busy || !email.trim()} sx={{ mt: 0.3, whiteSpace: 'nowrap', textTransform: 'none' }}>{emailSent ? 'Отправить ещё' : 'Код'}</Button>
            </Stack>
            {emailSent && <TextField {...fld} label="Код из письма" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} />}
            <TextField {...fld} type="date" label="Дата рождения" value={birth} onChange={(e) => setBirth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField {...fld} select label="Опыт в недвижимости" value={exp} onChange={(e) => setExp(e.target.value === '' ? '' : Number(e.target.value))}>
              {EXP_OPTIONS.map((o) => <MenuItem key={o.v} value={o.v}>{o.label}</MenuItem>)}
            </TextField>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: 12, mb: 0.3 }}>Чем занимаетесь</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
                {SPECS.map((s) => (
                  <FormControlLabel key={s} sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
                    control={<Checkbox size="small" checked={spec.includes(s)} onChange={(e) => setSpec((cur) => e.target.checked ? [...cur, s] : cur.filter((x) => x !== s))} />} label={s} />
                ))}
              </Box>
            </Box>
            <TextField {...fld} label="Основной город" value={city} onChange={(e) => setCity(e.target.value)} />
            <Stack direction="row" spacing={1}>
              <TextField {...fld} label="Доп. город (необяз.)" value={city2} onChange={(e) => setCity2(e.target.value)} />
              <TextField {...fld} label="Ещё город (необяз.)" value={city3} onChange={(e) => setCity3(e.target.value)} />
            </Stack>
            <TextField {...fld} type={showPwd ? 'text' : 'password'} label="Пароль" value={pwd} onChange={(e) => setPwd(e.target.value)} helperText={pwdHint} slotProps={{ input: pwdAdorn }} />
            <TextField {...fld} type={showPwd ? 'text' : 'password'} label="Повторите пароль" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            <Button variant="contained" disabled={busy || !emailSent || !emailCode.trim() || !pwd} onClick={complete} sx={{ py: 1.2, fontWeight: 700, background: GOLD, '&:hover': { background: GOLD } }}>
              {busy ? <CircularProgress size={20} /> : 'Завершить и войти'}
            </Button>
          </Stack>
        )}

        {step === 'recover' && (
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <Typography sx={{ color: '#64748B', fontSize: 13 }}>Код отправлен на вашу почту {recoverHint}. Введите код и новый пароль.</Typography>
            <TextField {...fld} label="Код из письма" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} autoFocus />
            <TextField {...fld} type={showPwd ? 'text' : 'password'} label="Новый пароль" value={pwd} onChange={(e) => setPwd(e.target.value)} helperText={pwdHint} slotProps={{ input: pwdAdorn }} />
            <TextField {...fld} type={showPwd ? 'text' : 'password'} label="Повторите пароль" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
            <Button variant="contained" disabled={busy || !emailCode.trim() || !pwd} onClick={recoverComplete} sx={{ py: 1.2, fontWeight: 700, background: GOLD, '&:hover': { background: GOLD } }}>
              {busy ? <CircularProgress size={20} /> : 'Сохранить и войти'}
            </Button>
          </Stack>
        )}

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button size="small" onClick={onClose} sx={{ color: '#94A3B8', textTransform: 'none' }}>Отмена</Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
