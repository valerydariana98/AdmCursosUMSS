// apps/server/src/services/certificado.service.ts
// Generación masiva de certificados (HU-04).
//
// El servicio tiene tres piezas separadas:
//
//  1. `construirVistaPrevia`: quién recibiría certificado y con qué plantilla.
//     Es lo que la pantalla muestra antes de que el usuario confirme, para no
//     descubrir al final que a medio grupo no le correspondía.
//  2. `iniciarJob`: lanza el render en segundo plano y devuelve un id de
//     seguimiento. Un grupo tiene como máximo unos 40 estudiantes, así que un
//     job en memoria alcanza; una cola con Redis sería infraestructura de más.
//  3. `obtenerJob` / `descargarZip`: consulta el progreso y entrega el archivo.
//
// La condición de aprobación NO se recalcula aquí: se reutiliza
// `resolveCertificateCondition` con `computeFinalGrade`, igual que el reporte
// académico. Si las dos pantallas no coinciden, el sistema emitiría un
// certificado que el propio reporte dice que no corresponde.

import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import { eq, inArray, and } from 'drizzle-orm';
import QRCode from 'qrcode';
import {
  CERTIFICATE_CONDITION_LABEL,
  computeFinalGrade,
  resolveCertificateCondition,
  toPercentageHundredths,
  type CertificateCondition,
  type CertificateJob,
  type CertificateJobState,
  type CertificatePreview,
  type CertificateVariableContext,
  type PlantillaElementoView,
} from 'shared';
import { db } from '../db/index.js';
import {
  cursos,
  estudiantes,
  grupos,
  inscripciones,
  certificadosEmitidos,
  firmas,
  instructores,
  plantillaElementos,
  plantillasCertificado,
  rubricItems,
  rubrics,
} from '../db/schema.js';
import { getStudentAttendanceSummary } from './attendance.service.js';
import { cellKey, loadGradeMap } from './grades.service.js';
import { renderizarCertificado, renderizarCertificadosEnPdf } from './certificado.render.js';
import { SUBFOLDER_GENERADOS, uploadsDir } from './imagen.service.js';
import { resolverPlantillaParaGrupo } from './plantillas.service.js';
import { resolveGroupOwnershipFailure } from './groupOwnership.js';
import type { GroupOwnershipFailure } from './groupOwnership.js';

export type CertificadoFailure =
  | GroupOwnershipFailure
  | 'teacher_not_found'
  | 'no_enrolled_students'
  | 'sin_plantilla'
  | 'sin_aprobados'
  | 'job_not_found';

export type CertificadoResult<T> = { ok: true; value: T } | { ok: false; reason: CertificadoFailure };

interface GrupoContexto {
  id: number;
  numero: number;
  cursoId: number;
  cursoNombre: string;
  cursoHoras: number;
  cursoFechaIni: string;
  cursoFechaFin: string;
  cursoPeriodo: string;
  instructorId: number;
  passingGrade: number;
  maxAbsences: number;
}

const cargarGrupoContexto = async (groupId: number): Promise<GrupoContexto | null> => {
  const [fila] = await db
    .select({
      id: grupos.id,
      numero: grupos.numGrupo,
      cursoId: grupos.idCurso,
      cursoNombre: cursos.nombreCurso,
      cursoHoras: cursos.duracionHoras,
      cursoFechaIni: cursos.fechaIni,
      cursoFechaFin: cursos.fechaFin,
      cursoPeriodo: cursos.periodo,
      instructorId: grupos.idInstructor,
      passingGrade: cursos.notaMin,
      maxAbsences: cursos.maxFaltas,
    })
    .from(grupos)
    .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
    .where(eq(grupos.id, groupId))
    .limit(1);

  return fila ?? null;
};

interface EstudianteRow {
  id: number;
  ci: string;
  codSis: string | null;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
}

const cargarEstudiantes = async (groupId: number): Promise<EstudianteRow[]> =>
  db
    .select({
      id: estudiantes.id,
      ci: estudiantes.ci,
      codSis: estudiantes.codSis,
      nombres: estudiantes.nombres,
      apPaterno: estudiantes.apPaterno,
      apMaterno: estudiantes.apMaterno,
    })
    .from(inscripciones)
    .innerJoin(estudiantes, eq(inscripciones.idEst, estudiantes.id))
    .where(eq(inscripciones.idGrupo, groupId))
    .orderBy(estudiantes.apPaterno, estudiantes.nombres, estudiantes.id);

