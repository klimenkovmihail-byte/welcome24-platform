import { Box } from '@mui/material';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: number;
  color?: string;
  /** Премиальная золотая заливка с градиентом (имеет приоритет над color). */
  premium?: boolean;
}

// Премиальный золотой градиент — для логотипов и акцентных элементов.
const PREMIUM_GOLD_GRADIENT =
  'linear-gradient(135deg, #F4DA8E 0%, #E2C97E 25%, #C9A84C 50%, #A88634 75%, #8B6F1F 100%)';

const ICON_SRC = '/logo-icon.png';
const FULL_SRC = '/logo-full.png';

export function LogoIcon({ size = 40, color = '#C9A84C' }: { size?: number; color?: string }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${ICON_SRC})`,
        maskImage: `url(${ICON_SRC})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        flexShrink: 0,
      }}
      aria-label="Welcome 24"
      role="img"
    />
  );
}

export default function Logo({ variant = 'full', size = 40, color = '#C9A84C', premium = false }: LogoProps) {
  const src = variant === 'full' ? FULL_SRC : ICON_SRC;
  const aspect = variant === 'full' ? 3.89 : 1;
  const isWhite = !premium && (color === '#F1F5F9' || color === '#fff' || color === 'white');

  // Белый — оставляем как обычный <img>: природные пропорции PNG, никаких mask-хаков.
  if (isWhite) {
    return (
      <Box
        component="img"
        src={src}
        alt="Welcome 24"
        sx={{
          height: size,
          width: 'auto',
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  }

  // premium = премиальный золотой градиент с лёгким shine-эффектом и тенью.
  // обычный color = ровная заливка через mask-image.
  return (
    <Box
      sx={{
        position: 'relative',
        height: size,
        width: size * aspect,
        background: premium ? PREMIUM_GOLD_GRADIENT : color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        flexShrink: 0,
        // Лёгкое золотое свечение под логотипом — только в премиум-режиме
        filter: premium ? 'drop-shadow(0 2px 8px rgba(201,168,76,0.35))' : undefined,
      }}
      aria-label="Welcome 24"
      role="img"
    />
  );
}
