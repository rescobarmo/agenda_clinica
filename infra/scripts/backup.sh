#!/usr/bin/env bash
set -euo pipefail

# Backup cifrado de PostgreSQL con pg_dump -> GPG -> rclone (almacenamiento externo).
# Requiere: pg_dump (postgresql-client), gpg, rclone configurado.

DB_NAME="${POSTGRES_DB:-agenda}"
DB_USER="${POSTGRES_USER:-agenda_app}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:?Se requiere BACKUP_GPG_RECIPIENT}"
RCLONE_REMOTE="${RCLONE_REMOTE:?Se requiere RCLONE_REMOTE}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/agenda}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="agenda-${TIMESTAMP}.dump.gpg"

mkdir -p "$BACKUP_DIR"

PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
  -Fc -Z9 \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" \
  | gpg --batch --encrypt --recipient "$GPG_RECIPIENT" \
  > "$BACKUP_DIR/$FILENAME"

rclone copy "$BACKUP_DIR/$FILENAME" "$RCLONE_REMOTE"

find "$BACKUP_DIR" -name 'agenda-*.dump.gpg' -mtime "+$RETENTION_DAYS" -delete

echo "Backup completado: $FILENAME"
