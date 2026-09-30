# Agenda Médica

Sistema de agendamiento de horas médicas **multi-clínica, multi-sucursal y multi-médico**, con agendamiento por **web y WhatsApp**, aislamiento de datos por clínica (Row-Level Security) y despliegue sobre **VPS con Docker**.

## Stack

| Capa        | Tecnología                                          |
| ----------- | --------------------------------------------------- |
| Backend     | NestJS 11, PostgreSQL 16, Prisma 6, PgBouncer, Redis |
| Frontend    | Next.js 15 (App Router), React 19, Tailwind CSS      |
| WhatsApp    | Meta Cloud API (worker con BullMQ)                   |
| Infra       | Docker Compose, Traefik v3 (HTTPS automático)        |

## Estructura

```
Agenda/
├── apps/
│   ├── api/          # NestJS: API REST, auth, contexto multi-tenant, guards
│   ├── web/          # Next.js: frontend paciente/staff
│   └── whatsapp/     # Worker BullMQ para envío de mensajes
├── packages/
│   ├── shared/       # Tipos, zod schemas y constantes compartidas
│   └── database/     # Prisma schema, cliente y contexto tenant (RLS)
├── infra/
│   └── scripts/      # backup.sh, restore.sh, hardening.sh
├── docker-compose.yml        # Infra local: postgres, pgbouncer, redis
└── docker-compose.prod.yml   # Stack completo de producción (Traefik + apps)
```

## Requisitos

- Node.js >= 22
- pnpm >= 9
- Docker + Docker Compose

## Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Levantar infraestructura (postgres, pgbouncer, redis)
docker compose up -d

# 4. Generar cliente Prisma y aplicar migraciones
pnpm db:generate
pnpm db:migrate

# 5. (Opcional) Aplicar políticas RLS
# psql -U agenda_app -d agenda -f packages/database/prisma/rls.sql

# 6. Ejecutar las apps en modo watch
pnpm dev
```

- API: http://localhost:4000/api (Swagger en `/api/docs`)
- Web: http://localhost:3000

La app se conecta a la base vía **PgBouncer** (`PGBOUNCER_URL`, puerto 6432) para usar connection pooling en modo transaction, necesario para RLS.

## Base de datos

```bash
pnpm db:generate    # prisma generate
pnpm db:migrate     # prisma migrate dev
pnpm db:studio      # prisma studio
pnpm --filter @agenda/database seed
```

El aislamiento multi-tenant se implementa con **Row-Level Security**. El backend establece `app.current_clinica_id` y `app.current_user_id` dentro de cada transacción (`packages/database/src/tenant.ts`). Las políticas de ejemplo están en `packages/database/prisma/rls.sql`.

## Producción (Coolify)

El stack de producción está en `docker-compose.prod.yml` y está pensado para desplegarse como
recurso **Docker Compose** en [Coolify](https://coolify.io), que aporta el proxy (Traefik) y los
certificados TLS. Por eso **no se publica ningún puerto**: Coolify enruta cada servicio por dominio.

1. Crea un recurso **Docker Compose** apuntando a este repositorio.
2. En **Base Directory** deja la raíz y en **Docker Compose Location** usa `docker-compose.prod.yml`.
3. En **Environment Variables** define:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET` (mínimo 32 caracteres)
   - `NEXT_PUBLIC_API_URL` → `https://api.tudominio.com`
   - `WEB_URL` → `https://tudominio.com`
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (opcional)
4. Asigna el dominio de cada servicio público en **Domains**:
   - `web` → `https://tudominio.com:3000`
   - `api` → `https://api.tudominio.com:4000`
5. **Deploy**.

> El puerto interno (`:3000`, `:4000`) es solo la pista para que Coolify sepa a qué puerto del
> contenedor enrutar; el usuario entra por HTTPS estándar.

Para desarrollo local se usa `docker-compose.yml` (postgres, pgbouncer, redis): `docker compose up -d`.

## Backups

```bash
# Backup cifrado (pg_dump + GPG + rclone a almacenamiento externo)
sudo BACKUP_GPG_RECIPIENT=admin@example.com \
  RCLONE_REMOTE=backblaze-b2:agenda-backups \
  bash infra/scripts/backup.sh

# Restauración
sudo POSTGRES_PASSWORD=... bash infra/scripts/restore.sh /ruta/backup.dump.gpg
```

Programa `backup.sh` en cron para ejecución diaria (p. ej. a las 2 AM) y ejecuta una **prueba de restauración mensual** en staging.

## Hardening del VPS

```bash
sudo bash infra/scripts/hardening.sh
```

Configura UFW (deny all + 22/80/443), fail2ban, `unattended-upgrades` y desactiva login root/contraseña por SSH.

## Scripts

```bash
pnpm dev          # todas las apps en watch
pnpm build        # build de todos los paquetes
pnpm typecheck    # typecheck de todos los paquetes
pnpm db:generate  # prisma generate
pnpm db:migrate   # prisma migrate dev
```
