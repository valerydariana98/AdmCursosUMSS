// apps/client/src/hooks/useSignatures.ts
// Repositorio de firmas (HU-03).
//
// El hook expone también `eliminar` captureando el 409 de "firma en uso": en ese
// caso no es un fallo de la operación sino una respuesta con información (qué
// plantillas la usan), y el mensaje se muestra tal cual.

import { useCallback, useEffect, useState } from 'react';
import type { FirmaListItem } from 'shared';
import { ApiError } from '../services/api';
import { signatureService } from '../services/signatureService';

export interface ErrorFirmaEnUso {
  message: string;
  plantillas: string[];
}

export const useSignatures = () => {
  const [firmas, setFirmas] = useState<FirmaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const fetchSignatures = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setFirmas(await signatureService.list());
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudieron cargar las firmas'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  const crear = useCallback(
    async (nombre: string, archivo: File) => {
      setGuardando(true);
      setError(null);

      try {
        const firma = await signatureService.create(nombre, archivo);
        setFirmas((anteriores) => [...anteriores, firma].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        return { ok: true as const };
      } catch (caught) {
        setError(
          caught instanceof ApiError ? caught.message : 'No se pudo subir la firma'
        );
        return { ok: false as const };
      } finally {
        setGuardando(false);
      }
    },
    []
  );

  const renombrar = useCallback(async (id: number, nombre: string) => {
    setError(null);

    try {
      const actualizada = await signatureService.rename(id, nombre);
      setFirmas((anteriores) =>
        anteriores
          .map((firma) => (firma.id === id ? actualizada : firma))
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      return { ok: true as const };
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo renombrar la firma'
      );
      return { ok: false as const };
    }
  }, []);

  const eliminar = useCallback(
    async (id: number): Promise<{ ok: true } | { ok: false; enUso?: ErrorFirmaEnUso }> => {
      setError(null);

      try {
        await signatureService.remove(id);
        setFirmas((anteriores) => anteriores.filter((firma) => firma.id !== id));
        return { ok: true };
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 409) {
          // El servidor responde 409 con la lista de plantillas afectadas. Se
          // devuelve como dato y no como error para que la vista pueda
          // mostrarla en el modal de confirmación.
          const plantillas = (caught.meta as { plantillas?: string[] } | null)?.plantillas ?? [];

          return { ok: false, enUso: { message: caught.message, plantillas } };
        }

        setError(
          caught instanceof ApiError ? caught.message : 'No se pudo eliminar la firma'
        );
        return { ok: false };
      }
    },
    []
  );

  return { firmas, loading, guardando, error, setError, crear, renombrar, eliminar, refetch: fetchSignatures };
};