interface RubricaItem {
  id: number;
  porcentaje: number;
}

// Los porcentajes se guardan en centésimas (mismo criterio que la rúbrica), y
// aquí vuelven a porcentaje decimal para entrar a `toPercentageHundredths`.
const cargarRubrica = async (groupId: number): Promise<RubricaItem[] | null> => {
  const [rubrica] = await db
    .select({ id: rubrics.id })
    .from(rubrics)
    .where(eq(rubrics.groupId, groupId))
    .limit(1);

  if (!rubrica) return null;

  const items = await db
    .select({ id: rubricItems.id, porcentajeHundredths: rubricItems.percentageHundredths })
    .from(rubricItems)
    .where(eq(rubricItems.rubricId, rubrica.id));

  return items.map((item) => ({
    id: item.id,
    porcentaje: item.porcentajeHundredths / 100,
  }));
};

/**
 * Un estudiante del grupo con su nota final y su condición de certificado.
 *
 * Es el mismo cálculo del reporte académico: la nota sale de `computeFinalGrade`
 * sobre el mapa de notas y la condición de `resolveCertificateCondition`
 * comparando con la nota mínima y el máximo de faltas del curso. Un grupo sin
 * rúbrica deja la nota en null y la condición en pendiente, en vez de informar un
 * cero que parecería un suspenso.
 */
interface EstudianteEvaluado {
  estudiante: EstudianteRow;
  notaFinal: number | null;
  condicion: CertificateCondition;
}

const evaluarEstudiantes = async (
  groupId: number,
  context: GrupoContexto
): Promise<EstudianteEvaluado[]> => {
  const estudiantesGrupo = await cargarEstudiantes(groupId);

  const [rubrica, attendance] = await Promise.all([
    cargarRubrica(groupId),
    getStudentAttendanceSummary(groupId),
  ]);

  // Sin rúbrica no hay ítems que ponderar, así que no hay nada que buscar en el
  // mapa de notas: pedirlo sería una consulta inútil.
  const gradeMap =
    rubrica === null ? new Map<string, number>() : await loadGradeMap(db, groupId);

  const totalSessions = attendance?.totalSessions ?? 0;
  const resumenPorEstudiante = new Map(
    (attendance?.summaries ?? []).map((resumen) => [resumen.studentId, resumen])
  );

  return estudiantesGrupo.map((estudiante) => {
    const resumen = resumenPorEstudiante.get(estudiante.id) ?? null;
    const notasDisponibles = rubrica !== null;

    const notaFinal = notasDisponibles
      ? computeFinalGrade(
          rubrica!.map((item) => ({
            nota: gradeMap.get(cellKey(estudiante.id, item.id)) ?? null,
            percentageHundredths: toPercentageHundredths(item.porcentaje),
          }))
        )
      : null;

    const condicion = resolveCertificateCondition({
      notaFinal,
      passingGrade: context.passingGrade,
      meetsAttendance: resumen?.requirement.meetsRequirement ?? true,
      hasGrades: notasDisponibles,
      hasAttendance: totalSessions > 0,
    });

    return { estudiante, notaFinal, condicion };
  });
};

const nombreCompleto = (estudiante: EstudianteRow): string =>
  `${estudiante.nombres} ${estudiante.apPaterno} ${estudiante.apMaterno}`.trim();

/**
 * Copia de los datos que la pagina publica de verificacion muestra. Se guarda
 * junto al certificado para que el documento siga siendo verificable aunque
 * despues se edite el curso, se cambie el nombre del estudiante o se elimine la
 * plantilla/grupo/curso.
 */
interface MetadataCertificado {
  [key: string]: unknown;
  nombre: string;
  ci: string | null;
  codSis: string | null;
  cargo: string | null;
  curso: string;
  horas: number;
  grupo: number;
  fechaIni: string;
  fechaFin: string;
  periodo: string;
  tipo: string;
  notaFinal: number | null;
  destinatarioTipo: 'estudiante' | 'instructor';
}

