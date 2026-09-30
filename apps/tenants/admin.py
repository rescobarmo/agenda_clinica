from django.contrib import admin

from .models import Clinica, Consultorio, Sucursal


@admin.register(Clinica)
class ClinicaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "rut", "telefono")
    search_fields = ("nombre", "rut")


@admin.register(Sucursal)
class SucursalAdmin(admin.ModelAdmin):
    list_display = ("nombre", "clinica", "zona_horaria")
    list_filter = ("clinica",)


@admin.register(Consultorio)
class ConsultorioAdmin(admin.ModelAdmin):
    list_display = ("nombre", "sucursal")
    list_filter = ("sucursal__clinica",)
