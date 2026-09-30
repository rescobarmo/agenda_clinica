from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "email", "rol", "clinica", "is_active")
    list_filter = ("rol", "clinica", "is_active")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Agenda", {"fields": ("rol", "clinica", "sucursal", "medico", "paciente")}),
    )
