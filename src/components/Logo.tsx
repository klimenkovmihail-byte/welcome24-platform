import { Box } from '@mui/material';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: number;
  color?: string;
  /** Премиальная золотая заливка с градиентом (имеет приоритет над color). */
  premium?: boolean;
}

const FULL_SRC = '/logo.svg';            // новый SVG логотип «корона + WELCOME 24»
const ICON_SRC = '/logo-icon.png';        // старая иконка (можно будет тоже на SVG позже)

// Реальное соотношение сторон SVG-логотипа (viewBox 3760×1280)
const FULL_ASPECT = 3760 / 1280;          // ≈ 2.94

// Премиальный золотой градиент.
const PREMIUM_GOLD_GRADIENT =
  'linear-gradient(135deg, #F4DA8E 0%, #E2C97E 25%, #C9A84C 50%, #A88634 75%, #8B6F1F 100%)';

export function LogoIcon({ size = 40, color = '#C9A84C', premium = false }: { size?: number; color?: string; premium?: boolean }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        background: premium ? PREMIUM_GOLD_GRADIENT : color,
        WebkitMaskImage: `url(${ICON_SRC})`,
        maskImage: `url(${ICON_SRC})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        flexShrink: 0,
        filter: premium ? 'drop-shadow(0 2px 8px rgba(201,168,76,0.35))' : undefined,
      }}
      aria-label="Welcome 24"
      role="img"
    />
  );
}

export default function Logo({ variant = 'full', size = 40, color = '#C9A84C', premium = false }: LogoProps) {
  if (variant === 'icon') {
    return <LogoIcon size={size} color={color} premium={premium} />;
  }

  // Full SVG логотип «корона + WELCOME 24».
  // Aspect = 2.94 → натуральная ширина = size * 2.94.
  const width = size * FULL_ASPECT;

  // Чёрный SVG → перекрашиваем через mask-image + фоновый цвет/градиент.
  // width задаёт желаемый размер, maxWidth:100% не даёт вылезти за узкий
  // контейнер (мобильный логин), aspectRatio держит пропорции при сжатии.
  return (
    <Box
      sx={{
        width,
        maxWidth: '100%',
        aspectRatio: String(FULL_ASPECT),
        background: premium ? PREMIUM_GOLD_GRADIENT : color,
        WebkitMaskImage: `url(${FULL_SRC})`,
        maskImage: `url(${FULL_SRC})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        flexShrink: 0,
        filter: premium ? 'drop-shadow(0 2px 8px rgba(201,168,76,0.35))' : undefined,
      }}
      aria-label="Welcome 24"
      role="img"
    />
  );
}
