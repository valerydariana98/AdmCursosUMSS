import { and, count, eq, ne } from 'drizzle-orm';
import { calcularMonto, type CreateEnrollment, type StudentTypeName } from 'shared';
import { db } from '../db/index.js';
import { cursos, estudiantes, grupos, inscripciones, tipoEstudiante } from '../db/schema.js';
import { type UpdateEnrollment } from 'shared';
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

    // Solo la preinscripcion admite altas nuevas. Un grupo habilitado ya tiene su
    // cupo cerrado (los traslados de estudiantes ya inscritos si pueden entrar).
    if (row.grupo.estado !== 'preinscripcion')
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
          codSis: input.codSis || null,
          nombres: input.nombres,
          apPaterno: input.apPaterno,
          apMaterno: input.apMaterno,
          celular: input.celular || null,
        })
        .returning();
    } else if (input.celular) {
      // El estudiante ya existía: el celular del formulario lo reemplaza.
      await tx
        .update(estudiantes)
        .set({ celular: input.celular })
        .where(eq(estudiantes.id, est.id));
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
    orderBy: (insc, { asc }) => [asc(insc.id)],
    with: {
      estudiante: {
        columns: {
          nombres: true,
          apPaterno: true,
          apMaterno: true,
          ci: true,
          codSis: true,
          celular: true,
        },
      },
    },
  });

export const listStudentTypes = () => db.select().from(tipoEstudiante);

export const updateEnrollment = (
  idGrupo: number,
  idInscripcion: number,
  input: UpdateEnrollment,
) =>
  db.transaction(async (tx) => {
    // La inscripción debe existir y pertenecer a ese grupo
    const [row] = await tx
      .select({ insc: inscripciones, curso: cursos })
      .from(inscripciones)
      .innerJoin(grupos, eq(inscripciones.idGrupo, grupos.id))
      .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
      .where(and(eq(inscripciones.id, idInscripcion), eq(inscripciones.idGrupo, idGrupo)));
    if (!row) return { error: 'enrollment_not_found' } as const;

    // Si cambia el tipo, el monto se recalcula en el servidor
    let monto = row.insc.monto;
    if (input.idTipoEst !== undefined && input.idTipoEst !== row.insc.idTipoEst) {
      const [tipo] = await tx
        .select()
        .from(tipoEstudiante)
        .where(eq(tipoEstudiante.id, input.idTipoEst));
      if (!tipo) return { error: 'invalid_student_type' } as const;
      const nuevo = calcularMonto(tipo.nombre as StudentTypeName, row.curso);
      if (nuevo === undefined) return { error: 'invalid_student_type' } as const;
      monto = nuevo;
    }

    // El CI nuevo no puede pertenecer a otro estudiante
    if (input.ci !== undefined) {
      const [otro] = await tx
        .select({ id: estudiantes.id })
        .from(estudiantes)
        .where(and(eq(estudiantes.ci, input.ci), ne(estudiantes.id, row.insc.idEst)));
      if (otro) return { error: 'ci_taken' } as const;
    }

    const { nombres, apPaterno, apMaterno, codSis, ci, celular } = input;
    // Un campo en blanco se guarda como null: no hay codigo SIS ni celular vacio.
    const estudianteUpdate = {
      nombres,
      apPaterno,
      apMaterno,
      codSis: codSis === '' ? null : codSis,
      ci,
      celular: celular === '' ? null : celular,
    };
    if (Object.values(estudianteUpdate).some((v) => v !== undefined)) {
      await tx
        .update(estudiantes)
        .set(estudianteUpdate) // drizzle ignora los undefined
        .where(eq(estudiantes.id, row.insc.idEst));
    }

    const [actualizada] = await tx
      .update(inscripciones)
      .set({
        idTipoEst: input.idTipoEst,
        tipoPago: input.tipoPago,
        fotocopiaCI: input.fotocopiaCI,
        observaciones:
          input.observaciones === undefined ? undefined : input.observaciones || null,
        monto,
      })
      .where(eq(inscripciones.id, idInscripcion))
      .returning();
    return { data: actualizada } as const;
  });

