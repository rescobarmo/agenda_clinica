# Despliegue en EasyPanel

EasyPanel aporta su propio proxy (Traefik) y gestiona dominios, HTTPS y variables. Nuestro
`docker-compose.yml` está preparado para EasyPanel y es **autocontenido**: incluye la base de datos
(`db`) y Redis, además de `web`, `worker`, `whatsapp-worker` y `beat`. Así basta con desplegar
**un solo Compose Service**.

> No usamos el stack de VPS (`docker-compose.vps.yml` + `docker-compose.vps.prod.yml`), que trae
> Traefik/Flower/Kuma propios y publica puertos (conflicto con el proxy de EasyPanel).

---

## 1. Crear el proyecto

En EasyPanel → **New Project** → nombre: `agenda` (o el que prefieras).

## 2. Compose Service

**New Service → Compose**, nombre `app`.

- **Source:** Git (o GitHub)
  - Repository: `https://github.com/rescobarmo/agenda_clinica.git`
  - (Si es privado: usa el token de GitHub de EasyPanel o la *deploy key* SSH.)
  - Branch: `main`
  - **Build Path:** `/`
  - **Docker Compose File:** `docker-compose.yml` (déjalo por defecto)
- **Environment:** activa **Create .env file** y pega:

```dotenv
DEBUG=False

# Obligatorio: contraseña de la base de datos (la usan db y la app)
POSTGRES_DB=agenda
POSTGRES_USER=agenda_app
POSTGRES_PASSWORD=<una-password-fuerte>

# Django
DJANGO_SECRET_KEY=<genera-uno-largo>
ALLOWED_HOSTS=localhost,127.0.0.1,midominio.com,www.midominio.com,api.midominio.com,agenda-clinica-agendas.fcs3wf.easypanel.host
CSRF_TRUSTED_ORIGINS=https://midominio.com,https://api.midominio.com,https://agenda-clinica-agendas.fcs3wf.easypanel.host

RLS_ENABLED=True
SECURE_SSL_REDIRECT=True

# Superusuario automático en el primer arranque
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@midominio.com
DJANGO_SUPERUSER_PASSWORD=<password-fuerte>

# WhatsApp (opcional al inicio)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_API_VERSION=v21.0
```

> **No necesitas** definir `DATABASE_URL`, `REDIS_URL` ni `CELERY_*`: el compose los construye
> automáticamente apuntando a los servicios internos `db` y `redis`.

## 3. Dominios

Pestaña **Domains** del Compose Service → **Add Domain**:

| Host | Service | Port | HTTPS |
| --- | --- | --- | --- |
| `midominio.com` | `web` | `8000` | sí |
| `api.midominio.com` | `web` | `8000` | sí |

EasyPanel ya suele crear un dominio `*.easypanel.host` apuntando a `web:8000`; úsalo para probar de
inmediato. Agrega ese host a `ALLOWED_HOSTS` y `CSRF_TRUSTED_ORIGINS`.

## 4. Desplegar

Pulsa **Deploy**. En el primer arranque, `web` ejecuta automáticamente:

1. `wait_for_db` (espera a Postgres)
2. `migrate`
3. `collectstatic`
4. `apply_rls_policies` (RLS)
5. `ensure_superuser` (si definiste `DJANGO_SUPERUSER_PASSWORD`)

**Verificación:** `https://TU-DOMINIO/healthz/` → `{"status":"ok","database":"up"}` y entra a
`https://TU-DOMINIO/admin/` con el superusuario.

---

## WhatsApp

En Meta → WhatsApp → Configuration → Webhook:

- Callback URL: `https://midominio.com/api/whatsapp/webhook/`
- Verify Token: el mismo `WHATSAPP_VERIFY_TOKEN`.
- Suscríbete al campo **messages**.

## Backups

Al ser una base de datos dentro del Compose Service, los backups nativos de EasyPanel (para su
servicio Postgres) no aplican. Opciones:

- Programar una tarea en EasyPanel que ejecute:
  `docker compose exec -T db pg_dump -U agenda_app agenda | gzip > /backups/agenda-$(date +%F).sql.gz`
- O desplegar un servicio **Postgres nativo** de EasyPanel aparte y apuntar la app a él (cambiando
  `DATABASE_URL`), para usar sus backups gestionados.

## Actualizaciones

Cada `git push` a `main` + **Deploy** en EasyPanel reconstruye imágenes y aplica migraciones.
Puedes activar **Auto Deploy** con el webhook de EasyPanel.

## Diferencias con `DEPLOY.md`

`DEPLOY.md` es para un VPS "pelado" (hardening, UFW, cron, Traefik propio). **En EasyPanel no lo
uses**: el panel ya gestiona proxy, TLS, firewall y rutas. Esta es tu ruta.
