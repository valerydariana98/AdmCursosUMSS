// apps/server/src/services/plantillas.service.ts
// CRUD de plantillas de certificado (HU-01, HU-02).
//
// Una plantilla es una imagen de fondo más un conjunto de elementos con
// coordenadas porcentuales. Al guardar, el servidor reemplaza el conjunto
// completo de elementos en una transacción: es lo que hace que eliminar un
// bloque del diagramador no necesite una operación aparte, y que un guardado a
// medias nunca deje media plantilla.
//
// La autorización es la misma que el resto de los módulos por grupo: el ADMIN
// administra todas las plantillas y el DOCENTE solo las de sus grupos.

import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';
import {
  CERTIFICATE_PERCENT_SCALE,
  type CreatePlantilla,
  type PlantillaCertificadoView,
  type PlantillaElementoInput,
  type PlantillaElementoView,
  type PlantillaListItem,
  type ResolvedPlantilla,
  type UpdatePlantilla,
} from 'shared';
import { db } from '../db/index.js';
import {
  cursos,
  grupos,
  plantillaAutoridades,
  plantillaElementos,
  plantillasCertificado,
} from '../db/schema.js';
import {
  SUBFOLDER_FONDO,
  eliminarArchivo,
  guardarComoWebp,
} from './imagen.service.js';
import { resolveGroupOwnershipFailure } from './groupOwnership.js';
import type { GroupOwnershipFailure } from './groupOwnership.js';

export type PlantillaFailure =
  | GroupOwnershipFailure
  | 'plantilla_not_found'
  | 'curso_not_found'
  | 'grupo_not_found'
  | 'grupo_no_pertenece_curso'
  | 'grupo_ya_tiene_plantilla'
  | 'fondo_obligatorio'
  | 'sin_elementos';

export type PlantillaResult<T> = { ok: true; value: T } | { ok: false; reason: PlantillaFailure };

// Quién está operando. El ADMIN no tiene fila en `instructores`, así que su
// `teacherId` llega en null y es el flag `isAdmin` el que le da acceso a todo.
export interface PlantillaActor {
  teacherId: number | null;
  isAdmin: boolean;
}

interface PlantillaRow {
  id: number;
  nombre: string;
  idCurso: number;
  idGrupo: number | null;
  destinatarioTipo: 'estudiante' | 'instructor';
  rutaFondo: string;
  ancho: number;
  alto: number;
  createdAt: Date;
  updatedAt: Date;
}

