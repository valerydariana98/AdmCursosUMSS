import { and, eq } from 'drizzle-orm';
import { fromPercentageHundredths, toPercentageHundredths } from 'shared';
import { getCurrentTeacher, getCurrentTeacherId } from '../auth/currentTeacher.js';
import { syncEvaluacionesFromRubric } from '../services/grades.service.js';
import { db } from './index.js';
import {
  attendanceRecords,
  attendanceSessions,
  cursos,
  estudiantes,
  evaluaciones,
  grupos,
  inscripciones,
  notas,
  rubricItems,
  rubrics,
  tipoEstudiante,
  tipos,
} from './schema.js';

// Curso y grupo de prueba del docente simulado. Los nombres fijos permiten que el
// seed sea idempotente y que el grupo siempre pertenezca al docente que simula la
// sesión, así la vista de rúbrica siempre se puede abrir en desarrollo.
const DEV_COURSE_NAME = 'PRUEBA - RÚBRICA';
const DEV_PERIODO = '0-TEST';

// Fixture de desarrollo de las HU de notas: cuatro estudiantes, una rúbrica de
// tres ítems, diez jornadas de asistencia y notas ya registradas. Los CIs son
// ficticios y fijos para que el seed se pueda correr más de una vez.
const DEV_STUDENTS = [
  { ci: '9000001', codSis: '7000001', nombres: 'Ana', apPaterno: 'Quispe', apMaterno: 'Mamani' },
  { ci: '9000002', codSis: '7000002', nombres: 'Bruno', apPaterno: 'Condori', apMaterno: 'Rojas' },
  { ci: '9000003', codSis: '7000003', nombres: 'Carla', apPaterno: 'Flores', apMaterno: 'Vargas' },
  { ci: '9000004', codSis: '7000004', nombres: 'Diego', apPaterno: 'Mamani', apMaterno: 'Ticona' },
] as const;

const DEV_RUBRIC_ITEMS = [
  { name: 'Asistencia', category: 'attendance', percentage: 10 },
  { name: 'Trabajo práctico', category: 'assignments', percentage: 30 },
  { name: 'Examen final', category: 'exams', percentage: 60 },
] as const;

// Diez jornadas dentro del período del curso: alcanzan para que un estudiante
// supere las 8 faltas máximas y se pueda ver el caso que no cumple asistencia.
const DEV_SESSION_DATES = [
  '2026-01-05',
  '2026-01-07',
  '2026-01-09',
  '2026-01-13',
  '2026-01-15',
  '2026-01-19',
  '2026-01-21',
  '2026-01-23',
  '2026-01-26',
  '2026-01-28',
] as const;

// Notas por estudiante en el orden de `DEV_RUBRIC_ITEMS`. `null` deja la celda
// sin registrar para poder ver el caso de una nota vacía que rinde 0.
const DEV_GRADES: Record<string, (number | null)[]> = {
  '9000001': [85, 90, 78], // Ana      → 82.3  aprueba
  '9000002': [70, null, 62], // Bruno    → 44.2  aprueba, con una celda vacía
  '9000003': [60, 40, 35], // Carla    → 39.0  cumple asistencia, no llega a 40
  '9000004': [70, 60, 55], // Diego    → 58.0  con 10 faltas
};

// Cuántas de las primeras jornadas de `DEV_SESSION_DATES` faltó cada estudiante.
const DEV_ABSENT_SESSIONS: Record<string, number> = {
  '9000001': 0,
  '9000002': 1,
  '9000003': 0,
  '9000004': 10,
};

const seedDevStudents = async (grupoId: number) => {
  const [tipo] = await db
    .select()
    .from(tipoEstudiante)
    .where(eq(tipoEstudiante.nombre, 'umss'))
    .limit(1);

  if (!tipo) {
    console.warn('⚠️  No existe el tipo de estudiante "umss": no se cargaron estudiantes de prueba.');
    return [];
  }

  const enrolled: { ci: string; studentId: number }[] = [];

  for (const data of DEV_STUDENTS) {
    const [existingStudent] = await db
      .select()
      .from(estudiantes)
      .where(eq(estudiantes.ci, data.ci))
      .limit(1);

    const student =
      existingStudent ??
      (await db.insert(estudiantes).values({ ...data, celular: null }).returning())[0];

    const [existingEnrollment] = await db
      .select()
      .from(inscripciones)
      .where(and(eq(inscripciones.idEst, student.id), eq(inscripciones.idGrupo, grupoId)))
      .limit(1);

    if (!existingEnrollment) {
      await db.insert(inscripciones).values({
        idEst: student.id,
        idGrupo: grupoId,
        monto: 0,
        tipoPago: 'QR',
        idTipoEst: tipo.id,
        fotocopiaCI: false,
        observaciones: 'Estudiante del seed de desarrollo',
      });
    }

    enrolled.push({ ci: data.ci, studentId: student.id });
  }

  return enrolled;
};

