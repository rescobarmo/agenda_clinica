from django.contrib import admin

from .models import Auditoria, BloqueoAgenda, Cita, Disponibilidad, Especialidad, FichaClinica, Medico, Paciente


@admin.register(Especialidad)
class EspecialidadAdmin(admin.ModelAdmin):
    list_display = ("nombre", "duracion_minutos")


@admin.register(Medico)
class MedicoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "clinica", "registro_profesional")
    list_filter = ("clinica",)
    search_fields = ("nombre", "rut")


@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = ("nombre", "apellido", "rut", "telefono", "clinica")
    list_filter = ("clinica",)
    search_fields = ("nombre", "apellido", "rut")


@admin.register(FichaClinica)
class FichaClinicaAdmin(admin.ModelAdmin):
    list_display = ("paciente",)
    search_fields = ("paciente__nombre", "paciente__rut")


@admin.register(Disponibilidad)
class DisponibilidadAdmin(admin.ModelAdmin):
    list_display = ("medico", "sucursal", "dia_semana", "hora_inicio", "hora_fin")
    list_filter = ("sucursal", "dia_semana")


@admin.register(BloqueoAgenda)
class BloqueoAgendaAdmin(admin.ModelAdmin):
    list_display = ("medico", "fecha_desde", "fecha_hasta", "motivo")


@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ("fecha", "paciente", "medico", "sucursal", "estado")
    list_filter = ("estado", "sucursal", "origen")
    search_fields = ("paciente__nombre", "paciente__rut", "medico__nombre")
    date_hierarchy = "fecha"


@admin.register(Auditoria)
class AuditoriaAdmin(admin.ModelAdmin):
    list_display = ("created_at", "accion", "entidad", "entidad_id", "usuario")
    list_filter = ("accion", "entidad")
