import { and, count, eq } from 'drizzle-orm';
import { calcularMonto, type CreateEnrollment, type StudentTypeName } from 'shared';
import { db } from '../db/index.js';
import { cursos, estudiantes, grupos, inscripciones, tipoEstudiante } from '../db/schema.js';

export const createEnrollment = (idGrupo: number, input: CreateEnrollment) =>
  db.transaction(async (tx) => {
    // Bloquea el grupo para que inscripciones simultáneas no superen el cupo
    const [row] = await tx
      .select({ grupo: grupos, curso: cursos })
      .from(grupos)
      .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
      .where(eq(grupos.id, idGrupo))
      .for('update', { of: grupos });
    if (!row) return { error: 'group_not_found' } as const;

    if (row.grupo.estado !== 'preinscripcion' && row.grupo.estado !== 'habilitado')
      return { error: 'group_closed' } as const;

    const [{ total }] = await tx
      .select({ total: count() })
      .from(inscripciones)
      .where(eq(inscripciones.idGrupo, idGrupo));
    if (total >= row.grupo.maxEst) return { error: 'group_full' } as const;

    const [tipo] = await tx
      .select()
      .from(tipoEstudiante)
      .where(eq(tipoEstudiante.id, input.idTipoEst));
    if (!tipo) return { error: 'invalid_student_type' } as const;

    const monto = calcularMonto(tipo.nombre as StudentTypeName, row.curso);
    if (monto === undefined) return { error: 'invalid_student_type' } as const;

    let [est] = await tx.select().from(estudiantes).where(eq(estudiantes.ci, input.ci));
    if (!est) {
      [est] = await tx
        .insert(estudiantes)
        .values({
          ci: input.ci,
          codSis: input.codSis,
          nombres: input.nombres,
          apPaterno: input.apPaterno,
          apMaterno: input.apMaterno,
          celular: '', // quita esto si haces celular nullable
        })
        .returning();
    }

    const [dup] = await tx
      .select({ id: inscripciones.id })
      .from(inscripciones)
      .where(and(eq(inscripciones.idEst, est.id), eq(inscripciones.idGrupo, idGrupo)));
    if (dup) return { error: 'already_enrolled' } as const;

    const [creada] = await tx
      .insert(inscripciones)
      .values({
        idEst: est.id,
        idGrupo,
        idTipoEst: input.idTipoEst,
        tipoPago: input.tipoPago,
        fotocopiaCI: input.fotocopiaCI,
        observaciones: input.observaciones || null,
        monto,
      })
      .returning();
    return { data: creada } as const;
  });

export const listEnrollments = (idGrupo: number) =>
  db.query.inscripciones.findMany({
    where: eq(inscripciones.idGrupo, idGrupo),
    with: {
      estudiante: {
        columns: { nombres: true, apPaterno: true, apMaterno: true, ci: true, codSis: true },
      },
    },
  });

export const listStudentTypes = () => db.select().from(tipoEstudiante);