// Человекочитаемая причина ошибки загрузки из ответа /api/upload.
// Бэкенд отдаёт { error } с понятным текстом (415 — тип файла, 413 — размер >25 МБ).
// Если файл больше лимита nginx — приходит не-JSON 413 → фолбэк по статусу.
export async function uploadErr(res: Response): Promise<string> {
  try {
    const e = await res.json();
    if (e?.error) return String(e.error);
  } catch { /* тело не JSON (напр. страница nginx 413) */ }
  if (res.status === 413) return 'Файл слишком большой — уменьшите размер или сожмите.';
  return `Не удалось загрузить файл (ошибка ${res.status}).`;
}