const seedDevRubric = async (grupoId: number) => {
  const [existingRubric] = await db
    .select()
    .from(rubrics)
    .where(eq(rubrics.groupId, grupoId))
    .limit(1);

  const rubric =
    existingRubric ?? (await db.insert(rubrics).values({ groupId: grupoId }).returning())[0];

  const existingItems = await db
    .select()
    .from(rubricItems)
    .where(eq(rubricItems.rubricId, rubric.id));

  if (existingItems.length === 0) {
    await db.insert(rubricItems).values(
      DEV_RUBRIC_ITEMS.map((item, position) => ({
        rubricId: rubric.id,
        name: item.name,
        category: item.category,
        percentageHundredths: toPercentageHundredths(item.percentage),
        position,
      }))
    );
  }

  const rows = await db
    .select()
    .from(rubricItems)
    .where(eq(rubricItems.rubricId, rubric.id))
    .orderBy(rubricItems.position, rubricItems.id);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    percentage: fromPercentageHundredths(row.percentageHundredths),
  }));
};

const seedDevAttendance = async (grupoId: number, enrolled: { ci: string; studentId: number }[]) => {
  for (const [index, date] of DEV_SESSION_DATES.entries()) {
    const [existingSession] = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.groupId, grupoId), eq(attendanceSessions.date, date)))
      .limit(1);

    const session =
      existingSession ??
      (await db.insert(attendanceSessions).values({ groupId: grupoId, date }).returning())[0];

    for (const student of enrolled) {
      const absences = DEV_ABSENT_SESSIONS[student.ci] ?? 0;

      await db
        .insert(attendanceRecords)
        .values({
          sessionId: session.id,
          studentId: student.studentId,
          status: index < absences ? 'absent' : 'present',
        })
        .onConflictDoNothing();
    }
  }
};

const seedDevGrades = async (
  grupoId: number,
  items: { id: number; name: string; category: string; percentage: number }[],
  enrolled: { ci: string; studentId: number }[]
) => {
  // El puente rubric_items -> evaluaciones es lo que hace que `notas` tenga dónde
  // colgarse: sin él no se puede insertar ninguna nota.
  await syncEvaluacionesFromRubric(
    db,
    grupoId,
    items.map((item) => ({
      ...item,
      category: item.category as (typeof DEV_RUBRIC_ITEMS)[number]['category'],
    }))
  );

  const rows = await db
    .select({ id: evaluaciones.id, idRubricItem: evaluaciones.idRubricItem })
    .from(evaluaciones)
    .where(eq(evaluaciones.idGrupo, grupoId));

  const evaluacionByItem = new Map(
    rows
      .filter((row) => row.idRubricItem !== null)
      .map((row) => [row.idRubricItem as number, row.id])
  );

  for (const student of enrolled) {
    const grades = DEV_GRADES[student.ci] ?? [];

    for (const [index, nota] of grades.entries()) {
      const item = items[index];

      if (!item || nota === null) continue;

      const idEvaluacion = evaluacionByItem.get(item.id);

      if (idEvaluacion === undefined) continue;

      await db
        .insert(notas)
        .values({ idEstudiante: student.studentId, idEvaluacion, nota })
        .onConflictDoUpdate({
          target: [notas.idEstudiante, notas.idEvaluacion],
          set: { nota },
        });
    }
  }
};

