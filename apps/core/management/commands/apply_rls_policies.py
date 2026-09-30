"""Aplica las políticas de Row-Level Security definidas en apps/core/sql/rls.sql."""
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import connection

SQL_FILE = Path(__file__).resolve().parents[2] / "sql" / "rls.sql"


class Command(BaseCommand):
    help = "Aplica las políticas de Row-Level Security (RLS) a PostgreSQL."

    def handle(self, *args, **options):
        sql = SQL_FILE.read_text(encoding="utf-8")
        with connection.cursor() as cursor:
            cursor.execute(sql)
        self.stdout.write(self.style.SUCCESS(f"RLS aplicado desde {SQL_FILE.name}"))
