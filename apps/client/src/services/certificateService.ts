// apps/client/src/services/certificateService.ts
// Comunicación con el módulo de certificados (HU-01, HU-02, HU-04).
//
// Ningún componente hace `fetch`: todo pasa por aquí, igual que el resto del
// proyecto.

import type {
  CertificateJob,
  CertificatePreview,
  CreatePlantilla,
  DuplicarPlantilla,
  PlantillaCertificadoView,
  PlantillaElementoInput,
  PlantillaListItem,
  UpdatePlantilla,
} from 'shared';
import { api } from './api';

/** URL absoluta de una imagen guardada en el servidor (fondo en WebP). */
const UPLOADS_PREFIX = import.meta.env.VITE_UPLOADS_URL_PREFIX ?? '/uploads';

export const urlImagen = (ruta: string | null | undefined): string | null =>
  ruta ? `${api.baseURL}${UPLOADS_PREFIX}/${ruta.replace(/^\/+/, '')}` : null;

export interface FiltrosPlantillas {
  cursoId?: number | null;
  grupoId?: number | null;
}

export const certificateService = {
  // ---- Plantillas ----

  list(filtros: FiltrosPlantillas = {}): Promise<PlantillaListItem[]> {
    const query = new URLSearchParams();

    if (filtros.cursoId) query.set('cursoId', String(filtros.cursoId));
    if (filtros.grupoId) query.set('grupoId', String(filtros.grupoId));

    const search = query.toString();

    return api.get<PlantillaListItem[]>(`/api/certificados/plantillas${search ? `?${search}` : ''}`);
  },

  get(id: number): Promise<PlantillaCertificadoView> {
    return api.get<PlantillaCertificadoView>(`/api/certificados/plantillas/${id}`);
  },

  /**
   * Crea la plantilla enviando el fondo y los elementos en el mismo formulario.
   * Van juntos porque el servidor no puede aceptar una plantilla sin su imagen:
   * separarlos abriría la puerta a registros huérfanos.
   */
  create(
    datos: Omit<CreatePlantilla, 'elementos'> & { elementos: PlantillaElementoInput[] },
    fondo: File
  ): Promise<{ id: number }> {
    const formData = new FormData();

    formData.append('nombre', datos.nombre);
    formData.append('idCurso', String(datos.idCurso));
    formData.append('idGrupo', datos.idGrupo === null ? '' : String(datos.idGrupo));
    // El servidor vuelve a leer el tamaño real de la imagen: estos valores solo
    // se mandan para que el payload tenga la forma completa.
    formData.append('ancho', String(datos.ancho));
    formData.append('alto', String(datos.alto));
    formData.append('elementos', JSON.stringify(datos.elementos));
    formData.append('fondo', fondo);

    return api.postForm<{ id: number }>('/api/certificados/plantillas', formData);
  },

  // La imagen de fondo no se reemplaza al editar: cambiarla invalidaría todas las
  // posiciones ya ajustadas, así que la actualización solo lleva nombre y
  // elementos.
  update(id: number, datos: UpdatePlantilla): Promise<{ id: number }> {
    return api.put<{ id: number }>(`/api/certificados/plantillas/${id}`, datos);
  },

  remove(id: number): Promise<void> {
    return api.delete<void>(`/api/certificados/plantillas/${id}`);
  },

  duplicate(id: number, datos: DuplicarPlantilla = {}): Promise<{ id: number; nombre: string }> {
    return api.post<{ id: number; nombre: string }>(
      `/api/certificados/plantillas/${id}/duplicar`,
      datos
    );
  },

  // ---- Generación (HU-04) ----

  preview(grupoId: number): Promise<CertificatePreview> {
    return api.get<CertificatePreview>(`/api/certificados/generar/previa?grupoId=${grupoId}`);
  },

  start(grupoId: number): Promise<{ jobId: string; total: number; aprobados: number }> {
    return api.post<{ jobId: string; total: number; aprobados: number }>('/api/certificados/generar', {
      grupoId,
    });
  },

  job(jobId: string): Promise<CertificateJob> {
    return api.get<CertificateJob>(`/api/certificados/generar/${jobId}`);
  },

  /**
   * Descarga el ZIP. El nombre lo pone el servidor en `Content-Disposition`, para
   * que el archivo se llame como el grupo al que corresponde y no con un nombre
   * genérico inventado en el cliente.
   */
  downloadZip(jobId: string): Promise<{ blob: Blob; nombre: string }> {
    return api.download(
      `/api/certificados/generar/${jobId}/descargar`,
      'certificados.zip'
    );
  },

  downloadPdf(jobId: string): Promise<{ blob: Blob; nombre: string }> {
    return api.download(
      `/api/certificados/generar/${jobId}/descargar`,
      'certificados.pdf'
    );
  },

  startPdf(grupoId: number): Promise<{ jobId: string; total: number; aprobados: number }> {
    return api.post<{ jobId: string; total: number; aprobados: number }>('/api/certificados/generar/pdf', {
      grupoId,
    });
  },

  startInstructores(grupoId: number): Promise<{ jobId: string; total: number; aprobados: number }> {
    return api.post<{ jobId: string; total: number; aprobados: number }>('/api/certificados/generar/instructores', {
      grupoId,
    });
  },

  marcosBase(): Promise<{ id: string; nombre: string; ruta: string; ancho: number; alto: number }[]> {
    return api.get('/api/certificados/marcos-base');
  },

  verificar(codigo: string): Promise<any> {
    return api.get(`/api/certificados/verificar/${codigo}`);
  },
};