/**
 * Docs — база знаний для агента (read-only).
 * Папки и файлы. Клик на папку → переход, клик на файл → открытие в новой вкладке.
 * PDF и картинки откроются inline в браузере, остальное скачается.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, IconButton, TextField, InputAdornment, Chip,
  Alert, CircularProgress,
} from '@mui/material';
import { PageSkeleton } from '../components/States';
import { motion } from 'framer-motion';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import FolderOpenRoundedIcon from '@mui/icons-material/FolderOpenRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import { docsApi, type DocItem, type Breadcrumb } from '../api/docs';

function fileIcon(item: DocItem) {
  const m = (item.mimeType || '').toLowerCase();
  const n = item.name.toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return { Icon: PictureAsPdfRoundedIcon, color: '#EF4444' };
  if (m.includes('image') || /\.(png|jpg|jpeg|webp|gif|svg)$/.test(n)) return { Icon: ImageRoundedIcon, color: '#06B6D4' };
  if (m.includes('word') || /\.(docx?|odt|rtf)$/.test(n)) return { Icon: DescriptionRoundedIcon, color: '#3B82F6' };
  if (m.includes('sheet') || m.includes('excel') || /\.(xlsx?|ods|csv)$/.test(n)) return { Icon: TableChartRoundedIcon, color: '#22C55E' };
  if (m.includes('video') || /\.(mp4|mov|webm|avi)$/.test(n)) return { Icon: MovieRoundedIcon, color: '#A855F7' };
  return { Icon: InsertDriveFileRoundedIcon, color: '#94A3B8' };
}

const fmtSize = (n: number) => {
  if (!n) return '';
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
};

export default function Docs() {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [items, setItems] = useState<DocItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [rootFolders, setRootFolders] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<DocItem[] | null>(null);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [list, crumbs, roots] = await Promise.all([
        docsApi.list(currentFolderId),
        currentFolderId ? docsApi.breadcrumbs(currentFolderId) : Promise.resolve([] as Breadcrumb[]),
        docsApi.list(null),
      ]);
      setItems(list);
      setBreadcrumbs(crumbs);
      setRootFolders(roots.filter(r => r.type === 'folder'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => { reload(); }, [reload]);

  // Счётчик поисков — защита от гонки: debounce чистит только таймер, а не
  // запущенный fetch. Без guard'а поздний ответ перетирал очищенный поиск
  // (результаты при пустой строке) или показывал не тот запрос.
  const searchSeqRef = useRef(0);
  useEffect(() => {
    if (search.trim().length < 2) { searchSeqRef.current++; setSearchResults(null); return; }
    const seq = ++searchSeqRef.current;
    const h = setTimeout(() => {
      docsApi.search(search.trim())
        .then(r => { if (searchSeqRef.current === seq) setSearchResults(r); })
        .catch(() => { if (searchSeqRef.current === seq) setSearchResults([]); });
    }, 300);
    return () => clearTimeout(h);
  }, [search]);

  const openItem = (item: DocItem) => {
    if (item.type === 'folder') {
      setCurrentFolderId(item.id);
      setSearch(''); setSearchResults(null);
    } else if (item.fileUrl) {
      window.open(item.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const visibleItems = searchResults !== null ? searchResults : items;

  return (
    <Box>
      {/* Поиск */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <TextField
          placeholder="Поиск документов…"
          value={search} onChange={e => setSearch(e.target.value)}
          size="small" sx={{ width: { xs: '100%', sm: 360 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ color: '#64748B', fontSize: 20 }} /></InputAdornment> } }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Breadcrumbs */}
      {searchResults === null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
          <IconButton size="small" onClick={() => setCurrentFolderId(null)} sx={{ color: currentFolderId === null ? '#C9A84C' : '#64748B' }}>
            <HomeRoundedIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ color: currentFolderId === null ? '#C9A84C' : '#94A3B8', fontWeight: currentFolderId === null ? 700 : 400, cursor: 'pointer' }}
            onClick={() => setCurrentFolderId(null)}>
            Все документы
          </Typography>
          {breadcrumbs.map((b, i) => (
            <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ChevronRightRoundedIcon sx={{ color: '#475569', fontSize: 16 }} />
              <Typography variant="caption"
                sx={{
                  color: i === breadcrumbs.length - 1 ? '#C9A84C' : '#94A3B8',
                  fontWeight: i === breadcrumbs.length - 1 ? 700 : 400,
                  cursor: i === breadcrumbs.length - 1 ? 'default' : 'pointer',
                }}
                onClick={() => i < breadcrumbs.length - 1 && setCurrentFolderId(b.id)}>
                {b.name}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {searchResults !== null && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`Результаты поиска: ${searchResults.length}`} size="small"
            sx={{ background: 'rgba(67,97,238,0.10)', color: '#4361EE', fontWeight: 700 }} />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Sidebar: корневые папки */}
        <Box sx={{ flexShrink: 0, width: 220, position: 'sticky', top: 16, display: { xs: 'none', md: 'block' } }}>
          <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', display: 'block', mb: 1, px: 1 }}>
            Категории
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            <Box
              onClick={() => setCurrentFolderId(null)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 2, cursor: 'pointer',
                background: currentFolderId === null ? 'rgba(201,168,76,0.10)' : 'transparent',
                color: currentFolderId === null ? '#C9A84C' : '#94A3B8',
                '&:hover': { background: 'rgba(201,168,76,0.06)' },
              }}
            >
              <HomeRoundedIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: currentFolderId === null ? 700 : 500 }}>Все документы</Typography>
            </Box>
            {rootFolders.map(f => (
              <Box key={f.id}
                onClick={() => setCurrentFolderId(f.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 2, cursor: 'pointer',
                  background: currentFolderId === f.id ? 'rgba(201,168,76,0.10)' : 'transparent',
                  color: currentFolderId === f.id ? '#C9A84C' : '#94A3B8',
                  '&:hover': { background: 'rgba(201,168,76,0.06)' },
                }}
              >
                <FolderRoundedIcon fontSize="small" sx={{ color: currentFolderId === f.id ? '#C9A84C' : '#64748B' }} />
                <Typography variant="body2" sx={{ fontWeight: currentFolderId === f.id ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Main grid */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <PageSkeleton />
          ) : visibleItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#64748B' }}>
              <FolderOpenRoundedIcon sx={{ fontSize: 48, color: '#334155', mb: 1 }} />
              <Typography variant="body2">
                {searchResults !== null ? 'Ничего не найдено' : 'Папка пуста.'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
              {visibleItems.map((item, i) => {
                const isFolder = item.type === 'folder';
                const { Icon, color } = isFolder ? { Icon: FolderRoundedIcon, color: '#C9A84C' } : fileIcon(item);
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <Box
                      onClick={() => openItem(item)}
                      sx={{
                        p: 2, borderRadius: 3, cursor: 'pointer',
                        background: 'linear-gradient(135deg, rgba(15,22,41,0.95), rgba(12,18,35,0.98))',
                        border: '1px solid rgba(201,168,76,0.08)',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: `${color}40`, transform: 'translateY(-2px)' },
                      }}
                    >
                      <Box sx={{ textAlign: 'center', mb: 1 }}>
                        <Icon sx={{ fontSize: 52, color }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#F1F5F9', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', textAlign: 'center', display: 'block', fontSize: 10 }}>
                        {isFolder ? 'папка' : fmtSize(item.fileSize) || 'файл'}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" sx={{ color: '#475569', textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 10, mt: 0.5 }}>
                          {item.description}
                        </Typography>
                      )}
                    </Box>
                  </motion.div>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
