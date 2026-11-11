# Usuarios de prueba con `db:seed` (QA)

Esta guía explica cómo levantar una base de datos vacía en tu máquina, cargar los
usuarios de prueba con `db:seed` y comprobar que todo funciona. Sirve para Docker
local y como referencia para CI.

> ⚠️ **Solo para entornos locales y CI. Nunca en producción.**
> La aplicación no permite crear administradores: el único ADMIN real lo entrega
> el desarrollador. Las variables `SEED_*` existen solo para que una base vacía
> tenga con qué usuario iniciar sesión.

## Qué hace el seed

| Situación | Resultado |
|---|---|
| Sin variables `SEED_*` | No crea usuarios (solo carga los catálogos) |
| Con `SEED_ADMIN_*` | Crea **un** ADMIN, únicamente si todavía no existe ninguno |
| Con `SEED_DOCENTE_*` | Crea un DOCENTE con su instructor y le asigna un grupo de prueba |
| Correrlo varias veces | No duplica nada |

- Las contraseñas se guardan hasheadas con bcrypt.
- El login es por **username**, no por email.
- Cada rol necesita sus **tres** variables (`USERNAME`, `EMAIL`, `PASSWORD`). Si
  falta una, ese usuario no se crea.

## Requisitos

- Docker (o Podman: los comandos son los mismos cambiando `docker` por `podman`).
- Node y pnpm, con las dependencias instaladas (`pnpm install` en la raíz del repo).
- `openssl` y `curl`.
- Una terminal bash (Linux, macOS o WSL).

> Haz todo en **una sola terminal**: los `export` valen solo en esa sesión.

---

## 1. Ir a la carpeta del servidor

```bash
cd apps/server
```

## 2. Levantar un Postgres desechable

El servidor siempre se conecta a la base por SSL, así que el contenedor necesita
un certificado. Uno autofirmado alcanza:

```bash
mkdir -p /tmp/pgssl
openssl req -new -x509 -days 1 -nodes -subj /CN=localhost \
  -keyout /tmp/pgssl/server.key -out /tmp/pgssl/server.crt
chmod 644 /tmp/pgssl/*

docker run -d --rm --name seedtest-pg \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=seedtest \
  -p 55432:5432 -v /tmp/pgssl:/certs:Z \
  postgres:16-alpine \
  sh -c 'cp /certs/* /tmp/ && chown postgres /tmp/server.* && chmod 600 /tmp/server.key && exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key'
```

Espera unos segundos y comprueba que responde:

```bash
docker exec seedtest-pg pg_isready -U postgres
# /var/run/postgresql:5432 - accepting connections
```

## 3. Apuntar a esa base

```bash
export DATABASE_URL=postgres://postgres:test@localhost:55432/seedtest
export CURRENT_TEACHER_ID=
export JWT_SECRET=una-clave-de-prueba-de-al-menos-32-caracteres
```

> 🚨 **No te saltes este paso.** Las variables exportadas tienen prioridad sobre
> `apps/server/.env`. Si ese archivo apunta a una base remota y no exportas
> `DATABASE_URL`, todo lo que sigue se ejecuta **contra esa base**.
>
> `CURRENT_TEACHER_ID` va vacío a propósito: así el grupo de prueba queda a
> nombre del docente del seed y no de un instructor que no existe en una base
> vacía.

Atajo para consultar la base:

```bash
q(){ docker exec seedtest-pg psql -U postgres -d seedtest -c "$1"; }
```

## 4. Crear las tablas

```bash
pnpm exec drizzle-kit push --force
```

Debe terminar con `[✓] Changes applied`.

---

## Casos de prueba

### Caso 1: sin variables `SEED_*` no se crean usuarios

```bash
pnpm db:seed
q "select count(*) from usuarios"
```

**Esperado**

- Mensajes `⏭️ SEED_ADMIN_* no definidas…` y `⏭️ SEED_DOCENTE_* no definidas…`
- Termina con `✅ Seeding completado con éxito.`
- `count = 0`

### Caso 2: con variables se crean ADMIN y DOCENTE

