// apps/server/src/services/groupOwnership.ts
// Regla de pertenencia de un grupo al docente autenticado.
//
// Vive aparte porque la comparten varios módulos por grupo (rúbrica, asistencia y
// los que vengan): la regla es una sola y escribarla en cada servicio terminaría en
// dos versiones que se contradicen.
export type GroupOwnershipFailure = 'group_not_found' | 'forbidden';

// Lo mínimo que hace falta para decidir la pertenencia. Cada módulo carga su
// contexto con los datos que necesita y pasa solo el docente del grupo.
export interface GroupOwnershipContext {
  instructorId: number;
}

// `isAdmin` existe porque el ADMIN no tiene fila en `instructores`: no puede ser
// el dueño de ningún grupo, pero sí administrarlos todos, igual que hace en la
// vista de detalle. Los docentes siguen entrando únicamente a los suyos.
export const resolveGroupOwnershipFailure = (
  context: GroupOwnershipContext | null,
  teacherId: number | null,
  isAdmin = false
): GroupOwnershipFailure | null => {
  if (!context) return 'group_not_found';
  if (isAdmin) return null;
  if (teacherId === null || context.instructorId !== teacherId) return 'forbidden';

  return null;
};