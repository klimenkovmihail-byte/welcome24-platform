// Универсальные форматтеры денег и чисел.

/**
 * Деньги для отображения в UI:
 * - до 1 000 000 — полная сумма с пробелами: «14 088 ₽», «250 ₽»
 * - 1М и выше    — компактно: «1.5 млн ₽», «12.3 млн ₽»
 * - 1 млрд+      — «1.5 млрд ₽»
 */
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '0 ₽';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} млрд ₽`;
  if (abs >= 1_000_000)     return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн ₽`;
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

/** Компактный формат без знака валюты — для коротких лейблов: «12.3 млн», «14 088», «250». */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')} млрд`;
  if (abs >= 1_000_000)     return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн`;
  if (abs >= 1_000)         return Math.round(n).toLocaleString('ru-RU');
  return String(Math.round(n));
}