const metadataEstudiante = (
  evaluado: EstudianteEvaluado,
  context: GrupoContexto
): MetadataCertificado => ({
  nombre: nombreCompleto(evaluado.estudiante),
  ci: evaluado.estudiante.ci,
  codSis: evaluado.estudiante.codSis,
  cargo: null,
  curso: context.cursoNombre,
  horas: context.cursoHoras,
  grupo: context.numero,
  fechaIni: context.cursoFechaIni,
  fechaFin: context.cursoFechaFin,
  periodo: context.cursoPeriodo,
  tipo: evaluado.condicion,
  notaFinal: evaluado.notaFinal,
  destinatarioTipo: 'estudiante',
});

interface InstructorRow {
  id: number;
  ci: string | null;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
  cargo: string | null;
}

const metadataInstructor = (
  instructor: InstructorRow,
  context: GrupoContexto
): MetadataCertificado => ({
  nombre: `${instructor.nombres} ${instructor.apPaterno} ${instructor.apMaterno}`.trim(),
  ci: instructor.ci,
  codSis: null,
  cargo: instructor.cargo,
  curso: context.cursoNombre,
  horas: context.cursoHoras,
  grupo: context.numero,
  fechaIni: context.cursoFechaIni,
  fechaFin: context.cursoFechaFin,
  periodo: context.cursoPeriodo,
  tipo: 'instructor',
  notaFinal: null,
  destinatarioTipo: 'instructor',
});

// ------------------------------------------------------------------
// Vista previa
// ------------------------------------------------------------------

export const construirVistaPrevia = async (
  groupId: number,
  actor: { teacherId: number | null; isAdmin: boolean }
): Promise<CertificadoResult<CertificatePreview>> => {
  const context = await cargarGrupoContexto(groupId);
  const denegado = resolveGroupOwnershipFailure(context, actor.teacherId, actor.isAdmin);

  if (denegado) return { ok: false, reason: denegado };

  const plantilla = await resolverPlantillaParaGrupo(context!.cursoId, groupId);
  const evaluados = await evaluarEstudiantes(groupId, context!);

  if (evaluados.length === 0) return { ok: false, reason: 'no_enrolled_students' };

  const porCondicion = (Object.keys(CERTIFICATE_CONDITION_LABEL) as CertificateCondition[]).map(
    (condicion) => ({
      condicion,
      cantidad: evaluados.filter((evaluado) => evaluado.condicion === condicion).length,
    })
  );

  return {
    ok: true,
    value: {
      grupo: {
        id: context!.id,
        numero: context!.numero,
        cursoId: context!.cursoId,
        cursoNombre: context!.cursoNombre,
        instructorId: context!.instructorId,
      },
      plantilla,
      totalEstudiantes: evaluados.length,
      aprobados: evaluados.filter((evaluado) => evaluado.condicion === 'aprobacion').length,
      porCondicion,
      estudiantes: evaluados.map((evaluado) => ({
        estudianteId: evaluado.estudiante.id,
        nombre: nombreCompleto(evaluado.estudiante),
        notaFinal: evaluado.notaFinal,
        condicion: evaluado.condicion,
      })),
    },
  };
};

// ------------------------------------------------------------------
// Jobs en memoria
// ------------------------------------------------------------------

interface JobInterno extends CertificateJob {
  zipRutaInterna: string | null;
}

const jobs = new Map<string, JobInterno>();

const nuevoJobId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const aApi = (job: JobInterno): CertificateJob => ({
  jobId: job.jobId,
  estado: job.estado,
  total: job.total,
  procesados: job.procesados,
  excluidos: job.excluidos,
  mensajeError: job.mensajeError,
  nombreArchivo: job.nombreArchivo,
});

/**
 * Borra los ZIPs viejos. Un docente puede generar varias veces y cada corrida
 * deja un archivo; sin limpieza, `uploads/generados/` crecería sin control. Se
 * llama al iniciar cada generación.
 */
