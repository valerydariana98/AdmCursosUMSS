import { and, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { Instructor } from 'shared';
import { db } from '../db/index.js';
import { grupos, instructores, usuarios } from '../db/schema.js';
import type { CreateInstructorInput, InstructorsQuery } from '../schemas/instructor.schema.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const PG_UNIQUE_VIOLATION = '23505';

export type CreateInstructorFailure = 'ci_taken' | 'email_taken' | 'username_taken';

export type CreateInstructorResult =
  | { ok: true; instructor: Instructor }
  | { ok: false; reason: CreateInstructorFailure };

export type UpdateInstructorResult =
  | { ok: true; instructor: Instructor }
  | { ok: false; reason: CreateInstructorFailure | 'not_found' };

const instructorColumns = {
  id: instructores.id,
  usuarioId: instructores.usuarioId,
  nombres: instructores.nombres,
  apPaterno: instructores.apPaterno,
  apMaterno: instructores.apMaterno,
  estado: instructores.estado,
  telefono: instructores.telefono,
  ci: instructores.ci,
  cargo: instructores.cargo,
  email: usuarios.email,
  username: usuarios.username,
  gruposAsignadosCount: count(grupos.id),
};

// Traduce el error 23505 de Postgres al motivo de conflicto que entiende el controller.
// Drizzle envuelve el error del driver en DrizzleQueryError, por eso se revisa el `cause`.
const resolveUniqueViolation = (error: unknown): CreateInstructorFailure | null => {
  if (typeof error !== 'object' || error === null) return null;

  const { code, constraint } = error as { code?: string; constraint?: string };
  if (code === PG_UNIQUE_VIOLATION) {
    if (constraint === 'instructores_ci_unico') return 'ci_taken';
    if (constraint === 'usuarios_email_unique') return 'email_taken';
    if (constraint === 'usuarios_username_unique') return 'username_taken';
  }

  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) return resolveUniqueViolation(cause);

  return null;
};

export const listInstructors = async (query: InstructorsQuery = {}) => {
  const { search, estado, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = query;

  const filters: SQL[] = [];

  if (search) {
    const pattern = `%${search}%`;
    const nameFilter = or(
      ilike(instructores.nombres, pattern),
      ilike(instructores.apPaterno, pattern),
      ilike(instructores.apMaterno, pattern),
      ilike(instructores.ci, pattern)
    );
    filters.push(nameFilter!);
  }

  if (estado !== undefined) {
    filters.push(eq(instructores.estado, estado));
  }

  const where = filters.length > 0 ? and(...filters) : undefined;
  const offset = (page - 1) * limit;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select(instructorColumns)
      .from(instructores)
      .leftJoin(usuarios, eq(instructores.usuarioId, usuarios.id))
      .leftJoin(grupos, eq(grupos.idInstructor, instructores.id))
      .where(where)
      .groupBy(instructores.id, usuarios.email, usuarios.username)
      .orderBy(instructores.apPaterno, instructores.nombres)
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(instructores)
      .leftJoin(usuarios, eq(instructores.usuarioId, usuarios.id))
      .where(where),
  ]);

  const total = totalRow.value;

  return {
    data: rows as Instructor[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getInstructorById = async (id: number): Promise<Instructor | null> => {
  const [row] = await db
    .select(instructorColumns)
    .from(instructores)
    .leftJoin(usuarios, eq(instructores.usuarioId, usuarios.id))
    .leftJoin(grupos, eq(grupos.idInstructor, instructores.id))
    .where(eq(instructores.id, id))
    .groupBy(instructores.id, usuarios.email, usuarios.username);

  return (row as Instructor | undefined) ?? null;
};

export const createInstructor = async (
  data: CreateInstructorInput
): Promise<CreateInstructorResult> => {
  try {
    return await db.transaction(async (tx) => {
      // La contraseña inicial del docente es su CI (ver InstructorFormPage).
      const [usuario] = await tx
        .insert(usuarios)
        .values({
          username: data.username,
          email: data.email,
          password: data.ci,
          rol: 'DOCENTE',
        })
        .returning();

      const [instructor] = await tx
        .insert(instructores)
        .values({
          usuarioId: usuario.id,
          nombres: data.nombres,
          apPaterno: data.apPaterno,
          apMaterno: data.apMaterno,
          estado: data.estado,
          telefono: data.telefono,
          ci: data.ci,
          cargo: data.cargo,
        })
        .returning();

      return {
        ok: true as const,
        instructor: {
          ...instructor,
          email: data.email,
          username: data.username,
          gruposAsignadosCount: 0,
        },
      };
    });
  } catch (error) {
    const reason = resolveUniqueViolation(error);
    if (reason) return { ok: false, reason };
    throw error;
  }
};

export const updateInstructor = async (
  id: number,
  data: CreateInstructorInput
): Promise<UpdateInstructorResult> => {
  try {
    const outcome = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: instructores.id, usuarioId: instructores.usuarioId })
        .from(instructores)
        .where(eq(instructores.id, id));

      if (!existing) return { status: 'not_found' as const };

      await tx
        .update(instructores)
        .set({
          nombres: data.nombres,
          apPaterno: data.apPaterno,
          apMaterno: data.apMaterno,
          ci: data.ci,
          telefono: data.telefono,
          cargo: data.cargo,
          estado: data.estado,
        })
        .where(eq(instructores.id, id));

      // El correo y el usuario viven en `usuarios`. La contraseña NO se toca:
      // se congela en el alta y no debe pisarse si el docente ya la cambió.
      if (existing.usuarioId) {
        await tx
          .update(usuarios)
          .set({ email: data.email, username: data.username })
          .where(eq(usuarios.id, existing.usuarioId));
      }

      return { status: 'updated' as const };
    });

    if (outcome.status === 'not_found') return { ok: false, reason: 'not_found' };

    // Se relee la fila completa para devolver el mismo shape que devuelve el listado.
    const instructor = await getInstructorById(id);
    if (!instructor) return { ok: false, reason: 'not_found' };

    return { ok: true, instructor };
  } catch (error) {
    const reason = resolveUniqueViolation(error);
    if (reason) return { ok: false, reason };
    throw error;
  }
};
