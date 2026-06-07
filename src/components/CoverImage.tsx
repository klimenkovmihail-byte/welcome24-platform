/**
 * CoverImage — обёртка над <img>, которая при пустом src или ошибке загрузки
 * показывает градиентный плейсхолдер с иконкой вместо ломаной картинки + alt-текста.
 *
 * preferThumb: сначала грузим лёгкое webp-превью (utils/thumb), а если его нет
 * (старые обложки без сгенерированного превью → 404) — откатываемся на оригинал,
 * и только потом на плейсхолдер. Так быстрые превью не «съедают» старые картинки.
 *
 * Используется в карточках новостей, вебинаров, курсов — везде где cover_url может
 * быть пустой строкой или ссылкой на сторонний хост (где может стоять hotlink-protection).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import { thumbUrl } from '../utils/thumb';

interface Props {
  src: string | null | undefined;
  alt?: string;                       // НЕ передаётся в <img>, чтобы не светить как fallback-текст
  sx?: SxProps<Theme>;
  /** Цвет градиента-плейсхолдера. По умолчанию золотой. */
  accentColor?: string;
  /** Какую иконку показывать в плейсхолдере. По умолчанию ImageRounded. */
  placeholderIcon?: ReactNode;
  /** Дополнительный overlay поверх изображения (например, градиент для текста снизу). */
  overlay?: ReactNode;
  /** Сначала грузить webp-превью, при 404 — откат на оригинал. Для карточек/сеток. */
  preferThumb?: boolean;
  /** objectFit картинки. cover (по умолч.) заполняет с обрезкой; contain вписывает целиком. */
  fit?: 'cover' | 'contain';
}

export default function CoverImage({
  src, alt, sx, accentColor = '#C9A84C', placeholderIcon, overlay, preferThumb, fit = 'cover',
}: Props) {
  const hasSrc = !!src && src.trim() !== '';
  // Стадия загрузки: thumb (превью) → full (оригинал) → error (плейсхолдер).
  const [stage, setStage] = useState<'thumb' | 'full' | 'error'>(preferThumb ? 'thumb' : 'full');
  useEffect(() => { setStage(preferThumb ? 'thumb' : 'full'); }, [src, preferThumb]);

  const showImage = hasSrc && stage !== 'error';
  const imgSrc = stage === 'thumb' ? (thumbUrl(src) || src) : src;

  const handleError = () => {
    // thumb не загрузился → пробуем оригинал; оригинал не загрузился → плейсхолдер.
    setStage(s => (s === 'thumb' ? 'full' : 'error'));
  };

  return (
    <Box sx={{
      position: 'absolute', inset: 0,
      background: showImage
        ? 'transparent'
        : `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}08 50%, rgba(15,22,41,0.95) 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...sx,
    }}>
      {showImage ? (
        <>
          {/* Размытый фон-заполнитель: при contain поля вокруг картинки не пустые,
              а заполнены размытой версией самой обложки — баннеры видны целиком,
              карточка выглядит «заполненной», ничего не обрезано. */}
          {fit === 'contain' && (
            <Box aria-hidden sx={{
              position: 'absolute', inset: 0,
              backgroundImage: `url("${imgSrc}")`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'blur(22px)', transform: 'scale(1.18)', opacity: 0.5,
            }} />
          )}
          <Box
            component="img"
            src={imgSrc as string}
            // alt пустой — браузер ничего не покажет если src сломается. onError ниже подменит.
            alt=""
            loading="lazy"
            onError={handleError}
            sx={{ position: 'relative', width: '100%', height: '100%', objectFit: fit, display: 'block' }}
          />
        </>
      ) : (
        <Box sx={{
          color: accentColor, opacity: 0.35,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48,
        }}>
          {placeholderIcon ?? <ImageRoundedIcon fontSize="inherit" />}
        </Box>
      )}
      {/* alt-prop оставляем как aria-label если нужен, без визуального fallback */}
      {alt && <Box sx={{ position: 'absolute', clip: 'rect(0 0 0 0)', width: 1, height: 1, overflow: 'hidden' }}>{alt}</Box>}
      {overlay}
    </Box>
  );
}
