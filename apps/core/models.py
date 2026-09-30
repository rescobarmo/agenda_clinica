"""Modelos base, enums y helpers compartidos."""
import uuid

from django.db import models


class Role(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super administrador"
    CLINIC_ADMIN = "CLINIC_ADMIN", "Administrador de clínica"
    BRANCH_ADMIN = "BRANCH_ADMIN", "Administrador de sucursal"
    RECEPTIONIST = "RECEPTIONIST", "Recepcionista"
    DOCTOR = "DOCTOR", "Médico"
    PATIENT = "PATIENT", "Paciente"
    WHATSAPP_BOT = "WHATSAPP_BOT", "Bot de WhatsApp"


class AppointmentStatus(models.TextChoices):
    PENDING = "PENDING", "Pendiente"
    CONFIRMED = "CONFIRMED", "Confirmada"
    RESCHEDULED = "RESCHEDULED", "Reagendada"
    CANCELLED = "CANCELLED", "Cancelada"
    ATTENDED = "ATTENDED", "Atendida"
    NO_SHOW = "NO_SHOW", "No asistió"


ACTIVE_STATUSES = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.RESCHEDULED,
]


class NotificationChannel(models.TextChoices):
    WHATSAPP = "WHATSAPP", "WhatsApp"
    EMAIL = "EMAIL", "Email"
    SMS = "SMS", "SMS"
    PUSH = "PUSH", "Push"


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStampedModel(UUIDModel):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
