"""Crea o actualiza el superusuario desde variables de entorno (idempotente).

Pensado para arranques en paneles (EasyPanel, Coolify) donde no hay shell interactiva.

Variables:
    DJANGO_SUPERUSER_USERNAME
    DJANGO_SUPERUSER_PASSWORD
    DJANGO_SUPERUSER_EMAIL (opcional)
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Crea/actualiza el superusuario a partir de DJANGO_SUPERUSER_* (idempotente)."

    def handle(self, *args, **options):
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")

        if not username or not password:
            self.stdout.write("ensure_superuser: faltan DJANGO_SUPERUSER_* (se omite).")
            return

        User = get_user_model()
        user, created = User.objects.get_or_create(username=username, defaults={"email": email})
        user.email = email or user.email
        user.is_staff = True
        user.is_superuser = True
        if hasattr(user, "rol"):
            user.rol = "SUPER_ADMIN"
        user.set_password(password)
        user.save()

        action = "creado" if created else "actualizado"
        self.stdout.write(self.style.SUCCESS(f"Superusuario {action}: {username}"))
