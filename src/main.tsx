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
// Успешно загрузились — снимаем флаг, чтобы следующий деплой тоже мог перезагрузить.
window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_FLAG));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Регистрируем service worker для Web Push (no-op если браузер не умеет).
registerServiceWorker()
