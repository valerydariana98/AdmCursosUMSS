import { and, eq } from 'drizzle-orm';
import { getCurrentTeacher, getCurrentTeacherId } from '../auth/currentTeacher.js';
import { db } from './index.js';
import { cursos, grupos, tipoEstudiante, tipos } from './schema.js';

// Curso y grupo de prueba del docente simulado. Los nombres fijos permiten que el
// seed sea idempotente y que el grupo siempre pertenezca al docente que simula la
// sesión, así la vista de rúbrica siempre se puede abrir en desarrollo.
const DEV_COURSE_NAME = 'PRUEBA - RÚBRICA';
const DEV_PERIODO = '0-TEST';

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

  console.log(`👤 Docente simulado: #${teacher.id} ${teacher.nombres} ${teacher.apPaterno}`);
  console.log(
    `🧪 Rúbrica de prueba: /cursos/${curso.id}/grupos/${grupo.id}/rubrica ` +
      `(API: GET|PUT /api/grupos/${grupo.id}/rubric)`
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