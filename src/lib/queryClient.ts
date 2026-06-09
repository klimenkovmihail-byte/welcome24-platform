import { QueryClient } from '@tanstack/react-query';

// Слой данных портала. apiClient уже сам ретраит GET до 5 раз (сеть/таймаут/5xx),
// поэтому здесь retry: 0 — иначе попытки перемножаются (5×2 = до 10 запросов
// на один query при недоступном бэке).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // данные «свежие» 1 мин → возврат на страницу без рефетча
      gcTime: 5 * 60_000,          // держим в кэше 5 мин после ухода со страницы
      retry: 0,
      refetchOnWindowFocus: false,
    },
  },
});
