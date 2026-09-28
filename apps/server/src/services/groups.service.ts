import { count, eq, getTableColumns } from 'drizzle-orm';
import { db } from '../db/index.js';
import { grupos, inscripciones } from '../db/schema.js';

// Grupos de un curso, con la cantidad de inscritos (vista principal de grupos)
export const listGroupsByCourse = async (idCurso: number) =>
  db
    .select({ ...getTableColumns(grupos), inscritosCount: count(inscripciones.id) })
    .from(grupos)
    .leftJoin(inscripciones, eq(inscripciones.idGrupo, grupos.id))
    .where(eq(grupos.idCurso, idCurso))
    .groupBy(grupos.id)
    .orderBy(grupos.numGrupo);

// Un grupo con su curso (el formulario de inscripción necesita los costos)
export const getGroupById = async (id: number) => {
  const grupo = await db.query.grupos.findFirst({
    where: eq(grupos.id, id),
    with: { curso: true },
  });
  return grupo ?? null;
};