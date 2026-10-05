// apps/client/src/hooks/useGroups.ts
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { groupService } from '../services/groupService';
import type {
  CreateGroupDTO,
  GroupListItem,
  GroupStatus,
  UpdateGroupDTO,
} from '../types/group';

export const useGroups = (idCurso: number) => {
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
      setGrupos(await groupService.listByCurso(idCurso));
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
    const created = await groupService.create(data);
    await fetchGrupos();
    return created;
  };

  const updateGroup = async (id: number, data: UpdateGroupDTO) => {
    const updated = await groupService.update(id, data);
    await fetchGrupos();
    return updated;
  };

  const deleteGroup = async (id: number) => {
    await groupService.remove(id);
    await fetchGrupos();
  };

  const cambiarEstado = async (id: number, estado: GroupStatus) => {
    const updated = await groupService.cambiarEstado(id, estado);
    await fetchGrupos();
    return updated;
  };

  return {
    grupos,
    loading,
    error,
    addGrupo,
    updateGroup,
    deleteGroup,
    cambiarEstado,
    refetch: fetchGrupos,
  };
};
