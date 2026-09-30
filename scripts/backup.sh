#!/usr/bin/env bash
set -euo pipefail

# Backup cifrado de PostgreSQL: pg_dump | gzip | gpg -> rclone (Backblaze B2) + rotación local.
# Requiere: pg_dump (postgresql-client), gpg, rclone configurado.
# Variables: POSTGRES_* , BACKUP_GPG_RECIPIENT, RCLONE_REMOTE, BACKUP_RETENTION_DAYS.

DB_NAME="${POSTGRES_DB:-agenda}"
DB_USER="${POSTGRES_USER:-agenda_app}"
DB_HOST="${POSTGRES_HOST:-127.0.0.1}"
DB_PORT="${POSTGRES_PORT:-6432}"
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:?Se requiere BACKUP_GPG_RECIPIENT}"
RCLONE_REMOTE="${RCLONE_REMOTE:?Se requiere RCLONE_REMOTE}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/agenda}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="agenda-${TIMESTAMP}.dump.gpg"

mkdir -p "$BACKUP_DIR"

echo "==> Volcando y cifrando $DB_NAME"
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
  -Fc -Z9 \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" \
  | gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" \
  > "$BACKUP_DIR/$FILENAME"

echo "==> Subiendo a $RCLONE_REMOTE"
rclone copy "$BACKUP_DIR/$FILENAME" "$RCLONE_REMOTE"

echo "==> Rotando backups locales (> ${RETENTION_DAYS} días)"
find "$BACKUP_DIR" -name 'agenda-*.dump.gpg' -mtime "+${RETENTION_DAYS}" -delete

echo "Backup completado: $FILENAME"
