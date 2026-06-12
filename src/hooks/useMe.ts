import { useQuery } from '@tanstack/react-query';
import { getCurrentAgent, refreshUser } from '../auth/auth';

/**
 * Живой текущий агент (уровень/фото/имя) через react-query.
 *
 * Раньше Sidebar/Header читали статический снимок getCurrentAgent() из localStorage
 * и не перерисовывались — уровень и фото обновлялись только после перелогина.
 * Теперь снимок показывается мгновенно (initialData), но при монтировании и фокусе
 * вкладки данные подтягиваются с /api/auth/me (refreshUser обновляет и localStorage).
 * После сохранения профиля инвалидируйте queryKey ['me'].
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => refreshUser(),
    initialData: () => getCurrentAgent(),
    initialDataUpdatedAt: 0, // снимок сразу, но считаем устаревшим → рефетч при монтировании
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
