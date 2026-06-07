// URL превью выводится из URL фото по той же схеме, что на бэке
// (helpers/images.js → thumbKey): .../RND.png → .../RND_thumb.webp.
// Только для картинок на нашем Object Storage; внешние/base64 — как есть.
const STORAGE_HOST = 'storage.yandexcloud.net';

export function thumbUrl(url?: string | null): string | null {
  if (!url) return null;
  if (!url.includes(STORAGE_HOST)) return url;     // внешние/data: — без изменений
  if (url.includes('_thumb.webp')) return url;     // уже превью
  const [base] = url.split('?');
  return base.replace(/\.[^./]+$/, '') + '_thumb.webp';
}

// 16:9 превью обложек (covers/...): .../RND.png → .../RND_thumb16.webp.
// Отдельный ключ от квадратного _thumb.webp — чтобы обложки не обрезались в квадрат.
export function coverThumbUrl(url?: string | null): string | null {
  if (!url) return null;
  if (!url.includes(STORAGE_HOST)) return url;
  if (url.includes('_thumb16.webp')) return url;
  const [base] = url.split('?');
  return base.replace(/\.[^./]+$/, '') + '_thumb16.webp';
}