export type DeleteEnrollmentFailure = 'enrollment_not_found';

// Eliminar la inscripcion no borra al estudiante: queda en `estudiantes` para que
// un reinscribe futuro lo reutilice por CI, igual que hace createEnrollment.
export const deleteEnrollment = async (
  idGrupo: number,
  idInscripcion: number,
): Promise<{ ok: true } | { ok: false; reason: DeleteEnrollmentFailure }> =>
  db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: inscripciones.id })
      .from(inscripciones)
      .where(and(eq(inscripciones.id, idInscripcion), eq(inscripciones.idGrupo, idGrupo)));

    if (!row) return { ok: false as const, reason: 'enrollment_not_found' as const };

    await tx.delete(inscripciones).where(eq(inscripciones.id, idInscripcion));

    return { ok: true as const };
  });

export type MoveEnrollmentFailure =
  | 'enrollment_not_found'
  | 'group_not_found'
  | 'same_group'
  | 'different_course'
  | 'group_closed'
  | 'move_not_allowed'
  | 'group_full'
  | 'already_enrolled';

// Reubica al estudiante en otro grupo del MISMO curso. No se recalcula el monto
// porque el curso no cambia, y no se asigna ningun horario: el destino lo elige
// el administrador de forma explicita.
export const moveEnrollment = async (
  idGrupoOrigen: number,
  idInscripcion: number,
  idGrupoDestino: number,
) =>
  db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        idEst: inscripciones.idEst,
        idGrupo: inscripciones.idGrupo,
        idCurso: grupos.idCurso,
        estadoOrigen: grupos.estado,
      })
      .from(inscripciones)
      .innerJoin(grupos, eq(inscripciones.idGrupo, grupos.id))
      .where(and(eq(inscripciones.id, idInscripcion), eq(inscripciones.idGrupo, idGrupoOrigen)));

    if (!row) return { error: 'enrollment_not_found' } as const;

    // Solo la preinscripcion admite reubicaciones: un grupo habilitado ya tiene
    // su cupo cerrado y sus estudiantes quedan donde estan.
    if (row.estadoOrigen !== 'preinscripcion') return { error: 'move_not_allowed' } as const;

    if (row.idGrupo === idGrupoDestino) return { error: 'same_group' } as const;

    const [destino] = await tx.select().from(grupos).where(eq(grupos.id, idGrupoDestino));
    if (!destino) return { error: 'group_not_found' } as const;

    // Solo se permite moverse dentro del curso en el que se inscribio originalmente.
    if (destino.idCurso !== row.idCurso) return { error: 'different_course' } as const;

    // El destino tambien tiene que estar en preinscripcion: un grupo habilitado
    // ya tiene su cupo cerrado.
    if (destino.estado !== 'preinscripcion') {
      return { error: 'group_closed' } as const;
    }

    // Se bloquea la fila del destino para que dos traslados simultaneos no lo llenen.
    await tx.select({ id: grupos.id }).from(grupos).where(eq(grupos.id, idGrupoDestino)).for('update');

    const [{ total }] = await tx
      .select({ total: count() })
      .from(inscripciones)
      .where(eq(inscripciones.idGrupo, idGrupoDestino));

    if (total >= destino.maxEst) return { error: 'group_full' } as const;

    const [dup] = await tx
      .select({ id: inscripciones.id })
      .from(inscripciones)
      .where(and(eq(inscripciones.idEst, row.idEst), eq(inscripciones.idGrupo, idGrupoDestino)));
    if (dup) return { error: 'already_enrolled' } as const;

    const [movida] = await tx
      .update(inscripciones)
      .set({ idGrupo: idGrupoDestino })
      .where(eq(inscripciones.id, idInscripcion))
      .returning();

    return { data: movida } as const;
  });