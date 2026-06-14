// CRM → модуль «Чаты с собственниками»: агрегированный инбокс переписок агента по объектам
// (непрочитанные сверху + счётчик). Решает проблему «30 объектов» — не открывать каждую карточку.
// Клик по строке → диалог чата (переиспользует портальный Thread). Deep-link ?chat=<id> авто-открывает.
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Stack, Card, Chip, CircularProgress, Dialog, DialogContent, IconButton } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import Thread from '../Thread';
import { getCurrentAgent } from '../../auth/auth';
import { getClientChats } from '../../api/mls';

const GOLD = '#C9A84C';
const fmt = (s: string) => { try { return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return s; } };

function ChatDialog({ propertyId, title, onClose }: { propertyId: number; title: string; onClose: () => void }) {
  const myId = getCurrentAgent()?.id ?? null;
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { background: 'linear-gradient(135deg, #0F1629 0%, #0A0E1A 100%)', border: `1px solid ${GOLD}22`, borderRadius: 3 } } }}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: '#94A3B8', '&:hover': { color: '#F1F5F9' } }}><CloseRoundedIcon /></IconButton>
      <DialogContent sx={{ p: 2.5 }}>
        <Typography sx={{ color: '#4ade80', fontWeight: 700, fontSize: 14, mb: 1.5, pr: 4 }}>{title}</Typography>
        <Thread apiBase={`/mls/properties/${propertyId}/client-chat`} myId={myId} myRole="agent" maxHeight={440} emptyText="Сообщений пока нет. Напишите собственнику." />
      </DialogContent>
    </Dialog>
  );
}

export default function OwnerChatsView({ initialChatId }: { initialChatId?: number | null }) {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['mls-client-chats'], queryFn: getClientChats, refetchInterval: 20_000 });
  const [open, setOpen] = useState<{ id: number; title: string } | null>(null);
  const items = data?.items || [];

  useEffect(() => {
    if (!initialChatId) return;
    const row = items.find((r) => r.property_id === initialChatId);
    setOpen({ id: initialChatId, title: row ? `${row.owner_name}${row.address ? ' · ' + row.address : ''}` : 'Чат с собственником' });
  }, [initialChatId, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: GOLD }} /></Box>;
  if (items.length === 0) return <Typography sx={{ color: '#64748B', py: 5, textAlign: 'center' }}>Пока нет переписок. Чаты появляются, когда собственник пишет из кабинета (или вы — из карточки объекта).</Typography>;

  return (
    <>
      <Stack spacing={1.2}>
        {items.map((r) => (
          <Card key={r.property_id} onClick={() => setOpen({ id: r.property_id, title: `${r.owner_name}${r.address ? ' · ' + r.address : ''}` })}
            sx={{ cursor: 'pointer', border: r.unread > 0 ? '1px solid rgba(239,68,68,0.4)' : undefined, transition: 'border-color .2s', '&:hover': { borderColor: `${GOLD}55` } }}>
            <Box sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${GOLD}1A`, color: GOLD }}><ChatRoundedIcon sx={{ fontSize: 20 }} /></Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.owner_name}</Typography>
                  {r.address && <Typography sx={{ color: '#64748B', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address}</Typography>}
                </Stack>
                <Typography sx={{ color: '#94A3B8', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.25 }}>
                  {r.last_from === 'agent' ? 'Вы: ' : ''}{r.preview}
                </Typography>
              </Box>
              <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Typography sx={{ color: '#64748B', fontSize: 11, whiteSpace: 'nowrap' }}>{fmt(r.last_at)}</Typography>
                {r.unread > 0 && <Chip label={r.unread} size="small" sx={{ height: 20, minWidth: 22, fontSize: 11, fontWeight: 800, color: '#fff', background: '#EF4444' }} />}
              </Stack>
            </Box>
          </Card>
        ))}
      </Stack>
      {open && <ChatDialog propertyId={open.id} title={open.title} onClose={() => { setOpen(null); refetch(); }} />}
    </>
  );
}
