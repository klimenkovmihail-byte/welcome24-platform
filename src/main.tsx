import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './push'

// После деплоя Vercel меняет хэши чанков → старый index.html ссылается на
// удалённый чанк, lazy-import падает с ChunkLoadError и экран белеет.
// Лечим авто-перезагрузкой (один раз, чтобы не зациклить).
const isChunkError = (msg?: string) =>
  !!msg && (/ChunkLoadError/i.test(msg)
    || /Failed to fetch dynamically imported module/i.test(msg)
    || /error loading dynamically imported module/i.test(msg)
    || /Importing a module script failed/i.test(msg));
const RELOAD_FLAG = 'w24_chunk_reloaded';
function reloadOnce() {
  if (sessionStorage.getItem(RELOAD_FLAG)) return;
  sessionStorage.setItem(RELOAD_FLAG, '1');
  window.location.reload();
}
window.addEventListener('error', e => { if (isChunkError(e?.message)) reloadOnce(); });
window.addEventListener('unhandledrejection', e => {
  const m = (e?.reason && (e.reason.message || String(e.reason))) || '';
  if (isChunkError(m)) reloadOnce();
});
// Снимаем флаг ТОЛЬКО после стабильной работы (а не на каждый 'load'):
// если битый чанк падает сразу при загрузке, 'load' успел бы снять флаг ДО
// ошибки → reloadOnce срабатывал бы снова и снова = бесконечный цикл перезагрузок.
// 8 сек без падений = загрузка удалась, разрешаем будущие авто-перезагрузки.
setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 8000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Регистрируем service worker для Web Push (no-op если браузер не умеет).
registerServiceWorker()
