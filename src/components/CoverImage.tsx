/**
 * CoverImage — обёртка над <img>, которая при пустом src или ошибке загрузки
 * показывает градиентный плейсхолдер с иконкой вместо ломаной картинки + alt-текста.
 *
 * Используется в карточках новостей, вебинаров, курсов — везде где cover_url может
 * быть пустой строкой или ссылкой на сторонний хост (где может стоять hotlink-protection).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';

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
}

export default function CoverImage({
  src, alt, sx, accentColor = '#C9A84C', placeholderIcon, overlay,
}: Props) {
  const hasSrc = !!src && src.trim() !== '';
  const [errored, setErrored] = useState(false);
  useEffect(() => { setErrored(false); }, [src]);

  const showImage = hasSrc && !errored;

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
        <Box
          component="img"
          src={src as string}
          // alt пустой — браузер ничего не покажет если src сломается. onError ниже подменит на плейсхолдер.
          alt=""
          loading="lazy"
          onError={() => setErrored(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
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
