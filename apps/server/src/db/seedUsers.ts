// Usuarios de prueba para entornos locales y CI.
//
// La regla de negocio no cambia: hay un único ADMIN, lo provee el desarrollador
// y la aplicación no ofrece forma de crear admins. Esto existe solo para que una
// base vacía (Docker local, CI) tenga con quién iniciar sesión.
//
// Las credenciales salen exclusivamente de variables de entorno. Si no están
// definidas no se crea nada: no hay valores por defecto en el código, así que
// el seed nunca puede dejar credenciales conocidas en producción.
import { eq, or } from 'drizzle-orm';
import type { CurrentTeacher } from '../auth/currentTeacher.js';
import { hashPassword } from '../services/auth.service.js';
import { db } from './index.js';
import { instructores, usuarios } from './schema.js';

type SeedRole = 'ADMIN' | 'DOCENTE';

export interface SeedCredentials {
  username: string;
  email: string;
  password: string;
}

// Datos fijos del instructor de prueba. El CI es ficticio y fijo para que el
// seed sea idempotente (instructores.ci es único).
const SEED_INSTRUCTOR = {
  nombres: 'Docente',
  apPaterno: 'Prueba',
  apMaterno: 'QA',
  estado: true,
  telefono: '70000000',
  ci: '8000001',
  cargo: 'Docente de prueba',
} as const;

// Devuelve las credenciales solo si las tres variables del rol están definidas.
export const readSeedCredentials = (
  role: SeedRole,
  env: NodeJS.ProcessEnv = process.env
): SeedCredentials | null => {
  const username = env[`SEED_${role}_USERNAME`]?.trim();
  const email = env[`SEED_${role}_EMAIL`]?.trim();
  const password = env[`SEED_${role}_PASSWORD`];

  if (!username || !email || !password) return null;

  return { username, email, password };
};

const findUserByUsernameOrEmail = async ({ username, email }: SeedCredentials) => {
  const [user] = await db
    .select({ id: usuarios.id, username: usuarios.username, rol: usuarios.rol })
    .from(usuarios)
    .where(or(eq(usuarios.username, username), eq(usuarios.email, email)))
    .limit(1);

  return user ?? null;
};

// Crea el ADMIN de prueba si todavía no hay ningún ADMIN en la base.
// Devuelve el id del ADMIN creado, o null si no creó nada.
export const seedAdminUser = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<number | null> => {
  const creds = readSeedCredentials('ADMIN', env);

  if (!creds) {
    console.log('⏭️  SEED_ADMIN_* no definidas: no se crea el ADMIN de prueba.');
    return null;
  }

  // Un solo ADMIN: si ya hay uno (por ejemplo el que conserva db/reset.ts),
  // no se crea otro.
  const [existingAdmin] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.rol, 'ADMIN'))
    .limit(1);

  if (existingAdmin) {
    console.log(`👑 Ya existe un ADMIN (#${existingAdmin.id}): no se crea otro.`);
    return null;
  }

  const taken = await findUserByUsernameOrEmail(creds);

  if (taken) {
    console.warn(
      `⚠️  El usuario o email de SEED_ADMIN_* ya lo usa el usuario #${taken.id} ` +
        `(${taken.rol}): no se crea el ADMIN de prueba.`
    );
    return null;
  }

  const [admin] = await db
    .insert(usuarios)
    .values({
      username: creds.username,
      email: creds.email,
      password: await hashPassword(creds.password),
      rol: 'ADMIN',
    })
    .returning({ id: usuarios.id });

  console.log(`👑 ADMIN de prueba creado: ${creds.username} (#${admin.id}).`);
  return admin.id;
};

// Crea (o completa) el DOCENTE de prueba con su fila en `instructores`.
// Devuelve el instructor ligado, o null si las variables no están definidas
// o las credenciales chocan con otro usuario.
export const seedDocenteUser = async (
  env: NodeJS.ProcessEnv = process.env
): Promise<CurrentTeacher | null> => {
  const creds = readSeedCredentials('DOCENTE', env);

  if (!creds) {
    console.log('⏭️  SEED_DOCENTE_* no definidas: no se crea el DOCENTE de prueba.');
    return null;
  }

  // Se hashea antes de abrir la transacción para no tenerla abierta mientras
  // bcrypt trabaja. Solo se usa si hay que insertar el usuario.
  const existing = await findUserByUsernameOrEmail(creds);

  if (existing && existing.rol !== 'DOCENTE') {
    console.warn(
      `⚠️  El usuario o email de SEED_DOCENTE_* ya lo usa el usuario #${existing.id} ` +
        `(${existing.rol}): no se crea el DOCENTE de prueba.`
    );
    return null;
  }

  const password = existing ? null : await hashPassword(creds.password);

  // Igual que createInstructor: usuario e instructor van juntos o no van.
  const teacher = await db.transaction(async (tx) => {
    const userId =
      existing?.id ??
      (
        await tx
          .insert(usuarios)
          .values({
            username: creds.username,
            email: creds.email,
            password: password as string,
            rol: 'DOCENTE',
          })
          .returning({ id: usuarios.id })
      )[0].id;

    const teacherColumns = {
      id: instructores.id,
      nombres: instructores.nombres,
      apPaterno: instructores.apPaterno,
      apMaterno: instructores.apMaterno,
      usuarioId: instructores.usuarioId,
    };

    const [linked] = await tx
      .select(teacherColumns)
      .from(instructores)
      .where(eq(instructores.usuarioId, userId))
      .limit(1);

    if (linked) return linked;

    // Si el instructor de prueba quedó sin usuario (corrida a medias, o un
    // reset que borró el usuario), se lo vuelve a enlazar en vez de chocar
    // con el índice único del CI.
    const [byCi] = await tx
      .select(teacherColumns)
      .from(instructores)
      .where(eq(instructores.ci, SEED_INSTRUCTOR.ci))
      .limit(1);

    if (byCi) {
      if (byCi.usuarioId !== null) {
        throw new Error(
          `El CI ${SEED_INSTRUCTOR.ci} del instructor de prueba ya pertenece al usuario #${byCi.usuarioId}.`
        );
      }

      const [relinked] = await tx
        .update(instructores)
        .set({ usuarioId: userId })
        .where(eq(instructores.id, byCi.id))
        .returning(teacherColumns);
      return relinked;
    }

    const [created] = await tx
      .insert(instructores)
      .values({ ...SEED_INSTRUCTOR, usuarioId: userId })
      .returning(teacherColumns);
    return created;
  });

  console.log(
    `🧑‍🏫 DOCENTE de prueba: ${creds.username} → instructor #${teacher.id} ` +
      `${teacher.nombres} ${teacher.apPaterno}.`
  );

  return {
    id: teacher.id,
    nombres: teacher.nombres,
    apPaterno: teacher.apPaterno,
    apMaterno: teacher.apMaterno,
  };
};
