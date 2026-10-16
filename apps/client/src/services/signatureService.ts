// apps/client/src/services/signatureService.ts
// Comunicación con el repositorio de firmas (HU-03).

import type { FirmaListItem } from 'shared';
import { api } from './api';
import { urlImagen } from './certificateService';

export const signatureService = {
  list(): Promise<FirmaListItem[]> {
    return api.get<FirmaListItem[]>('/api/certificados/firmas');
  },

  /**
   * Sube la firma. El nombre viaja en `multipart` junto con el archivo porque el
   * servidor necesita ambos para decidir el nombre del WebP guardado y el texto
   * que verá el docente en la galería.
   */
  create(nombre: string, archivo: File): Promise<FirmaListItem> {
    const formData = new FormData();

    formData.append('nombre', nombre);
    formData.append('firma', archivo);

    return api.postForm<FirmaListItem>('/api/certificados/firmas', formData);
  },

  rename(id: number, nombre: string): Promise<FirmaListItem> {
    return api.put<FirmaListItem>(`/api/certificados/firmas/${id}`, { nombre });
  },

  remove(id: number): Promise<void> {
    return api.delete<void>(`/api/certificados/firmas/${id}`);
  },
};

export { urlImagen };