```bash
export SEED_ADMIN_USERNAME=admin.qa
export SEED_ADMIN_EMAIL=admin.qa@example.com
export SEED_ADMIN_PASSWORD='Admin123!'
export SEED_DOCENTE_USERNAME=docente.qa
export SEED_DOCENTE_EMAIL=docente.qa@example.com
export SEED_DOCENTE_PASSWORD='Docente123!'

pnpm db:seed
q "select u.id, u.username, u.rol, left(u.password, 4) as hash, i.id as instructor
   from usuarios u left join instructores i on i.usuario_id = u.id order by u.id"
```

**Esperado**

- Mensajes `👑 ADMIN de prueba creado…` y `🧑‍🏫 DOCENTE de prueba…`
- Dos filas:

  | username | rol | hash | instructor |
  |---|---|---|---|
  | admin.qa | ADMIN | `$2b$` | *(vacío)* |
  | docente.qa | DOCENTE | `$2b$` | un id |

- `hash` empieza con `$2b$`, es decir, la contraseña **no** está en texto plano.

El docente tiene un grupo de prueba:

```bash
q "select count(*) from grupos g
   join instructores i on i.id = g.id_instructor
   join usuarios u on u.id = i.usuario_id
   where u.username = 'docente.qa'"
```

**Esperado:** `count = 1`

### Caso 3: es idempotente

```bash
pnpm db:seed
q "select (select count(*) from usuarios) as usuarios,
          (select count(*) from instructores) as instructores"
```

**Esperado**

- Mensaje `👑 Ya existe un ADMIN (#…): no se crea otro.`
- `usuarios = 2`, `instructores = 1` (igual que antes)

### Caso 4: login con los usuarios del seed

Levanta el servidor:

```bash
pnpm dev
```

En **otra terminal**:

```bash
# ADMIN → debe devolver un token y rol ADMIN
curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin.qa","password":"Admin123!"}'

# DOCENTE → debe devolver un token y rol DOCENTE
curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"docente.qa","password":"Docente123!"}'

# Contraseña incorrecta → "Contraseña Incorrecta"
curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"docente.qa","password":"mala"}'
```

> El login tiene límite de intentos. Si haces muchas pruebas seguidas, espera un
> momento antes de reintentar.

Cuando termines, detén el servidor con `Ctrl+C`.

### Caso 5: vaciar la base y volver a sembrar

`db/reset.ts` borra todo menos el ADMIN y los catálogos.

```bash
pnpm exec tsx src/db/reset.ts
pnpm db:seed
q "select u.username, u.rol, i.id as instructor
   from usuarios u left join instructores i on i.usuario_id = u.id order by u.id"
```

**Esperado**

- El reset termina con `✅ Listo. Usuarios restantes (ADMIN): …`
- El seed **no** crea otro ADMIN (`👑 Ya existe un ADMIN`).
- El DOCENTE vuelve a aparecer con un instructor.

---

## Limpieza

```bash
docker rm -f seedtest-pg
rm -rf /tmp/pgssl
unset DATABASE_URL CURRENT_TEACHER_ID JWT_SECRET \
  SEED_ADMIN_USERNAME SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD \
  SEED_DOCENTE_USERNAME SEED_DOCENTE_EMAIL SEED_DOCENTE_PASSWORD
```

El contenedor se creó con `--rm`, así que al borrarlo no queda ningún dato.

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `The server does not support SSL connections` | El Postgres no tiene SSL activado | Levanta el contenedor como en el paso 2 |
| `DATABASE_URL no está definida` | Falta el `export` | Repite el paso 3 en esta terminal |
| `⚠️ No existe el instructor 6…` | `CURRENT_TEACHER_ID=6` viene de `.env` | `export CURRENT_TEACHER_ID=` |
| `⚠️ El usuario o email de SEED_… ya lo usa…` | Ese username o email pertenece a otro usuario | Usa otros valores o una base limpia |
| `JWT_SECRET no está definida o es demasiado corta` (al hacer login) | Falta `JWT_SECRET` o tiene menos de 32 caracteres | Repite el paso 3 |
| `port is already allocated` | El puerto 55432 está en uso | Cambia `-p 55432:5432` y el puerto de `DATABASE_URL` |

## Uso en CI

En CI se aplican los mismos pasos: un servicio Postgres con SSL, `drizzle-kit
push` y `db:seed` con las variables `SEED_*` definidas como *secrets* del job.
Las variables están documentadas en `apps/server/.env.example`.
