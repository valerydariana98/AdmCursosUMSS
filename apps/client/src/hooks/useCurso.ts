// apps/client/src/hooks/useCurso.ts
import { useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { courseService } from '../services/courseService';
import type { Course } from '../types/course';

export const useCurso = (idCurso: number) => {
  const [curso, setCurso] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(idCurso) || idCurso <= 0) {
      setCurso(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    courseService
      .getById(idCurso)
      .then((result) => {
        if (!cancelled) setCurso(result);
      })
      .catch((caught) => {
        if (cancelled) return;
        setCurso(null);
        setError(
          caught instanceof ApiError ? caught.message : 'No se pudo cargar el curso'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idCurso]);

  return { curso, loading, error };
};
