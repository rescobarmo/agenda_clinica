#!/usr/bin/env bash
set -euo pipefail

# Restauración de un backup cifrado. Uso: restore.sh <archivo.dump.gpg>
# El archivo puede ser local o descargado previamente desde el almacenamiento externo.

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <archivo.dump.gpg>"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${POSTGRES_DB:-agenda}"
DB_USER="${POSTGRES_USER:-agenda_app}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "Restaurando $BACKUP_FILE en la base $DB_NAME..."

gpg --batch --decrypt "$BACKUP_FILE" \
  | PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_restore \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    --clean --if-exists --no-owner -d "$DB_NAME"

echo "Restauración completada."
