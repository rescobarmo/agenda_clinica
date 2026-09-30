"""Espera a que la base de datos esté disponible (útil en entrypoints)."""
import os
import time
from urllib.parse import urlparse

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Bloquea hasta que la base de datos acepte conexiones."

    def handle(self, *args, **options):
        url = os.environ.get("DATABASE_URL", "")
        parsed = urlparse(url)
        host = parsed.hostname or "?"
        port = parsed.port or "?"
        user = parsed.username or "?"
        db = (parsed.path or "/?").lstrip("/")

        self.stdout.write(
            f"Esperando a la base de datos en host={host} port={port} db={db} user={user}"
        )

        for attempt in range(1, 31):
            try:
                connections["default"].cursor().close()
                self.stdout.write(self.style.SUCCESS("Base de datos disponible."))
                return
            except OperationalError as exc:
                self.stdout.write(f"  intento {attempt}/30: {exc}")
                time.sleep(2)

        raise SystemExit(
            "La base de datos no respondió. Revisa DATABASE_URL (host interno de Postgres)."
        )