const toApi = (row: PlantillaRow, autoridades: { id?: number; titulo: string; nombre: string; orden: number }[] = []) => ({
  id: row.id,
  nombre: row.nombre,
  idCurso: row.idCurso,
  idGrupo: row.idGrupo,
  destinatarioTipo: row.destinatarioTipo,
  rutaFondo: row.rutaFondo,
  ancho: row.ancho,
  alto: row.alto,
  autoridades,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * Decide si el actor puede tocar una plantilla. El docente tiene que ser el
 * dueño del grupo de la plantilla; si la plantilla es general del curso no
 * hay grupo contra el que comparar, así que se resuelve contra los grupos del
 * curso en `listarPlantillas`.
 */
const puedeEditar = (
  actor: PlantillaActor,
  fila: { idGrupo: number | null; instructorId: number | null }
): boolean => {
  if (actor.isAdmin) return true;
  if (actor.teacherId === null) return false;
  if (fila.idGrupo === null) return false;

  return fila.instructorId === actor.teacherId;
};

/**
 * Devuelve las plantillas que el actor puede ver, con los datos que pide el
 * listado: curso, grupo, cantidad de elementos y fecha de creación.
 */
export const listarPlantillas = async (
  filtros: { idCurso?: number | null; idGrupo?: number | null; destinatarioTipo?: 'estudiante' | 'instructor' },
  actor: PlantillaActor
): Promise<PlantillaListItem[]> => {
  const condiciones = [];

  if (filtros.idCurso) condiciones.push(eq(plantillasCertificado.idCurso, filtros.idCurso));
  if (filtros.idGrupo) condiciones.push(eq(plantillasCertificado.idGrupo, filtros.idGrupo));
  if (filtros.destinatarioTipo) condiciones.push(eq(plantillasCertificado.destinatarioTipo, filtros.destinatarioTipo));

  const filas = await db
    .select({
      plantilla: plantillasCertificado,
      cursoNombre: cursos.nombreCurso,
      grupoNumero: grupos.numGrupo,
      instructorId: grupos.idInstructor,
      cantidadElementos: count(plantillaElementos.id),
    })
    .from(plantillasCertificado)
    .innerJoin(cursos, eq(plantillasCertificado.idCurso, cursos.id))
    .leftJoin(grupos, eq(plantillasCertificado.idGrupo, grupos.id))
    .leftJoin(plantillaElementos, eq(plantillaElementos.idPlantilla, plantillasCertificado.id))
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .groupBy(
      plantillasCertificado.id,
      cursos.nombreCurso,
      grupos.numGrupo,
      grupos.idInstructor
    )
    .orderBy(plantillasCertificado.createdAt, plantillasCertificado.nombre);

  return filas
    // El ADMIN ve todas; el DOCENTE solo las de sus grupos.
    .filter((fila) =>
      actor.isAdmin || (actor.teacherId !== null && fila.instructorId === actor.teacherId)
    )
    .map((fila) => ({
      id: fila.plantilla.id,
      nombre: fila.plantilla.nombre,
      idCurso: fila.plantilla.idCurso,
      cursoNombre: fila.cursoNombre,
      idGrupo: fila.plantilla.idGrupo,
      grupoNumero: fila.grupoNumero,
      destinatarioTipo: fila.plantilla.destinatarioTipo,
      destino: fila.grupoNumero === null ? 'General del curso' : `Grupo ${fila.grupoNumero}`,
      cantidadElementos: fila.cantidadElementos,
      createdAt: fila.plantilla.createdAt.toISOString(),
      updatedAt: fila.plantilla.updatedAt.toISOString(),
      instructorId: fila.instructorId,
    }));
};

/** Trae la plantilla con sus elementos. */
export const obtenerPlantilla = async (
  id: number,
  actor: PlantillaActor
): Promise<PlantillaResult<PlantillaCertificadoView>> => {
  const [fila] = await db
    .select({
      plantilla: plantillasCertificado,
      cursoNombre: cursos.nombreCurso,
      grupoNumero: grupos.numGrupo,
      instructorId: grupos.idInstructor,
    })
    .from(plantillasCertificado)
    .innerJoin(cursos, eq(plantillasCertificado.idCurso, cursos.id))
    .leftJoin(grupos, eq(plantillasCertificado.idGrupo, grupos.id))
    .where(eq(plantillasCertificado.id, id))
    .limit(1);

  if (!fila) return { ok: false, reason: 'plantilla_not_found' };
  if (!puedeEditar(actor, { idGrupo: fila.plantilla.idGrupo, instructorId: fila.instructorId })) {
    return { ok: false, reason: 'forbidden' };
  }

  const [elementos, autoridades] = await Promise.all([
    db
      .select({ elemento: plantillaElementos })
      .from(plantillaElementos)
      .where(eq(plantillaElementos.idPlantilla, id))
      .orderBy(plantillaElementos.position),
    db
      .select()
      .from(plantillaAutoridades)
      .where(eq(plantillaAutoridades.idPlantilla, id))
      .orderBy(plantillaAutoridades.orden),
  ]);

  return {
    ok: true,
    value: {
      ...toApi(
        fila.plantilla,
        autoridades.map((a) => ({ id: a.id, titulo: a.titulo, nombre: a.nombre, orden: a.orden }))
      ),
      cursoNombre: fila.cursoNombre,
      grupoNumero: fila.grupoNumero,
      elementos: elementos.map(({ elemento }): PlantillaElementoView => ({
        ...elemento,
        bloqueado: elemento.bloqueado,
      })),
    },
  };
};

/**
 * Valida que los elementos del formulario sean coherentes antes de guardarlos.
 * Se separa de `crearPlantilla` para poder reutilizarla en crear, actualizar y
 * duplicar sin repetir las reglas tres veces.
 */
const validarElementos = async (
  elementos: PlantillaElementoInput[]
): Promise<PlantillaResult<true>> => {
  if (elementos.length === 0) return { ok: false, reason: 'sin_elementos' };

  return { ok: true, value: true };
};

// Los elementos llegan con `position` ya calculado por el cliente (es el orden
// de dibujado, y el cliente es quien conoce ese orden). Aquí solo se acotan los
// porcentajes a la ventana válida: un valor fuera de rango pondría texto fuera
// de la página sin avisar.
const prepararElementos = (elementos: PlantillaElementoInput[]) =>
  elementos.map((elemento, position) => {
    const acotar = (valor: number, porDefecto: number) =>
      Math.min(CERTIFICATE_PERCENT_SCALE, Math.max(0, valor));

    return {
      tipo: elemento.tipo,
      texto: elemento.tipo === 'texto' ? elemento.texto : null,
      xPercent: acotar(elemento.xPercent, 0),
      yPercent: acotar(elemento.yPercent, 0),
      anchoPercent: acotar(elemento.anchoPercent, CERTIFICATE_PERCENT_SCALE),
      alineacion: elemento.alineacion,
      fontSize: elemento.fontSize,
      fontFamily: elemento.fontFamily,
      color: elemento.color,
      bloqueado: elemento.bloqueado ?? false,
      position: elemento.position ?? position,
    };
  });

export const crearPlantilla = async (
  datos: CreatePlantilla & { fondoBuffer: Buffer },
  actor: PlantillaActor
): Promise<PlantillaResult<{ id: number }>> => {
  // La asociación se valida antes de tocar el disco: si el grupo ya tiene
  // plantilla, no tiene sentido dejar una imagen huérfana.
  const [curso] = await db
    .select({ id: cursos.id })
    .from(cursos)
    .where(eq(cursos.id, datos.idCurso))
    .limit(1);

  if (!curso) return { ok: false, reason: 'curso_not_found' };

  let instructorId: number | null = null;

  if (datos.idGrupo !== null) {
    const [grupo] = await db
      .select({ id: grupos.id, idCurso: grupos.idCurso, instructorId: grupos.idInstructor })
      .from(grupos)
      .where(eq(grupos.id, datos.idGrupo))
      .limit(1);

    if (!grupo) return { ok: false, reason: 'grupo_not_found' };
    if (grupo.idCurso !== datos.idCurso) {
      return { ok: false, reason: 'grupo_no_pertenece_curso' };
    }

    instructorId = grupo.instructorId;

    if (!actor.isAdmin && actor.teacherId !== grupo.instructorId) {
      return { ok: false, reason: 'forbidden' };
    }

    const [yaExiste] = await db
      .select({ id: plantillasCertificado.id })
      .from(plantillasCertificado)
      .where(eq(plantillasCertificado.idGrupo, datos.idGrupo))
      .limit(1);

    if (yaExiste) return { ok: false, reason: 'grupo_ya_tiene_plantilla' };
  } else if (!actor.isAdmin) {
    // Una plantilla general la crea el administrador: es una decisión que
    // afecta a todos los grupos del curso, no a los grupos de un docente.
    return { ok: false, reason: 'forbidden' };
  }

  const validados = await validarElementos(datos.elementos);

  if (!validados.ok) return validados;

  const rutaFondo = await guardarComoWebp(datos.fondoBuffer, SUBFOLDER_FONDO);

  try {
    const resultado = await db.transaction(async (tx) => {
      const [plantilla] = await tx
        .insert(plantillasCertificado)
        .values({
          nombre: datos.nombre.trim(),
          idCurso: datos.idCurso,
          idGrupo: datos.idGrupo,
          destinatarioTipo: datos.destinatarioTipo ?? 'estudiante',
          rutaFondo,
          ancho: datos.ancho,
          alto: datos.alto,
        })
        .returning();

      await tx.insert(plantillaElementos).values(
        prepararElementos(datos.elementos).map((elemento) => ({
          ...elemento,
          idPlantilla: plantilla.id,
        }))
      );

      if (datos.autoridades && datos.autoridades.length > 0) {
        await tx.insert(plantillaAutoridades).values(
          datos.autoridades.map((a, index) => ({
            idPlantilla: plantilla.id,
            titulo: a.titulo,
            nombre: a.nombre,
            orden: a.orden ?? index,
          }))
        );
      }

      return plantilla;
    });

    // El instructor se conserva solo para decidir permisos en el listado; no
    // hace falta devolverlo.
    void instructorId;

    return { ok: true, value: { id: resultado.id } };
  } catch (error) {
    await eliminarArchivo(rutaFondo);
    throw error;
  }
};

export const actualizarPlantilla = async (
  id: number,
  datos: UpdatePlantilla,
  actor: PlantillaActor
): Promise<PlantillaResult<{ id: number }>> => {
  const actual = await db
    .select({
      id: plantillasCertificado.id,
      idGrupo: plantillasCertificado.idGrupo,
      instructorId: grupos.idInstructor,
    })
    .from(plantillasCertificado)
    .leftJoin(grupos, eq(plantillasCertificado.idGrupo, grupos.id))
    .where(eq(plantillasCertificado.id, id))
    .limit(1);

  const fila = actual[0];

  if (!fila) return { ok: false, reason: 'plantilla_not_found' };
  if (!puedeEditar(actor, { idGrupo: fila.idGrupo, instructorId: fila.instructorId })) {
    return { ok: false, reason: 'forbidden' };
  }

  const validados = await validarElementos(datos.elementos);

  if (!validados.ok) return validados;

  // La imagen de fondo no se reemplaza al editar: cambiar el fondo invalidaría
  // todas las posiciones ya ajustadas, así que el editor obliga a crear una
  // plantilla nueva en vez de dejar un diseño descolocado.
  await db.transaction(async (tx) => {
    await tx
      .update(plantillasCertificado)
      .set({
        nombre: datos.nombre.trim(),
        destinatarioTipo: datos.destinatarioTipo ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(plantillasCertificado.id, id));

    await tx.delete(plantillaElementos).where(eq(plantillaElementos.idPlantilla, id));
    await tx.delete(plantillaAutoridades).where(eq(plantillaAutoridades.idPlantilla, id));

    await tx.insert(plantillaElementos).values(
      prepararElementos(datos.elementos).map((elemento) => ({ ...elemento, idPlantilla: id }))
    );

    if (datos.autoridades && datos.autoridades.length > 0) {
      await tx.insert(plantillaAutoridades).values(
        datos.autoridades.map((a, index) => ({
          idPlantilla: id,
          titulo: a.titulo,
          nombre: a.nombre,
          orden: a.orden ?? index,
        }))
      );
    }
  });

  return { ok: true, value: { id } };
};

export const eliminarPlantilla = async (
  id: number,
  actor: PlantillaActor
): Promise<PlantillaResult<null>> => {
  const [fila] = await db
    .select({
      rutaFondo: plantillasCertificado.rutaFondo,
      idGrupo: plantillasCertificado.idGrupo,
      instructorId: grupos.idInstructor,
    })
    .from(plantillasCertificado)
    .leftJoin(grupos, eq(plantillasCertificado.idGrupo, grupos.id))
    .where(eq(plantillasCertificado.id, id))
    .limit(1);

  if (!fila) return { ok: false, reason: 'plantilla_not_found' };
  if (!puedeEditar(actor, { idGrupo: fila.idGrupo, instructorId: fila.instructorId })) {
    return { ok: false, reason: 'forbidden' };
  }

  // Los elementos se van por cascade.
  await db.delete(plantillasCertificado).where(eq(plantillasCertificado.id, id));
  await eliminarArchivo(fila.rutaFondo);

  return { ok: true, value: null };
};

/**
 * Copia una plantilla con sus elementos y las mismas coordenadas. La copia
 * hereda curso y grupo del original; el nombre lleva "(copia)" para que se
 * distinga de un vistazo en el listado.
 */
export const duplicarPlantilla = async (
  id: number,
  actor: PlantillaActor,
  nombreSugerido?: string
): Promise<PlantillaResult<{ id: number; nombre: string }>> => {
  const original = await obtenerPlantilla(id, actor);

  if (!original.ok) return original;

  const plantilla = original.value;
  const nombre = nombreSugerido?.trim() || `${plantilla.nombre} (copia)`;

  // El original tiene grupo propio, así que la copia no puede ocupar el sitio
  // que ya está tomado: si hubiera otra plantilla de ese curso sin grupo, se
  // guarda ahí, porque es el único hueco libre que el modelo admite.
  const destinoIdGrupo =
    plantilla.idGrupo === null ? null : await buscarIdGrupoLibre(plantilla.idCurso);

  const [creada] = await db
    .insert(plantillasCertificado)
    .values({
      nombre,
      idCurso: plantilla.idCurso,
      idGrupo: destinoIdGrupo,
      destinatarioTipo: plantilla.destinatarioTipo,
      rutaFondo: plantilla.rutaFondo,
      ancho: plantilla.ancho,
      alto: plantilla.alto,
    })
    .returning();

  if (plantilla.autoridades && plantilla.autoridades.length > 0) {
    await db.insert(plantillaAutoridades).values(
      plantilla.autoridades.map((a, index) => ({
        idPlantilla: creada.id,
        titulo: a.titulo,
        nombre: a.nombre,
        orden: a.orden ?? index,
      }))
    );
  }

  // Los elementos se insertan con los valores crudos de la plantilla original:
  // el mismo conjunto, sin volver a pasar por las validaciones de formato.
  const filas = plantilla.elementos.map((elemento) => ({
    idPlantilla: creada.id,
    tipo: elemento.tipo,
    texto: elemento.texto,
    xPercent: elemento.xPercent,
    yPercent: elemento.yPercent,
    anchoPercent: elemento.anchoPercent,
    alineacion: elemento.alineacion,
    fontSize: elemento.fontSize,
    fontFamily: elemento.fontFamily,
    color: elemento.color,
    position: elemento.position,
  }));

  if (filas.length > 0) await db.insert(plantillaElementos).values(filas);

  return { ok: true, value: { id: creada.id, nombre } };
};

/**
 * Primer grupo del curso sin plantilla propia. La copia de una plantilla de
 * grupo no puede quedarse con el mismo grupo (el modelo admite una sola), así que
 * se busca otro grupo libre; si el curso no tiene ninguno, la copia queda como
 * plantilla general, que es un destino válido y no colisiona con nada.
 */
const buscarIdGrupoLibre = async (idCurso: number): Promise<number | null> => {
  const gruposDelCurso = await db
    .select({ id: grupos.id })
    .from(grupos)
    .where(eq(grupos.idCurso, idCurso));

  if (gruposDelCurso.length === 0) return null;

  const ocupados = await db
    .select({ idGrupo: plantillasCertificado.idGrupo })
    .from(plantillasCertificado)
    .where(isNotNull(plantillasCertificado.idGrupo));

  const idsOcupados = new Set(ocupados.map((fila) => fila.idGrupo));

  return gruposDelCurso.find((grupo) => !idsOcupados.has(grupo.id))?.id ?? null;
};

/**
 * Plantilla que corresponde a un grupo: la del grupo si existe, y si no la
 * general del curso. `origen` le dice al cliente cuál se está usando para que la
 * interfaz lo muestre en vez de generar un certificado con un fondo que el
 * usuario nunca eligió.
 */
export const resolverPlantillaParaGrupo = async (
  idCurso: number,
  idGrupo: number
): Promise<ResolvedPlantilla | null> => {
  const [delGrupo] = await db
    .select({ plantilla: plantillasCertificado })
    .from(plantillasCertificado)
    .where(eq(plantillasCertificado.idGrupo, idGrupo))
    .limit(1);

  if (delGrupo) {
    const autoridades = await db
      .select()
      .from(plantillaAutoridades)
      .where(eq(plantillaAutoridades.idPlantilla, delGrupo.plantilla.id))
      .orderBy(plantillaAutoridades.orden);
    return {
      plantilla: toApi(
        delGrupo.plantilla,
        autoridades.map((a) => ({ id: a.id, titulo: a.titulo, nombre: a.nombre, orden: a.orden }))
      ),
      origen: 'grupo',
    };
  }

  const [delCurso] = await db
    .select({ plantilla: plantillasCertificado })
    .from(plantillasCertificado)
    .where(
      and(eq(plantillasCertificado.idCurso, idCurso), isNull(plantillasCertificado.idGrupo))
    )
    .limit(1);

  if (delCurso) {
    const autoridades = await db
      .select()
      .from(plantillaAutoridades)
      .where(eq(plantillaAutoridades.idPlantilla, delCurso.plantilla.id))
      .orderBy(plantillaAutoridades.orden);
    return {
      plantilla: toApi(
        delCurso.plantilla,
        autoridades.map((a) => ({ id: a.id, titulo: a.titulo, nombre: a.nombre, orden: a.orden }))
      ),
      origen: 'curso',
    };
  }

  return null;
};