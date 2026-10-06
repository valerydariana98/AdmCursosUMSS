// Abstracción del docente autenticado.
//
// `getCurrentTeacherForUser` es el que usan los controllers con sesión activa:
// recibe el usuario del token y busca su fila en `instructores`. La pertenencia
// del grupo se compara contra ese id, así que cada docente ve lo suyo y nada más.
//
// Las funciones por variable de entorno de abajo quedan únicamente para el seed
// de desarrollo, que corre sin sesión.
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { instructores } from '../db/schema.js';

// Solo lo usa el seed.
const DEFAULT_TEACHER_ID = 6;

export interface CurrentTeacher {
  id: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
}

// El instructor ligado al usuario de la sesión. ADMIN no tiene fila en
// `instructores`, así que devuelve null y el controller responde
// `teacher_not_found` en vez de hacerse pasar por otro docente.
export const getCurrentTeacherForUser = async (
  userId: number
): Promise<CurrentTeacher | null> => {
  const [teacher] = await db
    .select({
      id: instructores.id,
      nombres: instructores.nombres,
      apPaterno: instructores.apPaterno,
      apMaterno: instructores.apMaterno,
    })
    .from(instructores)
    .where(eq(instructores.usuarioId, userId))
    .limit(1);

  return teacher ?? null;
};

// Id del docente simulado. Solo lo usa el seed de desarrollo.
export const getCurrentTeacherId = (): number => {
  const configured = Number(process.env.CURRENT_TEACHER_ID);

  if (Number.isInteger(configured) && configured > 0) return configured;

  return DEFAULT_TEACHER_ID;
};

// Solo lo usa el seed de desarrollo (datos de prueba de ese docente).
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
    console.warn(
      `[currentTeacher] No existe un instructor con id ${teacherId}. ` +
        'Revisá CURRENT_TEACHER_ID en apps/server/.env.'
    );
  }

  return teacher ?? null;
};
