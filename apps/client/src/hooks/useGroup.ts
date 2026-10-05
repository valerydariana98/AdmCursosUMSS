// apps/client/src/hooks/useGroup.ts
import { useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { groupService } from '../services/groupService';
import type { Group } from '../types/group';

export const useGroup = (id: number) => {
  const [grupo, setGrupo] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setGrupo(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    groupService
      .getById(id)
      .then((result) => {
        if (!cancelled) setGrupo(result);
      })
      .catch((caught) => {
        if (cancelled) return;
        setGrupo(null);
        setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el grupo');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { grupo, loading, error };
};
