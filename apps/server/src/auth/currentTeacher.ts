// Abstracción del docente autenticado.
//
// TODO(auth): el proyecto todavía no tiene login. `getCurrentTeacher` resuelve el
// docente desde una variable de entorno para que las rutas ya validen la
// pertenencia del grupo de verdad. Cuando exista la sesión hay que reemplazar
// únicamente esta función (y borrar CURRENT_TEACHER_ID del .env): el resto del
// código ya pregunta por el docente a través de este módulo.

import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { instructores } from '../db/schema.js';

// TODO(auth): valor por defecto de la sesión simulada. Solo se usa si no está
// definida la variable CURRENT_TEACHER_ID.
const DEFAULT_TEACHER_ID = 6;

export interface CurrentTeacher {
  id: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
}

// Id del docente simulado, sin tocar la base. Lo consumen el seed de desarrollo
// (para crear datos de prueba de ese docente) y los logs de diagnóstico.
export const getCurrentTeacherId = (): number => {
  const configured = Number(process.env.CURRENT_TEACHER_ID);

  if (Number.isInteger(configured) && configured > 0) return configured;

  return DEFAULT_TEACHER_ID;
};

export const getCurrentTeacher = async (): Promise<CurrentTeacher | null> => {
  const teacherId = getCurrentTeacherId();

  const [teacher] = await db
    .select({
      id: instructores.id,
      nombres: instructores.nombres,
      apPaterno: instructores.apPaterno,
      apMaterno: instructores.apMaterno,
    })
    .from(instructores)
    .where(eq(instructores.id, teacherId))
    .limit(1);

  if (!teacher) {
    // TODO(auth): sin este aviso un id mal configurado se manifestaba como un 403
    // ("el grupo no te pertenece") y parecía un problema de permisos.
    console.warn(
      `[currentTeacher] No existe un instructor con id ${teacherId}. ` +
        'Revisá CURRENT_TEACHER_ID en apps/server/.env.'
    );
  }

  return teacher ?? null;
};