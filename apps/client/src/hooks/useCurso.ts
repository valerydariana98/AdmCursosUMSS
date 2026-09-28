// apps/client/src/hooks/useCurso.ts
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { courseService } from '../services/courseService';
import type { Course } from '../types/course';

export const useCurso = (idCurso: number) => {
  const [curso, setCurso] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurso = useCallback(async () => {
    if (!Number.isInteger(idCurso) || idCurso <= 0) {
      setCurso(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setCurso(await courseService.getById(idCurso));
    } catch (caught) {
      setCurso(null);
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo cargar el curso'
      );
    } finally {
      setLoading(false);
    }
  }, [idCurso]);

  useEffect(() => {
    fetchCurso();
  }, [fetchCurso]);

  return { curso, loading, error, refetch: fetchCurso };
};
