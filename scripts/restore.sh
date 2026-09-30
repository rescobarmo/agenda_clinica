#!/usr/bin/env bash
set -euo pipefail

# Restaura un backup cifrado. Uso: restore.sh <archivo.dump.gpg>
if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <archivo.dump.gpg>"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${POSTGRES_DB:-agenda}"
DB_USER="${POSTGRES_USER:-agenda_app}"
DB_HOST="${POSTGRES_HOST:-127.0.0.1}"
DB_PORT="${POSTGRES_PORT:-6432}"

echo "==> Restaurando $BACKUP_FILE en $DB_NAME"
gpg --batch --decrypt "$BACKUP_FILE" \
  | PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_restore \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    --clean --if-exists --no-owner -d "$DB_NAME"

echo "Restauración completada."
