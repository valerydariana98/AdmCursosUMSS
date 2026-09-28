// apps/client/src/hooks/useGrupos.ts
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { grupoService } from '../services/grupoService';
import type { CreateGroupDTO, GroupListItem, UpdateGroupDTO } from '../types/group';

export const useGrupos = (idCurso: number) => {
  const [grupos, setGrupos] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrupos = useCallback(async () => {
    if (!Number.isInteger(idCurso) || idCurso <= 0) {
      setGrupos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setGrupos(await grupoService.listByCurso(idCurso));
    } catch (caught) {
      setGrupos([]);
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar los grupos'
      );
    } finally {
      setLoading(false);
    }
  }, [idCurso]);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  const addGrupo = async (data: CreateGroupDTO) => {
    const created = await grupoService.create(data);
    await fetchGrupos();
    return created;
  };

  const updateGrupo = async (id: number, data: UpdateGroupDTO) => {
    const updated = await grupoService.update(id, data);
    await fetchGrupos();
    return updated;
  };

  return { grupos, loading, error, addGrupo, updateGrupo, refetch: fetchGrupos };
};