export const limpiarGeneradosAntiguos = async (maximoHoras = 24): Promise<void> => {
  const carpeta = path.resolve(uploadsDir(), SUBFOLDER_GENERADOS);

  let archivos: string[];

  try {
    archivos = await readdir(carpeta);
  } catch {
    // Todavía no se generó nada: no hay nada que limpiar.
    return;
  }

  const limite = Date.now() - maximoHoras * 60 * 60 * 1000;

  for (const archivo of archivos) {
    if (!archivo.endsWith('.zip')) continue;

    try {
      const info = await stat(path.join(carpeta, archivo));

      if (info.mtimeMs < limite) await unlink(path.join(carpeta, archivo));
    } catch {
      // Si el archivo desaparece entre el listado y el borrado, el objetivo ya
      // se cumplió.
    }
  }
};

/**
 * Nombra el PDF de un estudiante. Se quitan acentos y caracteres que Windows no
 * admite en nombres de archivo, porque el ZIP se arma en Linux y puede terminar
 * descomprimido en el escritorio de un docente con Windows: un archivo llamado
 * "Certificado_María.pdf" no se abre en todos los sistemas.
 */
const nombreArchivoCertificado = (estudiante: EstudianteRow, cursoNombre: string): string => {
  const limpiar = (valor: string) =>
    valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita los acentos
      .replace(/[^a-zA-Z0-9]/g, '') // deja solo letras y números
      .replace(/\s+/g, '');

  const nombre = limpiar(`${estudiante.apPaterno}${estudiante.nombres}`) || 'estudiante';
  const curso = limpiar(cursoNombre) || 'curso';

  return `Certificado_${nombre}_${curso}.pdf`;
};

const cargarElementos = async (plantillaId: number): Promise<PlantillaElementoView[]> => {
  const filas = await db
    .select({ elemento: plantillaElementos, firma: firmas })
    .from(plantillaElementos)
    .leftJoin(firmas, eq(plantillaElementos.idFirma, firmas.id))
    .where(eq(plantillaElementos.idPlantilla, plantillaId))
    .orderBy(plantillaElementos.position);

  return filas.map(({ elemento, firma }) => ({
    ...elemento,
    firma: firma
      ? {
          id: firma.id,
          nombre: firma.nombre,
          ruta: firma.ruta,
          originalNombre: firma.originalNombre,
          createdAt: firma.createdAt.toISOString(),
          updatedAt: firma.updatedAt.toISOString(),
        }
      : null,
  }));
};

// archiver 8 expone clases en lugar de la factoría `archiver('zip')` de las
// versiones previas: se instancia `ZipArchive` directamente. Comprime a máxima
// compresión porque los PDF ya vienen comprimidos y el margen extra no aporta.
const comprimir = (carpeta: string, zipRuta: string, archivos: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const salida = createWriteStream(zipRuta);
    const archivo = new ZipArchive({ zlib: { level: 9 } });

    salida.on('close', resolve);
    salida.on('error', reject);
    archivo.on('error', reject);

    archivo.pipe(salida);

    for (const nombre of archivos) {
      archivo.file(path.join(carpeta, nombre), { name: nombre });
    }

    void archivo.finalize();
  });

/**
 * Arranca la generación. Devuelve el id del job de inmediato: el render sigue en
 * segundo plano y el cliente consulta el progreso por separado, de modo que la
 * pantalla no se quede congelada mientras se arman los PDF.
 */
export const iniciarJob = async (
  groupId: number,
  actor: { teacherId: number | null; isAdmin: boolean }
): Promise<CertificadoResult<{ jobId: string; total: number; aprobados: number }>> => {
  const preview = await construirVistaPrevia(groupId, actor);

  if (!preview.ok) return preview;

  const { plantilla, aprobados, totalEstudiantes, grupo } = preview.value;

  // Sin plantilla no se puede emitir: es preferible decirlo antes de que el
  // usuario pulse "generar" a que el proceso termine en error.
  if (!plantilla) return { ok: false, reason: 'sin_plantilla' };

  if (aprobados === 0) return { ok: false, reason: 'sin_aprobados' };

  await limpiarGeneradosAntiguos();

  const jobId = nuevoJobId();

  const job: JobInterno = {
    jobId,
    estado: 'pendiente',
    total: aprobados,
    procesados: 0,
    excluidos: totalEstudiantes - aprobados,
    mensajeError: null,
    nombreArchivo: `certificados_grupo${grupo.numero}_${jobId}.zip`,
    zipRutaInterna: null,
  };

  jobs.set(jobId, job);

  // El job corre suelto: el endpoint responde de inmediato y el cliente hace
  // polling. Su error queda registrado en el propio job.
  void ejecutarJob(jobId, groupId, plantilla.plantilla.id);

  return { ok: true, value: { jobId, total: aprobados, aprobados } };
};

