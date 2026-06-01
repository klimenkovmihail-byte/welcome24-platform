import { useState } from 'react';
import { Box, Tabs, Tab, Stack, Typography } from '@mui/material';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import Cases from './Cases';
import { AdSimpleRequestsTab, AdPackagesTab } from './AdRequests';

const GOLD = '#C9A84C';

/**
 * Единый раздел «Заявки» в портале агента: заявки специалистам (юрист/брокер) +
 * реклама объектов + сбор пакета — под одним пунктом меню, в три вкладки.
 * initialTab позволяет deep-link'ам из пушей открывать нужную вкладку.
 */
export default function Requests({ initialTab = 0 }: { initialTab?: number }) {
  const [tab, setTab] = useState(initialTab);
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <GavelRoundedIcon sx={{ color: GOLD, fontSize: 30 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F1F5F9' }}>Заявки</Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>Специалистам · реклама объектов · сбор пакета</Typography>
        </Box>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile
        sx={{ mb: 1, '& .MuiTab-root': { color: '#94A3B8', fontWeight: 700, textTransform: 'none' }, '& .Mui-selected': { color: GOLD + ' !important' }, '& .MuiTabs-indicator': { background: GOLD } }}>
        <Tab label="Специалистам" />
        <Tab label="Реклама объектов" />
        <Tab label="Сбор пакета" />
      </Tabs>

      {tab === 0 && <Cases />}
      {tab === 1 && <AdSimpleRequestsTab />}
      {tab === 2 && <AdPackagesTab />}
    </Box>
  );
}
