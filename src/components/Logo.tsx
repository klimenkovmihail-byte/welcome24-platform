import { Box } from '@mui/material';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: number;
  color?: string;
}

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

export default function Logo({ variant = 'full', size = 40, color = '#C9A84C' }: LogoProps) {
  const src = variant === 'full' ? FULL_SRC : ICON_SRC;
  // Используем обычный <img>: естественные пропорции PNG (~3.89:1) сохраняются,
  // никаких пустых отступов. Перекраска делается через mix-blend-mode / filter
  // на основе того что исходный PNG — белая графика с прозрачностью.
  // Для color === '#F1F5F9' (белый) — отдаём без фильтра.
  // Для других цветов накладываем background-color + mask-image как раньше.
  const isWhite = color === '#F1F5F9' || color === '#fff' || color === 'white';

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

  // Для золотой/иной перекраски — через mask, но с правильной шириной
  return (
    <Box
      sx={{
        height: size,
        width: size * 3.89,
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
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
