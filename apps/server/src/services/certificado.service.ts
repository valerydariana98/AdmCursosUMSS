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
import { randomInt } from 'node:crypto';
import { mkdir, readFile, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import { and, eq, inArray } from 'drizzle-orm';
import {
  CERTIFICATE_CODE_ALPHABET,
  CERTIFICATE_CODE_PATTERN,
  CERTIFICATE_CONDITION_LABEL,
  computeFinalGrade,
  resolveCertificateCondition,
  toPercentageHundredths,
  type CertificateCondition,
  type CertificateJob,
  type CertificateJobState,
  normalizeCertificateCode,
  type CertificateData,
  type CertificatePreview,
  type CertificateVerification,
  type PlantillaAutoridad,
} from 'shared';
import { db } from '../db/index.js';
import {
  cursos,
  estudiantes,
  grupos,
  inscripciones,
  certificadosEmitidos,
  instructores,
  plantillaAutoridades,
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
  | 'curso_no_finalizado'
  | 'job_not_found';

export type CertificadoResult<T> = { ok: true; value: T } | { ok: false; reason: CertificadoFailure };

interface GrupoContexto {
  id: number;
  numero: number;
  cursoId: number;
  cursoNombre: string;
  instructorId: number;
  passingGrade: number;
  maxAbsences: number;
  // `cursos.estado` es true mientras el curso está activo; los certificados
  // solo se emiten para cursos finalizados (issue #97, #99).
  cursoActivo: boolean;
  // Datos que se imprimen en el certificado.
  duracionHoras: number;
  fechaIni: string;
  fechaFin: string;
  periodo: string;
}

const cargarGrupoContexto = async (groupId: number): Promise<GrupoContexto | null> => {
  const [fila] = await db
    .select({
      id: grupos.id,
      numero: grupos.numGrupo,
      cursoId: grupos.idCurso,
      cursoNombre: cursos.nombreCurso,
      instructorId: grupos.idInstructor,
      passingGrade: cursos.notaMin,
      maxAbsences: cursos.maxFaltas,
      cursoActivo: cursos.estado,
      duracionHoras: cursos.duracionHoras,
      fechaIni: cursos.fechaIni,
      fechaFin: cursos.fechaFin,
      periodo: cursos.periodo,
    })
    .from(grupos)
    .innerJoin(cursos, eq(grupos.idCurso, cursos.id))
    .where(eq(grupos.id, groupId))
    .limit(1);

  return fila ?? null;
};

interface EstudianteRow {
  id: number;
  nombres: string;
  apPaterno: string;
  apMaterno: string;
}

const cargarEstudiantes = async (groupId: number): Promise<EstudianteRow[]> =>
  db
    .select({
      id: estudiantes.id,
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
  const nombre = limpiarNombreArchivo(`${estudiante.apPaterno}${estudiante.nombres}`) || 'estudiante';
  const curso = limpiarNombreArchivo(cursoNombre) || 'curso';

  return `Certificado_${nombre}_${curso}.pdf`;
};

/** Datos impresos en un certificado de estudiante o de instructor. */
const datosCertificado = (
  context: GrupoContexto,
  tipo: CertificateData['tipo'],
  destinatario: string
): CertificateData => ({
  tipo,
  destinatario,
  curso: context.cursoNombre,
  duracionHoras: context.duracionHoras,
  fechaIni: context.fechaIni,
  fechaFin: context.fechaFin,
  grupo: context.numero,
  periodo: context.periodo,
});

// Reciben certificado los que aprobaron y los que solo cumplieron la asistencia
// (issue #101); la condición decide el título.
const esElegible = (evaluado: EstudianteEvaluado) =>
  evaluado.condicion === 'aprobacion' || evaluado.condicion === 'asistencia';

const tipoCertificado = (evaluado: EstudianteEvaluado): 'aprobacion' | 'asistencia' =>
  evaluado.condicion === 'aprobacion' ? 'aprobacion' : 'asistencia';

/** Quita acentos y todo lo que no sea letra o número, para nombres de archivo. */
const limpiarNombreArchivo = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');

interface Emision {
  tipo: 'aprobacion' | 'asistencia' | 'instructor';
  destinatarioTipo: 'estudiante' | 'instructor';
  destinatarioId: number;
  nombre: string;
  plantillaId: number;
  context: GrupoContexto;
}

/**
 * Código de verificación del certificado. Si ese certificado ya se emitió antes
 * (mismo destinatario, grupo y tipo) se reutiliza su código: regenerar el lote no
 * debe dejar varios códigos válidos para el mismo documento.
 */
const obtenerCodigo = async (emision: Emision): Promise<string> => {
  const [existente] = await db
    .select({ codigo: certificadosEmitidos.codigo })
    .from(certificadosEmitidos)
    .where(
      and(
        eq(certificadosEmitidos.destinatarioTipo, emision.destinatarioTipo),
        eq(certificadosEmitidos.destinatarioId, emision.destinatarioId),
        eq(certificadosEmitidos.grupoId, emision.context.id),
        eq(certificadosEmitidos.tipo, emision.tipo)
      )
    )
    .limit(1);

  if (existente && CERTIFICATE_CODE_PATTERN.test(existente.codigo)) return existente.codigo;

  const codigo = generarCodigoVerificacion();

  await db.insert(certificadosEmitidos).values({
    codigo,
    tipo: emision.tipo,
    destinatarioTipo: emision.destinatarioTipo,
    destinatarioId: emision.destinatarioId,
    plantillaId: emision.plantillaId,
    grupoId: emision.context.id,
    cursoId: emision.context.cursoId,
    fechaEmision: new Date().toLocaleDateString('es-BO'),
    metadata: { nombre: emision.nombre },
  });

  return codigo;
};

/** Datos, código y QR de una página de certificado. */
const prepararEmision = async (emision: Emision) => ({
  datos: datosCertificado(emision.context, emision.tipo, emision.nombre),
  codigoVerificacion: await obtenerCodigo(emision),
  qrBuffer: await cargarQrVerificacion(),
});

// Las autoridades van en una posición fija por diseño (issue #97, #99): la
// tabla no guarda coordenadas, solo título, nombre y el orden de la fila.
const cargarAutoridades = async (plantillaId: number): Promise<PlantillaAutoridad[]> => {
  const filas = await db
    .select()
    .from(plantillaAutoridades)
    .where(eq(plantillaAutoridades.idPlantilla, plantillaId))
    .orderBy(plantillaAutoridades.orden);

  return filas.map((fila) => ({
    id: fila.id,
    titulo: fila.titulo,
    nombre: fila.nombre,
    orden: fila.orden,
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

  const { plantilla, totalEstudiantes, grupo, estudiantes } = preview.value;

  // Sin plantilla no se puede emitir: es preferible decirlo antes de que el
  // usuario pulse "generar" a que el proceso termine en error.
  if (!plantilla) return { ok: false, reason: 'sin_plantilla' };

  const context = await cargarGrupoContexto(groupId);
  if (!context) return { ok: false, reason: 'group_not_found' };
  if (context.cursoActivo) return { ok: false, reason: 'curso_no_finalizado' };

  const aprobados = estudiantes.filter(
    (e) => e.condicion === 'aprobacion' || e.condicion === 'asistencia'
  ).length;

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
    nombreArchivo: `Certificados_Estudiantes_${limpiarNombreArchivo(grupo.cursoNombre) || 'Curso'}_Grupo${grupo.numero}.zip`,
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

    const [autoridades, evaluados] = await Promise.all([
      cargarAutoridades(plantillaId),
      evaluarEstudiantes(groupId, context),
    ]);

    const elegibles = evaluados.filter(esElegible);

    const carpeta = path.resolve(uploadsDir(), SUBFOLDER_GENERADOS, jobId);
    await mkdir(carpeta, { recursive: true });

    const generados: string[] = [];

    for (const [indice, evaluado] of elegibles.entries()) {
      const nombre = nombreArchivoCertificado(evaluado.estudiante, context.cursoNombre);

      await renderizarCertificado({
        destino: path.join(carpeta, nombre),
        fondoRuta: plantilla.rutaFondo,
        fondoAncho: plantilla.ancho,
        fondoAlto: plantilla.alto,
        autoridades,
        ...(await prepararEmision({
          tipo: tipoCertificado(evaluado),
          destinatarioTipo: 'estudiante',
          destinatarioId: evaluado.estudiante.id,
          nombre: nombreCompleto(evaluado.estudiante),
          plantillaId,
          context,
        })),
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

// `randomInt` usa el generador criptográfico: con `Math.random` los códigos
// serían predecibles y alguien podría fabricar uno que verifique.
const generarCodigoVerificacion = (): string => {
  const grupo = () =>
    Array.from(
      { length: 5 },
      () => CERTIFICATE_CODE_ALPHABET[randomInt(CERTIFICATE_CODE_ALPHABET.length)]
    ).join('');
  return `${grupo()}-${grupo()}-${grupo()}`;
};

// El QR es el mismo en todos los certificados (lleva a la página donde se
// escribe el código), así que se lee del disco una sola vez.
const QR_VERIFICACION = path.resolve(process.cwd(), 'assets', 'certificados', 'qr-verificacion.png');
let qrVerificacion: Promise<Buffer> | null = null;

const cargarQrVerificacion = (): Promise<Buffer> => {
  qrVerificacion ??= readFile(QR_VERIFICACION);
  return qrVerificacion;
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
  if (context.cursoActivo) return { ok: false, reason: 'curso_no_finalizado' };

  const evaluados = await evaluarEstudiantes(groupId, context);
  const elegibles = evaluados.filter(esElegible);

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
    nombreArchivo: `Certificados_Estudiantes_${limpiarNombreArchivo(grupo.cursoNombre) || 'Curso'}_Grupo${grupo.numero}.pdf`,
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

    const autoridades = await cargarAutoridades(plantillaId);
    const evaluados = await evaluarEstudiantes(groupId, context);
    const elegibles = evaluados.filter(esElegible);

    const carpeta = path.resolve(uploadsDir(), SUBFOLDER_GENERADOS, jobId);
    await mkdir(carpeta, { recursive: true });

    const paginas: Parameters<typeof renderizarCertificadosEnPdf>[1] = [];

    for (const [indice, evaluado] of elegibles.entries()) {
      paginas.push({
        fondoRuta: plantilla.rutaFondo,
        fondoAncho: plantilla.ancho,
        fondoAlto: plantilla.alto,
        autoridades,
        ...(await prepararEmision({
          tipo: tipoCertificado(evaluado),
          destinatarioTipo: 'estudiante',
          destinatarioId: evaluado.estudiante.id,
          nombre: nombreCompleto(evaluado.estudiante),
          plantillaId,
          context,
        })),
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
  if (context.cursoActivo) return { ok: false, reason: 'curso_no_finalizado' };

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
    // El nombre del instructor recién se conoce al ejecutar; ahí se completa.
    nombreArchivo: `Certificado_Instructor_${limpiarNombreArchivo(context.cursoNombre) || 'Curso'}.pdf`,
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

    const autoridades = await cargarAutoridades(plantillaId);

    const [instructor] = await db
      .select()
      .from(instructores)
      .where(eq(instructores.id, context.instructorId))
      .limit(1);
    if (!instructor) throw new Error('El instructor no existe');

    const carpeta = path.resolve(uploadsDir(), SUBFOLDER_GENERADOS, jobId);
    await mkdir(carpeta, { recursive: true });

    const nombreInstructor =
      `${instructor.nombres} ${instructor.apPaterno} ${instructor.apMaterno}`.trim();

    // Nombre descriptivo de la HU #102: Certificado_Instructor_[Docente]_[Curso].pdf
    job.nombreArchivo =
      `Certificado_Instructor_${limpiarNombreArchivo(`${instructor.apPaterno}${instructor.nombres}`) || 'Instructor'}` +
      `_${limpiarNombreArchivo(context.cursoNombre) || 'Curso'}.pdf`;

    const paginas = [
      {
        fondoRuta: plantilla.rutaFondo,
        fondoAncho: plantilla.ancho,
        fondoAlto: plantilla.alto,
        autoridades,
        ...(await prepararEmision({
          tipo: 'instructor',
          destinatarioTipo: 'instructor',
          destinatarioId: instructor.id,
          nombre: nombreInstructor,
          plantillaId,
          context,
        })),
      },
    ];

    const pdfRuta = path.join(carpeta, job.nombreArchivo);
    await renderizarCertificadosEnPdf(pdfRuta, paginas);

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
  entrada: string
): Promise<{ ok: true; value: CertificateVerification } | { ok: false; reason: 'not_found' }> => {
  // Se acepta el código como lo tipee la persona (minúsculas, sin guiones). Los
  // códigos del formato anterior (`CERT-...`) no se normalizan y se buscan tal cual.
  const codigo = normalizeCertificateCode(entrada) ?? entrada.trim().toUpperCase();

  const [fila] = await db
    .select({
      certificado: certificadosEmitidos,
      curso: cursos.nombreCurso,
      grupo: grupos.numGrupo,
    })
    .from(certificadosEmitidos)
    .innerJoin(cursos, eq(certificadosEmitidos.cursoId, cursos.id))
    .innerJoin(grupos, eq(certificadosEmitidos.grupoId, grupos.id))
    .where(eq(certificadosEmitidos.codigo, codigo))
    .limit(1);

  if (!fila) return { ok: false, reason: 'not_found' };

  const { certificado } = fila;

  return {
    ok: true,
    value: {
      codigo: certificado.codigo,
      tipo: certificado.tipo,
      destinatarioTipo: certificado.destinatarioTipo,
      destinatario: String(certificado.metadata?.nombre ?? ''),
      curso: fila.curso,
      grupo: fila.grupo,
      fechaEmision: certificado.fechaEmision,
    },
  };
};
