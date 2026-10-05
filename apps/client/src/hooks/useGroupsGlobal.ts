// apps/client/src/hooks/useGroupsGlobal.ts
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { groupService } from '../services/groupService';
import type { GroupListItem } from '../types/group';

export const useGroupsGlobal = () => {
  const [grupos, setGrupos] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrupos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setGrupos(await groupService.listByCurso());
    } catch (caught) {
      setGrupos([]);
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar los grupos'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  return { grupos, loading, error, refetch: fetchGrupos };
};
