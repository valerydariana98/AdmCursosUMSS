// apps/server/src/db/reset.ts
// Vaciado de la base para dejar solo lo indispensable del entorno:
// el usuario ADMIN y los catálogos fijos (tipo_estudiante, tipos de evaluación).
// Se borra en orden inverso a las dependencias para no romper las FKs.
import { ne } from 'drizzle-orm';
import { db } from './index.js';
import {
  asistencias,
  attendanceRecords,
  attendanceSessions,
  cursos,
  estudiantes,
  evaluaciones,
  grupos,
  inscripciones,
  instructores,
  notas,
  rubricItems,
  rubrics,
  usuarios,
} from './schema.js';

const main = async () => {
  console.log('🧹 Vaciando la base (se conservan ADMIN y catálogos)...');

  // Hijos primero: cualquier fila que referencie a otra debe ir antes que su padre.
  await db.delete(attendanceRecords);
  await db.delete(attendanceSessions);
  await db.delete(asistencias);
  await db.delete(notas);
  await db.delete(evaluaciones);
  await db.delete(rubricItems);
  await db.delete(rubrics);
  await db.delete(inscripciones);
  await db.delete(grupos);
  await db.delete(cursos);
  await db.delete(estudiantes);
  await db.delete(instructores);
  await db.delete(usuarios).where(ne(usuarios.rol, 'ADMIN'));

  const admins = await db.select({ id: usuarios.id }).from(usuarios);
  console.log(`✅ Listo. Usuarios restantes (ADMIN): ${admins.map((u) => u.id).join(', ') || 'ninguno'}`);
  process.exit(0);
};

main().catch((error) => {
  console.error('❌ Error vaciando la base:', error);
  process.exit(1);
});