const ejecutarJob = async (jobId: string, groupId: number, plantillaId: number): Promise<void> => {
  const job = jobs.get(jobId);

  if (!job) return;

  job.estado = 'procesando';

  try {
    const context = await cargarGrupoContexto(groupId);

    if (!context) throw new Error('El grupo ya no existe');

    const plantilla = (
      await db.select().from(plantillasCertificado).where(eq(plantillasCertificado.id, plantillaId)).limit(1)
    )[0];

    if (!plantilla) throw new Error('La plantilla ya no existe');

    const [elementos, evaluados] = await Promise.all([
      cargarElementos(plantillaId),
      evaluarEstudiantes(groupId, context),
    ]);

    const aprobados = evaluados.filter((evaluado) => evaluado.condicion === 'aprobacion');

    const carpeta = path.resolve(uploadsDir(), SUBFOLDER_GENERADOS, jobId);
    await mkdir(carpeta, { recursive: true });

    // La fecha se calcula una vez para todo el lote: emitir 30 certificados con
    // fecha distinta porque el proceso cruzó la medianoche sería un descuido
    // visible en los documentos de un mismo curso.
    const fechaEmision = new Date().toLocaleDateString('es-BO');
    const generados: string[] = [];

    for (const [indice, evaluado] of aprobados.entries()) {
      const contexto: CertificateVariableContext = {
        nombreEstudiante: nombreCompleto(evaluado.estudiante),
        nombreCurso: context.cursoNombre,
        grupo: `Grupo ${context.numero}`,
        notaFinal: evaluado.notaFinal ?? 0,
        fechaEmision,
      };

      const nombre = nombreArchivoCertificado(evaluado.estudiante, context.cursoNombre);

      await renderizarCertificado({
        destino: path.join(carpeta, nombre),
        fondoRuta: plantilla.rutaFondo,
        fondoAncho: plantilla.ancho,
        fondoAlto: plantilla.alto,
        elementos,
        contexto,
      });

      generados.push(nombre);

      // El progreso se actualiza después de cada PDF, que es la unidad por la
      // que el usuario ve avanzar la barra.
      job.procesados = indice + 1;
    }

    const zipRuta = path.join(carpeta, job.nombreArchivo ?? `certificados_${jobId}.zip`);
    await comprimir(carpeta, zipRuta, generados);

    job.zipRutaInterna = zipRuta;
    job.estado = 'listo';
  } catch (error) {
    job.estado = 'error';
    job.mensajeError = error instanceof Error ? error.message : 'Error al generar';
  }
};

export const obtenerJob = (jobId: string): CertificadoResult<CertificateJob> => {
  const job = jobs.get(jobId);

  if (!job) return { ok: false, reason: 'job_not_found' };

  return { ok: true, value: aApi(job) };
};

/**
 * Entrega el ZIP. El job se conserva en memoria para que se pueda volver a
 * descargar: se cae la pestaña a mitad de descarga con frecuencia y el usuario
 * no debería tener que regenerar los PDF. Los archivos en disco se limpian
 * solos con `limpiarGeneradosAntiguos`.
 */
export const descargarZip = (
  jobId: string
): CertificadoResult<{ ruta: string; nombre: string }> => {
  const job = jobs.get(jobId);

  if (!job) return { ok: false, reason: 'job_not_found' };
  if (job.estado !== 'listo' || !job.zipRutaInterna) return { ok: false, reason: 'job_not_found' };

  return { ok: true, value: { ruta: job.zipRutaInterna, nombre: job.nombreArchivo ?? 'certificados.zip' } };
};// ------------------------------------------------------------------
// PDF consolidado (issue #101, #102)
// ------------------------------------------------------------------

