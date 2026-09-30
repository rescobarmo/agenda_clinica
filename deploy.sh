#!/usr/bin/env bash
# deploy.sh — Automatiza Fase 3 (Docker), Fase 4 (clonado + secrets) y Fase 5 (primer arranque).
# Uso: sudo -u deploy bash deploy.sh   (o como root; ajusta USUARIO_DEPLOY)
set -euo pipefail

# ─────────────────────────────────────────────
# VARIABLES (edítalas antes de ejecutar)
# ─────────────────────────────────────────────
DOMINIO="${DOMINIO:-midominio.com}"
USUARIO_DEPLOY="${USUARIO_DEPLOY:-deploy}"
EMAIL_ADMIN="${EMAIL_ADMIN:-admin@midominio.com}"
REPO_GIT="${REPO_GIT:-git@github.com:usuario/clinica-app.git}"
APP_DIR="${APP_DIR:-/opt/clinica-app}"
BRANCH="${BRANCH:-main}"

log() { echo -e "\n\033[1;34m==> $*\033[0m"; }

# ─────────────────────────────────────────────
# FASE 3: Docker + Compose v2
# ─────────────────────────────────────────────
log "Instalando Docker (repositorio oficial)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
else
  echo "Docker ya está instalado."
fi

log "Añadiendo ${USUARIO_DEPLOY} al grupo docker"
getent group docker >/dev/null 2>&1 || groupadd docker
usermod -aG docker "${USUARIO_DEPLOY}" || true

log "Verificando Docker"
docker --version
docker compose version
docker run --rm hello-world >/dev/null && echo "hello-world OK"

# ─────────────────────────────────────────────
# FASE 4: clonado + secrets
# ─────────────────────────────────────────────
log "Clonando el repositorio en ${APP_DIR}"
mkdir -p "$(dirname "${APP_DIR}")"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" fetch --all && git -C "${APP_DIR}" checkout "${BRANCH}" && git -C "${APP_DIR}" pull
else
  git clone --branch "${BRANCH}" "${REPO_GIT}" "${APP_DIR}"
fi

cd "${APP_DIR}"
mkdir -p secrets

log "Generando secretos"
python3 -c "import secrets; print(secrets.token_urlsafe(64))" > secrets/django_secret_key.txt
openssl rand -base64 32 > secrets/db_password.txt
[ -s secrets/whatsapp_token.txt ] || echo "PEGA_AQUI_TU_ACCESS_TOKEN" > secrets/whatsapp_token.txt
chmod 600 secrets/*.txt

log "Creando .env a partir de .env.example"
if [ ! -f .env ]; then
  cp .env.example .env
  DJANGO_SECRET_KEY="$(cat secrets/django_secret_key.txt)"
  DB_PASSWORD="$(cat secrets/db_password.txt)"
  TRAEFIK_BASICAUTH="$(command -v htpasswd >/dev/null && htpasswd -nbB admin "$(openssl rand -base64 12)" | sed -e 's/\$/\$\$/g')"
  FLOWER_BASICAUTH="$(command -v htpasswd >/dev/null && htpasswd -nbB admin "$(openssl rand -base64 12)" | sed -e 's/\$/\$\$/g')"
  sed -i "s|^DOMAIN=.*|DOMAIN=${DOMINIO}|" .env
  sed -i "s|^ACME_EMAIL=.*|ACME_EMAIL=${EMAIL_ADMIN}|" .env
  sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}|" .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${DB_PASSWORD}|" .env
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgres://agenda_app:${DB_PASSWORD}@pgbouncer:5432/agenda|" .env
  sed -i "s|^WHATSAPP_TOKEN=.*|WHATSAPP_TOKEN_FILE=/run/secrets/whatsapp_token|" .env
  [ -n "${TRAEFIK_BASICAUTH}" ] && sed -i "s|^TRAEFIK_BASICAUTH=.*|TRAEFIK_BASICAUTH=${TRAEFIK_BASICAUTH}|" .env
  [ -n "${FLOWER_BASICAUTH}" ] && sed -i "s|^FLOWER_BASICAUTH=.*|FLOWER_BASICAUTH=${FLOWER_BASICAUTH}|" .env
  echo "Revisa y ajusta ${APP_DIR}/.env antes de continuar."
else
  echo ".env ya existe, no se sobrescribe."
fi

# ─────────────────────────────────────────────
# FASE 5: primer arranque
# ─────────────────────────────────────────────
log "Construyendo imágenes"
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

log "Levantando el stack"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

log "Esperando a que web esté listo"
sleep 15
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

log "Aplicando migraciones + RLS (idempotente)"
docker compose exec -T web python manage.py migrate --noinput || true
docker compose exec -T web python manage.py apply_rls_policies || true

log "Creando superusuario (si no existe)"
docker compose exec -T web python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
U = get_user_model()
u = os.environ.get('DJANGO_SUPERUSER_USERNAME','admin')
e = os.environ.get('DJANGO_SUPERUSER_EMAIL','${EMAIL_ADMIN}')
p = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if p and not U.objects.filter(username=u).exists():
    U.objects.create_superuser(u, e, p)
    print('Superusuario creado:', u)
else:
    print('Superusuario omitido (ya existe o falta DJANGO_SUPERUSER_PASSWORD).')
" || true

log "Listo. Define DJANGO_SUPERUSER_PASSWORD y reejecuta este bloque para crear el admin."
echo
echo "Servicios:"
echo "  https://${DOMINIO}            (web)"
echo "  https://api.${DOMINIO}        (API DRF)"
echo "  https://flower.${DOMINIO}     (Flower, BasicAuth)"
echo "  https://status.${DOMINIO}     (Uptime Kuma)"
