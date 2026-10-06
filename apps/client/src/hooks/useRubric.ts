import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';
import { rubricService } from '../services/rubricService';
import type { RubricRemovalCheck, RubricView, UpsertRubric } from '../types/rubric';

const NO_GROUP_ERROR = 'No se pudo identificar el grupo';

export const useRubric = (groupId: number) => {
  const [view, setView] = useState<RubricView | null>(null);
  const [loading, setLoading] = useState(true);
  // Se guarda el ApiError completo (y no solo su mensaje) para poder distinguir
  // un 403 de grupo ajeno de un 404 o de un fallo de conexión.
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRubric = useCallback(async () => {
    if (!Number.isInteger(groupId) || groupId <= 0) {
      setView(null);
      setError(new ApiError(400, NO_GROUP_ERROR));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setView(await rubricService.getByGroup(groupId));
    } catch (caught) {
      setView(null);
      setError(
        caught instanceof ApiError ? caught : new ApiError(500, 'No se pudo cargar la rúbrica')
      );
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchRubric();
  }, [fetchRubric]);

  // El guardado propaga el error para que la página pueda marcar los ítems
  // inválidos que reporte el servidor.
  const saveRubric = async (data: UpsertRubric) => {
    setSaving(true);
    try {
      const saved = await rubricService.save(groupId, data);
      setView(saved);
      return saved;
    } finally {
      setSaving(false);
    }
  };

  // Cuántas notas se perderían al quitar un ítem ya guardado. Es una consulta de
  // solo lectura: la eliminación real sigue aplicando al guardar, y el servidor la
  // vuelve a medir.
  const getRemovalImpact = useCallback(
    async (itemId: number): Promise<RubricRemovalCheck> => rubricService.getItemRemovalImpact(groupId, itemId),
    [groupId]
  );

  return {
    view,
    loading,
    error,
    saving,
    isForbidden: error?.status === 403,
    saveRubric,
    getRemovalImpact,
    refetch: fetchRubric,
  };
};