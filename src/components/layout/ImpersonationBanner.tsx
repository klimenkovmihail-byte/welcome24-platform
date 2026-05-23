import { useEffect, useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { getImpersonation, exitImpersonation, tryImpersonationFromUrl, type ImpersonationState } from '../../auth/auth';

export default function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState | null>(null);

  useEffect(() => {
    // First check URL (incoming from admin panel)
    const fromUrl = tryImpersonationFromUrl();
    setState(fromUrl || getImpersonation());
  }, []);

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ overflow: 'hidden' }}
        >
          <Box sx={{
            background: 'linear-gradient(90deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.08) 100%)',
            borderBottom: '1px solid rgba(239,68,68,0.3)',
            px: 4, py: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 200,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 2, background: 'rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <VisibilityRoundedIcon sx={{ fontSize: 18, color: '#EF4444' }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#FCA5A5', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', lineHeight: 1 }}>
                  Режим имперсонации
                </Typography>
                <Typography variant="body2" sx={{ color: '#F1F5F9', fontSize: 13 }}>
                  Вы просматриваете портал от имени агента <b>{state.agentName}</b>
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              variant="contained"
              startIcon={<LogoutRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={exitImpersonation}
              sx={{
                background: '#EF4444',
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                '&:hover': { background: '#DC2626', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }
              }}
            >
              Выйти из режима
            </Button>
          </Box>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
