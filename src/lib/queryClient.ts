import { QueryClient } from '@tanstack/react-query';

// Слой данных портала. apiClient уже ретраит холодный старт Render внутри себя,
// поэтому здесь retry минимальный (чтобы не множить попытки).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // данные «свежие» 1 мин → возврат на страницу без рефетча
      gcTime: 5 * 60_000,          // держим в кэше 5 мин после ухода со страницы
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
