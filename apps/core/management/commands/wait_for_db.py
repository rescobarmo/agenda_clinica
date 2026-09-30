"""Espera a que la base de datos esté disponible (útil en entrypoints)."""
import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Bloquea hasta que la base de datos acepte conexiones."

    def handle(self, *args, **options):
        self.stdout.write("Esperando a la base de datos...")
        for attempt in range(1, 31):
            try:
                connections["default"].cursor().close()
                self.stdout.write(self.style.SUCCESS("Base de datos disponible."))
                return
            except OperationalError:
                self.stdout.write(f"  intento {attempt}/30, reintentando en 2s...")
                time.sleep(2)
        raise SystemExit("La base de datos no respondió a tiempo.")
