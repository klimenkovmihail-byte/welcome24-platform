/**
 * VideoPlayer — универсальный плеер для уроков курсов и записей вебинаров.
 *
 * Понимает форматы URL:
 *   - Kinescope:  https://kinescope.io/{id}, https://kinescope.io/embed/{id}, https://kinescope.app/{id}
 *   - YouTube:    https://youtube.com/watch?v={id}, https://youtu.be/{id}, https://www.youtube.com/embed/{id}
 *   - Прямой mp4/webm/mov (по расширению) → нативный <video>
 *   - Пусто/неизвестно → заглушка с иконкой
 *
 * Если src — Kinescope embed, передаём query `?autoplay=0`, остальные параметры
 * (постер, watermark) настраиваются в самом Kinescope-кабинете.
 */

import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import VideocamOffRoundedIcon from '@mui/icons-material/VideocamOffRounded';

interface Props {
  src: string | null | undefined;
  /** Постер если хотим показать обложку до загрузки (для прямых mp4). */
  poster?: string | null;
  /** sx применяется к корневому Box (aspect-ratio контейнеру). */
  height?: number | string;
}

type Source =
  | { kind: 'kinescope'; id: string }
  | { kind: 'youtube'; id: string }
  | { kind: 'direct'; url: string }
  | { kind: 'empty' }
  | { kind: 'unknown'; url: string };

function detectSource(src: string | null | undefined): Source {
  if (!src || !src.trim()) return { kind: 'empty' };
  const url = src.trim();

  // Kinescope
  const ks = url.match(/^https?:\/\/(?:www\.)?kinescope\.(?:io|app)\/(?:embed\/)?([A-Za-z0-9_-]+)/i);
  if (ks) return { kind: 'kinescope', id: ks[1] };

  // YouTube
  const yt1 = url.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{6,})/i);
  if (yt1) return { kind: 'youtube', id: yt1[1] };
  const yt2 = url.match(/^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (yt2) return { kind: 'youtube', id: yt2[1] };
  const yt3 = url.match(/^https?:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i);
  if (yt3) return { kind: 'youtube', id: yt3[1] };

  // Direct video file
  if (/\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url)) {
    return { kind: 'direct', url };
  }

  return { kind: 'unknown', url };
}

export default function VideoPlayer({ src, poster, height }: Props) {
  const source = useMemo(() => detectSource(src), [src]);

  // Общий стиль контейнера 16:9
  const aspectBox = {
    position: 'relative' as const,
    width: '100%',
    paddingTop: height ? undefined : '56.25%',
    height: height ?? undefined,
    background: '#000',
    overflow: 'hidden',
  };

  if (source.kind === 'kinescope') {
    return (
      <Box sx={aspectBox}>
        <Box
          component="iframe"
          src={`https://kinescope.io/embed/${source.id}`}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          sx={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            border: 'none',
          }}
        />
      </Box>
    );
  }

  if (source.kind === 'youtube') {
    return (
      <Box sx={aspectBox}>
        <Box
          component="iframe"
          src={`https://www.youtube.com/embed/${source.id}?rel=0&modestbranding=1`}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </Box>
    );
  }

  if (source.kind === 'direct') {
    return (
      <Box sx={aspectBox}>
        <Box
          component="video"
          src={source.url}
          poster={poster || undefined}
          controls
          preload="metadata"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </Box>
    );
  }

  // unknown — пробуем как iframe, но без гарантий (бывают платформы которые блокируют embed)
  if (source.kind === 'unknown') {
    return (
      <Box sx={aspectBox}>
        <Box
          component="iframe"
          src={source.url}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
        <Box sx={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.7)', color: '#94A3B8',
          fontSize: 10, px: 1, py: 0.5, borderRadius: 1,
          pointerEvents: 'none',
        }}>
          неизвестный источник
        </Box>
      </Box>
    );
  }

  // empty
  return (
    <Box sx={{ ...aspectBox, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(67,97,238,0.15), rgba(15,22,41,0.95))' }}>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#475569',
      }}>
        {poster ? (
          // Если есть постер — используем его и сверху ставим иконку
          <>
            <Box component="img" src={poster} alt=""
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
            <PlayCircleRoundedIcon sx={{ fontSize: 64, color: '#fff', opacity: 0.6, zIndex: 1 }} />
            <Typography variant="caption" sx={{ color: '#fff', opacity: 0.6, mt: 1, zIndex: 1 }}>
              видео ещё не загружено
            </Typography>
          </>
        ) : (
          <>
            <VideocamOffRoundedIcon sx={{ fontSize: 48, color: '#475569', mb: 1 }} />
            <Typography variant="caption" sx={{ color: '#64748B' }}>видео скоро появится</Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
