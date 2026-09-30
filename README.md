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

## Producción (Docker)

```bash
cp .env.example .env
# Ajusta DOMAIN, ACME_EMAIL, JWT_SECRET, POSTGRES_PASSWORD, etc.

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Traefik gestiona HTTPS automático (Let's Encrypt) y enruta:

- `https://agenda.example.com` -> Web (Next.js)
- `https://api.agenda.example.com` -> API (NestJS)
- `https://traefik.agenda.example.com` -> Dashboard de Traefik

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
