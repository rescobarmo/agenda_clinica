# Despliegue en EasyPanel

EasyPanel aporta su propio proxy (Traefik) y gestiona dominios, HTTPS, variables y backups.
Por eso este despliegue **no** usa el stack de VPS (`docker-compose.vps.yml` +
`docker-compose.vps.prod.yml`, que traen Traefik/Flower/Kuma propios y publican puertos). Usamos:

- **Postgres** y **Redis** nativos de EasyPanel.
- Un **Compose Service** con `docker-compose.yml` (por defecto: solo `web`, `worker`, `whatsapp-worker`, `beat`).

> EasyPanel avisa si un compose usa `ports` o `container_name`. Nuestro `docker-compose.yml`
> no los usa: el enrutado se hace por **Domains** en el panel.

---

## 1. Crear el proyecto

En EasyPanel → **New Project** → nombre: `agenda`.

## 2. Postgres (nativo)

**New Service → Postgres**, nombre `db`. Copia la **Internal Connection URL**; se verá parecida a:

```
postgres://postgres:<password>@agenda_db:5432/agenda
```

## 3. Redis (nativo)

**New Service → Redis**, nombre `redis`. Copia la **Internal Connection URL**:

```
redis://default:<password>@agenda_redis:6379
```

## 4. Compose Service (la aplicación)

**New Service → Compose**, nombre `app`.

- **Source:** Git
  - Repository URL: `https://github.com/rescobarmo/agenda_clinica.git`
  - (Si es privado: usa la SSH key que muestra EasyPanel como *deploy key* de solo lectura.)
  - Branch: `main`
  - **Build Path:** `/`
  - **Docker Compose File:** `docker-compose.yml` (déjalo por defecto)
- **Environment:** activa **Create .env file** y pega el contenido de `.env.example`, ajustando:

```dotenv
DEBUG=False
DJANGO_SECRET_KEY=<genera uno largo>
ALLOWED_HOSTS=midominio.com,www.midominio.com,api.midominio.com
CSRF_TRUSTED_ORIGINS=https://midominio.com,https://www.midominio.com,https://api.midominio.com

DATABASE_URL=postgres://postgres:PASS@agenda_db:5432/agenda
REDIS_URL=redis://default:PASS@agenda_redis:6379/0
CELERY_BROKER_URL=redis://default:PASS@agenda_redis:6379/1
CELERY_RESULT_BACKEND=redis://default:PASS@agenda_redis:6379/2

RLS_ENABLED=True
SECURE_SSL_REDIRECT=True

# Opcional: crea el superusuario automáticamente en el primer arranque
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@midominio.com
DJANGO_SUPERUSER_PASSWORD=<password-fuerte>

WHATSAPP_TOKEN=<token>
WHATSAPP_PHONE_NUMBER_ID=<phone-id>
WHATSAPP_VERIFY_TOKEN=<verify-token>
WHATSAPP_API_VERSION=v21.0
```

> El `host` interno de Postgres/Redis es `<proyecto>_<servicio>` (`agenda_db`, `agenda_redis`).
> Si EasyPanel te muestra otro host, usa el de la *Internal URL*.

## 5. Dominios

En la pestaña **Domains** del Compose Service, agrega:

| Host                | Service | Port | HTTPS |
| ------------------- | ------- | ---- | ----- |
| `midominio.com`     | `web`   | 8000 | sí    |
| `www.midominio.com` | `web`   | 8000 | sí    |
| `api.midominio.com` | `web`   | 8000 | sí    |

Ambos subdominios apuntan al mismo servicio `web`; la API vive bajo `/api/`.

## 6. Desplegar

Pulsa **Deploy**. En el primer arranque, `entrypoint.sh`:

1. Espera la base de datos.
2. Aplica `migrate`.
3. Ejecuta `collectstatic`.
4. Aplica RLS (`apply_rls_policies`).
5. Crea el superusuario si definiste `DJANGO_SUPERUSER_PASSWORD`.

**Verificación:** revisa **Logs** del servicio y abre `https://midominio.com/healthz/` →
`{"status":"ok","database":"up"}`.

> Nota: aún no hay migraciones en el repo. Antes del primer deploy genera y sube las migraciones
> (ver más abajo) o ejecuta `makemigrations` desde un App service con shell.

## 7. WhatsApp

En Meta → WhatsApp → Configuration → Webhook:

- Callback URL: `https://midominio.com/api/whatsapp/webhook/`
- Verify Token: el mismo `WHATSAPP_VERIFY_TOKEN`.
- Suscríbete al campo **messages**.

## 8. Flower (opcional)

Crea un **App Service** desde imagen `mher/flower:2.0`:

- Command: `celery --broker=redis://default:PASS@agenda_redis:6379/1 flower --port=5555 --url_prefix=flower`
- Dominio: `flower.midominio.com` → puerto `5555`
- Protege con **Security → Basic Auth** del propio servicio.

## 9. Monitoreo (Uptime Kuma)

En EasyPanel hay plantilla de **Uptime Kuma**; despliégalo y asígnale `status.midominio.com`.
Monitores: `https://midominio.com` (200), `https://midominio.com/healthz/` (200) y SSL 443.

## 10. Backups

Usa los **backups nativos del servicio Postgres** de EasyPanel (destino S3; Backblaze B2 es
compatible con S3). Alternativa self-hosted: seguir `scripts/backup.sh` desde una tarea programada
de EasyPanel.

---

## Generar migraciones antes del primer deploy

Como el repo no incluye migraciones, ejecútalas localmente y súbelas:

```bash
pip install -r requirements.txt
export DATABASE_URL=postgres://...   # cualquier Postgres de prueba
python manage.py makemigrations
git add apps/**/migrations
git commit -m "Add Django migrations"
git push
```

Tras eso, EasyPanel redeploya y `migrate` funciona en el arranque.

---

## Actualizaciones

Cada `git push` a `main` + **Deploy** en EasyPanel reconstruye las imágenes y aplica migraciones.
Puedes activar **Auto Deploy** con el webhook de EasyPanel.

## Diferencias con `DEPLOY.md`

`DEPLOY.md` es para un VPS "pelado" (Traefik, hardening, cron, UFW). **En EasyPanel no usas esa
guía**: el panel ya gestiona proxy, TLS, firewall y backups. Esta es la ruta recomendada para ti.
