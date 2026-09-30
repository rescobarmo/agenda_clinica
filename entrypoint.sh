#!/usr/bin/env bash
set -e

# Espera a que la base de datos esté lista (a través de PgBouncer).
python manage.py wait_for_db

# Solo el servicio web inicializa esquema/estáticos/RLS.
if [ "${DJANGO_INIT:-0}" = "1" ]; then
  echo "==> Aplicando migraciones"
  python manage.py migrate --noinput
  echo "==> Recolectando estáticos"
  python manage.py collectstatic --noinput
  if [ "${RLS_ENABLED:-True}" = "True" ]; then
    echo "==> Aplicando políticas RLS"
    python manage.py apply_rls_policies || echo "RLS: se omite (revisar permisos)"
  fi
  if [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
    echo "==> Asegurando superusuario"
    python manage.py ensure_superuser
  fi
fi

exec "$@"
