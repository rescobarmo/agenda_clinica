# Agenda Médica (Django)

Sistema de agendamiento de horas médicas **multi-clínica, multi-sucursal y multi-médico**, con
agendamiento por **web y WhatsApp**, aislamiento de datos por clínica (**Row-Level Security**) y
despliegue sobre VPS con **Docker + Traefik**.

> Guía de despliegue completa en [`DEPLOY.md`](./DEPLOY.md).

## Stack

| Capa     | Tecnología                                                         |
| -------- | ------------------------------------------------------------------ |
| Backend  | Django 5, Django REST Framework, Celery, Gunicorn                  |
| Datos    | PostgreSQL 16 (RLS), PgBouncer, Redis 7                            |
| Frontend | HTMX, Alpine.js, Tailwind CSS (plantillas Django)                  |
| WhatsApp | Meta WhatsApp Business Cloud API (worker Celery)                   |
| Infra    | Docker, Docker Compose, Traefik v3 (HTTPS automático)              |

## Estructura

```
Agenda/
├── config/                 # Proyecto Django (settings, urls, celery, wsgi/asgi)
├── apps/
│   ├── core/               # Modelos base, enums, contexto tenant, RLS, middleware
│   ├── accounts/           # Usuario personalizado y roles
│   ├── tenants/            # Clínica, Sucursal, Consultorio
│   ├── scheduling/         # Médico, Paciente, Disponibilidad, Bloqueo, Cita, Ficha
│   ├── notifications/      # Notificaciones + cliente WhatsApp + tareas Celery
│   ├── api/                # API REST (DRF viewsets + webhook WhatsApp)
│   └── web/                # Vistas y plantillas (HTMX)
├── templates/              # base, login, dashboard, agenda, ficha
├── scripts/                # backup.sh, restore.sh
├── docker-compose.yml      # EasyPanel (web, worker, whatsapp-worker, beat)
├── docker-compose.vps.yml       # VPS base (db, pgbouncer, redis, web, workers)
├── docker-compose.vps.prod.yml  # VPS: Traefik, Flower, Uptime Kuma y labels
├── deploy.sh               # Automatiza fases 3–6 del despliegue
└── DEPLOY.md               # Guía de despliegue paso a paso
```

## Desarrollo local

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # ajusta DATABASE_URL a localhost:6432
docker compose up -d db pgbouncer redis
python manage.py migrate
python manage.py apply_rls_policies
python manage.py createsuperuser
python manage.py runserver
```

- Web: http://localhost:8000
- API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/

## Producción

```bash
# EasyPanel: usa docker-compose.yml (por defecto)
# VPS propio:
docker compose -f docker-compose.vps.yml -f docker-compose.vps.prod.yml up -d --build
```

Consulta [`DEPLOY.md`](./DEPLOY.md) para el detalle de cada fase (hardening, SSL, backups, monitoreo).

## Multi-tenant y RLS

`apps/core/middleware.py` fija `app.current_clinica_id` y `app.current_user_id` dentro de una
transacción por request; `apps/core/sql/rls.sql` define las políticas. Se aplican con:

```bash
python manage.py apply_rls_policies
```
