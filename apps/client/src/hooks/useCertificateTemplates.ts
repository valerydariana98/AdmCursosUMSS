// apps/client/src/hooks/useCertificateTemplates.ts
// Listado de plantillas de certificado con el filtro jerárquico curso → grupo
// (HU-01).
//
// El filtro de grupo se reinicia cada vez que cambia el curso: un grupo del
// curso anterior ya no existe dentro del nuevo, y dejarlo puesto haría que el
// listado mostrara "sin resultados" sin motivo aparente.

import { useCallback, useEffect, useState } from 'react';
import type { PlantillaListItem } from 'shared';
import { ApiError } from '../services/api';
import { certificateService } from '../services/certificateService';

export const useCertificateTemplates = () => {
  const [cursoId, setCursoIdState] = useState<number | null>(null);
  const [grupoId, setGrupoIdState] = useState<number | null>(null);
  const [plantillas, setPlantillas] = useState<PlantillaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setCursoId = useCallback((next: number | null) => {
    setCursoIdState(next);
    setGrupoIdState(null);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setPlantillas(await certificateService.list({ cursoId, grupoId }));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudieron cargar las plantillas'
      );
    } finally {
      setLoading(false);
    }
  }, [cursoId, grupoId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    plantillas,
    loading,
    error,
    cursoId,
    grupoId,
    setCursoId,
    setGrupoId: setGrupoIdState,
    refetch: fetchTemplates,
  };
};