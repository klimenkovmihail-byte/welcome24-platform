import { Box } from '@mui/material';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: number;
  color?: string;
  /** Премиальная золотая заливка с градиентом (имеет приоритет над color). */
  premium?: boolean;
}

const ICON_SRC = '/logo-icon.png';

// Премиальный золотой градиент.
const PREMIUM_GOLD_GRADIENT =
  'linear-gradient(135deg, #F4DA8E 0%, #E2C97E 25%, #C9A84C 50%, #A88634 75%, #8B6F1F 100%)';

/**
 * Иконка-«корона» Welcome 24 (3 пика) — рендерится из inline SVG, без зависимостей.
 * Центрируется автоматически в родителе. Поддерживает premium / color.
 */
export function LogoIcon({ size = 40, color = '#C9A84C', premium = false }: { size?: number; color?: string; premium?: boolean }) {
  const fill = premium ? PREMIUM_GOLD_GRADIENT : color;
  return (
    <Box
      sx={{
        width: size,
        height: size,
        background: fill,
        WebkitMaskImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><polygon points='10,55 20,15 30,55'/><polygon points='25,55 30,5 35,55'/><polygon points='30,55 40,15 50,55'/></svg>")`,
        maskImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><polygon points='10,55 20,15 30,55'/><polygon points='25,55 30,5 35,55'/><polygon points='30,55 40,15 50,55'/></svg>")`,
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

/**
 * Полный лого «корона + WELCOME 24» — собран из inline SVG-короны (3 пика)
 * + текстового WELCOME 24 с премиальным золотым градиентом. Никаких PNG-проблем
 * с неровным позиционированием.
 */
export default function Logo({ variant = 'full', size = 40, color = '#C9A84C', premium = false }: LogoProps) {
  if (variant === 'icon') {
    return <LogoIcon size={size} color={color} premium={premium} />;
  }

  // size — высота всей композиции. Корона занимает ~40%, текст ~50%, gap 10%.
  const crownH = Math.round(size * 0.4);
  const textH  = Math.round(size * 0.5);
  const fontSize = Math.round(textH * 0.92);

  // Цвет/градиент для текста: premium — золотой градиент через background-clip
  const textStyle = premium
    ? {
        background: PREMIUM_GOLD_GRADIENT,
        WebkitBackgroundClip: 'text' as const,
        backgroundClip: 'text' as const,
        WebkitTextFillColor: 'transparent' as const,
        color: 'transparent',
        textShadow: 'none',
        filter: 'drop-shadow(0 2px 6px rgba(201,168,76,0.25))',
      }
    : { color };

  // Цвет/градиент для короны
  const crownFill = premium ? PREMIUM_GOLD_GRADIENT : color;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${Math.round(size * 0.05)}px`,
        lineHeight: 1,
      }}
      aria-label="Welcome 24"
      role="img"
    >
      {/* Корона — 3 «пика» из SVG, идеально центрируются flexbox */}
      <Box
        sx={{
          width: crownH * 1.5,
          height: crownH,
          background: crownFill,
          WebkitMaskImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40'><polygon points='8,38 18,8 28,38'/><polygon points='22,38 30,2 38,38'/><polygon points='32,38 42,8 52,38'/></svg>")`,
          maskImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40'><polygon points='8,38 18,8 28,38'/><polygon points='22,38 30,2 38,38'/><polygon points='32,38 42,8 52,38'/></svg>")`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          filter: premium ? 'drop-shadow(0 2px 8px rgba(201,168,76,0.35))' : undefined,
        }}
      />
      {/* WELCOME 24 — текст со строгой типографикой */}
      <Box
        sx={{
          ...textStyle,
          fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
          fontWeight: 900,
          fontSize,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        WELCOME&nbsp;24
      </Box>
    </Box>
  );
}

// Экспортируем для использования в favicon / SEO meta (если понадобится)
export { ICON_SRC };
