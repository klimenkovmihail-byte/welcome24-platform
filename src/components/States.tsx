import { Box, Skeleton, Alert, Button } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

// Единый экран ошибки загрузки с кнопкой «Повторить» (вместо тихого проглатывания).
export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Alert severity="error" sx={{ mb: 2, textAlign: 'left', maxWidth: 520, mx: 'auto' }}>
        {message || 'Не удалось загрузить данные. Возможно, сервер просыпается — попробуйте ещё раз.'}
      </Alert>
      <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={onRetry}>
        Повторить
      </Button>
    </Box>
  );
}

// Скелетон-заглушка под загрузку страницы: резервирует высоту → нет «прыжка»
// макета и мигающих нулей. Форма: пара крупных карточек + большой блок.
export function PageSkeleton() {
  const sx = { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)' } as const;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ ...sx, flex: '1 1 180px' }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={300} sx={sx} />
      <Skeleton variant="rounded" height={240} sx={sx} />
    </Box>
  );
}