const seedDevGroupForTeacher = async () => {
  const teacher = await getCurrentTeacher();

  if (!teacher) {
    console.warn(
      `⚠️  No existe el instructor ${getCurrentTeacherId()}: no se creó el grupo de prueba. ` +
        'Revisá CURRENT_TEACHER_ID en apps/server/.env.'
    );
    return;
  }

  const [existingCourse] = await db
    .select()
    .from(cursos)
    .where(eq(cursos.nombreCurso, DEV_COURSE_NAME))
    .limit(1);

  const curso =
    existingCourse ??
    (
      await db
        .insert(cursos)
        .values({
          nombreCurso: DEV_COURSE_NAME,
          duracionHoras: 32,
          fechaIni: '2026-01-05',
          fechaFin: '2026-02-27',
          costoAux: 0,
          costoUmss: 0,
          costoExterno: 0,
          notaMin: 40,
          maxFaltas: 8,
          periodo: DEV_PERIODO,
          estado: true,
        })
        .returning()
    )[0];

  const [existingGroup] = await db
    .select()
    .from(grupos)
    .where(and(eq(grupos.idCurso, curso.id), eq(grupos.numGrupo, 1)))
    .limit(1);

  let grupo = existingGroup;

  if (!grupo) {
    [grupo] = await db
      .insert(grupos)
      .values({
        numGrupo: 1,
        idCurso: curso.id,
        idInstructor: teacher.id,
        horaIni: '08:00',
        horaFin: '10:00',
        modalidad: 'presencial',
        aula: 'Aula 101',
        minimEst: 1,
        maxEst: 30,
        estado: 'habilitado',
      })
      .returning();
    console.log(`⏳ Grupo de prueba creado para ${teacher.nombres} ${teacher.apPaterno}.`);
  } else if (grupo.idInstructor !== teacher.id) {
    // El curso es un fixture de desarrollo, así que su grupo siempre queda a
    // nombre del docente simulado en vez de quedar huérfano de la sesión.
    [grupo] = await db
      .update(grupos)
      .set({ idInstructor: teacher.id })
      .where(eq(grupos.id, grupo.id))
      .returning();
    console.log(`⏳ Grupo de prueba reasignado a ${teacher.nombres} ${teacher.apPaterno}.`);
  }

  const enrolled = await seedDevStudents(grupo.id);
  const items = await seedDevRubric(grupo.id);
  await seedDevAttendance(grupo.id, enrolled);
  await seedDevGrades(grupo.id, items, enrolled);

  console.log(`👤 Docente simulado: #${teacher.id} ${teacher.nombres} ${teacher.apPaterno}`);
  console.log(
    `🧪 Rúbrica de prueba: /cursos/${curso.id}/grupos/${grupo.id}/rubrica ` +
      `(API: GET|PUT /api/grupos/${grupo.id}/rubric)`
  );
  console.log(
    `📝 Notas de prueba: /cursos/${curso.id}/grupos/${grupo.id}/notas ` +
      `(API: GET|PUT /api/grupos/${grupo.id}/grades)`
  );

  const ownedGroups = await db
    .select({
      id: grupos.id,
      numGrupo: grupos.numGrupo,
      nombreCurso: cursos.nombreCurso,
      periodo: cursos.periodo,
    })
    .from(grupos)
    .innerJoin(cursos, eq(cursos.id, grupos.idCurso))
    .where(eq(grupos.idInstructor, teacher.id))
    .orderBy(grupos.id);

  console.log('📋 Grupos donde el docente simulado puede configurar la rúbrica:');
  for (const group of ownedGroups) {
    console.log(
      `   - grupo ${group.id} (G${group.numGrupo}) · ${group.nombreCurso} (${group.periodo})`
    );
  }
};

async function main() {
  console.log('🌱 Iniciando el seeding de la base de datos...');

  try {
    // 1. Insertar Tipos de Estudiante (externo, umss, aux)
    console.log('⏳ Insertando catálogos en tipo_estudiante...');
    await db
      .insert(tipoEstudiante)
      .values([
        { nombre: 'externo' },
        { nombre: 'umss' },
        { nombre: 'aux' },
      ])
      .onConflictDoNothing();

    // 2. Insertar Tipos de Evaluación (asistencia, eval, trabajo)
    console.log('⏳ Insertando catálogos en tipos de evaluación...');
    await db
      .insert(tipos)
      .values([
        { tipo: 'asistencia' },
        { tipo: 'eval' },
        { tipo: 'trabajo' },
      ])
      .onConflictDoNothing();

    // 3. Grupo de prueba que pertenece al docente simulado
    await seedDevGroupForTeacher();

    console.log('✅ Seeding completado con éxito en Aiven.');
  } catch (error) {
    console.error('❌ Error ejecutando el seeding:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