const generarCodigoVerificacion = (): string =>
  `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/**
 * El codigo es la llave publica del certificado: no puede repetirse. Se
 * consulta la tabla antes de emitir y, si por azar coincidiera, se genera otro.
 */
const generarCodigoUnico = async (): Promise<string> => {
  for (let intento = 0; intento < 10; intento += 1) {
    const codigo = generarCodigoVerificacion();
    const [existente] = await db
      .select({ id: certificadosEmitidos.id })
      .from(certificadosEmitidos)
      .where(eq(certificadosEmitidos.codigo, codigo))
      .limit(1);

    if (!existente) return codigo;
  }

  // El sufijo extra conserva la unicidad aun si el azar falla diez veces.
  return `${generarCodigoVerificacion()}-${Date.now().toString(36).toUpperCase()}`;
};

const generarQrBuffer = async (codigo: string): Promise<Buffer> => {
  const base = process.env.PUBLIC_VERIFICATION_URL ?? 'http://localhost:5173/verificar';
  const url = `${base}/${codigo}`;
  return QRCode.toBuffer(url, { type: 'png', width: 128, margin: 1 });
};

export const iniciarJobPdfEstudiantes = async (
  groupId: number,
  actor: { teacherId: number | null; isAdmin: boolean }
): Promise<CertificadoResult<{ jobId: string; total: number; aprobados: number }>> => {
  const preview = await construirVistaPrevia(groupId, actor);
  if (!preview.ok) return preview;

  const { plantilla, totalEstudiantes, grupo } = preview.value;
  if (!plantilla) return { ok: false, reason: 'sin_plantilla' };

  const context = await cargarGrupoContexto(groupId);
  if (!context) return { ok: false, reason: 'group_not_found' };

  const evaluados = await evaluarEstudiantes(groupId, context);
  const elegibles = evaluados.filter(
    (e) => e.condicion === 'aprobacion' || e.condicion === 'asistencia'
  );

  if (elegibles.length === 0) return { ok: false, reason: 'sin_aprobados' };

  await limpiarGeneradosAntiguos();

  const jobId = nuevoJobId();
  const job: JobInterno = {
    jobId,
    estado: 'pendiente',
    total: elegibles.length,
    procesados: 0,
    excluidos: totalEstudiantes - elegibles.length,
    mensajeError: null,
    nombreArchivo: `Certificados_Estudiantes_Grupo${grupo.numero}_${jobId}.pdf`,
    zipRutaInterna: null,
  };

  jobs.set(jobId, job);
  void ejecutarJobPdfEstudiantes(jobId, groupId, plantilla.plantilla.id);

  return { ok: true, value: { jobId, total: elegibles.length, aprobados: elegibles.length } };
};

const ejecutarJobPdfEstudiantes = async (
  jobId: string,
  groupId: number,
  plantillaId: number
): Promise<void> => {
  const job = jobs.get(jobId);
  if (!job) return;
  job.estado = 'procesando';

  try {
    const context = await cargarGrupoContexto(groupId);
    if (!context) throw new Error('El grupo ya no existe');

    const [plantilla] = await db
      .select()
      .from(plantillasCertificado)
      .where(eq(plantillasCertificado.id, plantillaId))
      .limit(1);
    if (!plantilla) throw new Error('La plantilla ya no existe');

    const elementos = await cargarElementos(plantillaId);
    const evaluados = await evaluarEstudiantes(groupId, context);
    const elegibles = evaluados.filter(
      (e) => e.condicion === 'aprobacion' || e.condicion === 'asistencia'
    );

    const carpeta = path.resolve(uploadsDir(), SUBFOLDER_GENERADOS, jobId);
    await mkdir(carpeta, { recursive: true });

    const fechaEmision = new Date().toLocaleDateString('es-BO');
    const paginas: any[] = [];

    for (const [indice, evaluado] of elegibles.entries()) {
      const codigo = await generarCodigoUnico();
      const qrBuffer = await generarQrBuffer(codigo);

      const contexto: CertificateVariableContext = {
        nombreEstudiante: nombreCompleto(evaluado.estudiante),
        nombreCurso: context.cursoNombre,
        grupo: `Grupo ${context.numero}`,
        notaFinal: evaluado.notaFinal ?? 0,
        fechaEmision,
      };

      paginas.push({
        fondoRuta: plantilla.rutaFondo,
        fondoAncho: plantilla.ancho,
        fondoAlto: plantilla.alto,
        elementos,
        contexto,
        codigoVerificacion: codigo,
        qrBuffer,
      });

      await db.insert(certificadosEmitidos).values({
        codigo,
        tipo: evaluado.condicion,
        destinatarioTipo: 'estudiante',
        destinatarioId: evaluado.estudiante.id,
        plantillaId,
        grupoId: groupId,
        cursoId: context.cursoId,
        fechaEmision,
        metadata: metadataEstudiante(evaluado, context),
      });

      job.procesados = indice + 1;
    }

    const pdfRuta = path.join(carpeta, job.nombreArchivo ?? `certificados_${jobId}.pdf`);
    await renderizarCertificadosEnPdf(pdfRuta, paginas);

    job.zipRutaInterna = pdfRuta;
    job.estado = 'listo';
  } catch (error) {
    job.estado = 'error';
    job.mensajeError = error instanceof Error ? error.message : 'Error al generar';
  }
};

export const iniciarJobPdfInstructores = async (
  groupId: number,
  actor: { teacherId: number | null; isAdmin: boolean }
): Promise<CertificadoResult<{ jobId: string; total: number; aprobados: number }>> => {
  const context = await cargarGrupoContexto(groupId);
  if (!context) return { ok: false, reason: 'group_not_found' };

  const denegado = resolveGroupOwnershipFailure(context, actor.teacherId, actor.isAdmin);
  if (denegado) return { ok: false, reason: denegado };

  const plantilla = await resolverPlantillaParaGrupo(context.cursoId, groupId);
  if (!plantilla) return { ok: false, reason: 'sin_plantilla' };

  await limpiarGeneradosAntiguos();

  const jobId = nuevoJobId();
  const job: JobInterno = {
    jobId,
    estado: 'pendiente',
    total: 1,
    procesados: 0,
    excluidos: 0,
    mensajeError: null,
    nombreArchivo: `Certificado_Instructor_Grupo${context.numero}_${jobId}.pdf`,
    zipRutaInterna: null,
  };

  jobs.set(jobId, job);
  void ejecutarJobPdfInstructores(jobId, groupId, plantilla.plantilla.id);

  return { ok: true, value: { jobId, total: 1, aprobados: 1 } };
};

const ejecutarJobPdfInstructores = async (
  jobId: string,
  groupId: number,
  plantillaId: number
): Promise<void> => {
  const job = jobs.get(jobId);
  if (!job) return;
  job.estado = 'procesando';

  try {
    const context = await cargarGrupoContexto(groupId);
    if (!context) throw new Error('El grupo ya no existe');

    const [plantilla] = await db
      .select()
      .from(plantillasCertificado)
      .where(eq(plantillasCertificado.id, plantillaId))
      .limit(1);
    if (!plantilla) throw new Error('La plantilla ya no existe');

    const elementos = await cargarElementos(plantillaId);

    const [instructor] = await db
      .select()
      .from(instructores)
      .where(eq(instructores.id, context.instructorId))
      .limit(1);
    if (!instructor) throw new Error('El instructor no existe');

    const carpeta = path.resolve(uploadsDir(), SUBFOLDER_GENERADOS, jobId);
    await mkdir(carpeta, { recursive: true });

    const fechaEmision = new Date().toLocaleDateString('es-BO');
    const codigo = await generarCodigoUnico();
    const qrBuffer = await generarQrBuffer(codigo);

    const contexto: CertificateVariableContext = {
      nombreEstudiante: `${instructor.nombres} ${instructor.apPaterno} ${instructor.apMaterno}`.trim(),
      nombreCurso: context.cursoNombre,
      grupo: `Grupo ${context.numero}`,
      notaFinal: 0,
      fechaEmision,
    };

    const paginas = [
      {
        fondoRuta: plantilla.rutaFondo,
        fondoAncho: plantilla.ancho,
        fondoAlto: plantilla.alto,
        elementos,
        contexto,
        codigoVerificacion: codigo,
        qrBuffer,
      },
    ];

    const pdfRuta = path.join(carpeta, job.nombreArchivo ?? `certificado_${jobId}.pdf`);
    await renderizarCertificadosEnPdf(pdfRuta, paginas);

    await db.insert(certificadosEmitidos).values({
      codigo,
      tipo: 'instructor',
      destinatarioTipo: 'instructor',
      destinatarioId: instructor.id,
      plantillaId,
      grupoId: groupId,
      cursoId: context.cursoId,
      fechaEmision,
      metadata: metadataInstructor(instructor, context),
    });

    job.zipRutaInterna = pdfRuta;
    job.procesados = 1;
    job.total = 1;
    job.estado = 'listo';
  } catch (error) {
    job.estado = 'error';
    job.mensajeError = error instanceof Error ? error.message : 'Error al generar';
  }
};

export const verificarCertificado = async (
  codigo: string
): Promise<{ ok: true; value: any } | { ok: false; reason: 'not_found' }> => {
  const [fila] = await db
    .select({
      certificado: certificadosEmitidos,
      estudiante: estudiantes,
      instructor: instructores,
      curso: cursos,
      grupo: grupos,
    })
    .from(certificadosEmitidos)
    .leftJoin(
      estudiantes,
      and(eq(certificadosEmitidos.destinatarioTipo, 'estudiante'), eq(certificadosEmitidos.destinatarioId, estudiantes.id))
    )
    .leftJoin(
      instructores,
      and(eq(certificadosEmitidos.destinatarioTipo, 'instructor'), eq(certificadosEmitidos.destinatarioId, instructores.id))
    )
    .leftJoin(cursos, eq(certificadosEmitidos.cursoId, cursos.id))
    .leftJoin(grupos, eq(certificadosEmitidos.grupoId, grupos.id))
    .where(eq(certificadosEmitidos.codigo, codigo))
    .limit(1);

  if (!fila || !fila.certificado) return { ok: false, reason: 'not_found' };

  const c = fila.certificado;
  const meta = (c.metadata as Record<string, unknown>) || {};

  const nombreEstudiante =
    (meta.nombre as string) ||
    (fila.estudiante
      ? `${fila.estudiante.nombres} ${fila.estudiante.apPaterno} ${fila.estudiante.apMaterno}`.trim()
      : fila.instructor
        ? `${fila.instructor.nombres} ${fila.instructor.apPaterno} ${fila.instructor.apMaterno}`.trim()
        : '');

  const ci = (meta.ci as string) || fila.estudiante?.ci || fila.instructor?.ci || null;
  const codSis = (meta.codSis as string) || fila.estudiante?.codSis || null;
  const cargo = (meta.cargo as string) || fila.instructor?.cargo || null;

  const nombreCurso = (meta.curso as string) || fila.curso?.nombreCurso || '';
  const horas =
    typeof meta.horas === 'number'
      ? meta.horas
      : fila.curso?.duracionHoras ?? null;
  const grupoNum =
    typeof meta.grupo === 'number' ? meta.grupo : fila.grupo?.numGrupo ?? null;
  const periodo = (meta.periodo as string) || fila.curso?.periodo || null;
  const fechaIni = (meta.fechaIni as string) || fila.curso?.fechaIni || null;
  const fechaFin = (meta.fechaFin as string) || fila.curso?.fechaFin || null;

  const tipo = (meta.tipo as string) || c.tipo || '';
  const tipoLower = tipo.toLowerCase();
  const tipoCertificado =
    tipoLower === 'aprobacion'
      ? 'Aprobación'
      : tipoLower === 'asistencia'
        ? 'Asistencia'
        : tipoLower === 'instructor'
          ? 'Instructor'
          : tipo || '';

  const fechaEmision = c.fechaEmision
    ? c.fechaEmision.includes('-')
      ? c.fechaEmision
      : (() => {
          const p = c.fechaEmision.split('/');
          if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
          return c.fechaEmision;
        })()
    : null;

  return {
    ok: true,
    value: {
      codigo: c.codigo,
      codigo_qr: c.codigo,
      valido: true,
      tipo: c.tipo,
      tipo_codigo: tipoLower,
      tipo_certificado: tipoCertificado,
      destinatarioTipo: c.destinatarioTipo,
      destinatarioId: c.destinatarioId,
      cursoId: c.cursoId,
      grupoId: c.grupoId,
      fechaEmision,
      fecha_emision: fechaEmision,
      nombre_estudiante: nombreEstudiante,
      ci_estudiante: ci,
      cod_sis: codSis,
      cargo,
      nombre_curso: nombreCurso,
      horas,
      grupo: grupoNum,
      periodo,
      fecha_inicio: fechaIni,
      fecha_fin: fechaFin,
    },
  };
};
