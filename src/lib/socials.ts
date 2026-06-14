// Нормализация соцсетей агента — единый источник правды для ввода и рендера ссылок.

// VK: профиль — https://vk.com/<username>. Принимаем @x, x, vk.com/x, m.vk.com/x,
// полную ссылку → возвращаем чистый username.
export function vkName(raw?: string | null): string {
  return String(raw || '').trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(m\.)?vk\.com\//i, '')
    .replace(/^@+/, '')
    .replace(/^\/+/, '')
    .replace(/[/?#].*$/, '');
}
export const vkUrl = (raw?: string | null): string => `https://vk.com/${vkName(raw)}`;

// MAX: ссылка на профиль — https://max.ru/u/<token>. Принимаем полную ссылку,
// max.ru/u/<token>, u/<token> или голый токен → возвращаем токен.
export function maxToken(raw?: string | null): string {
  return String(raw || '').trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^max\.ru\//i, '')
    .replace(/^u\//i, '')
    .replace(/^@+/, '')
    .replace(/^\/+/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}
export const maxUrl = (raw?: string | null): string => `https://max.ru/u/${maxToken(raw)}`;
