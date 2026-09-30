from django.db import models

from apps.core.models import NotificationChannel, TimeStampedModel


class Notificacion(TimeStampedModel):
    cita = models.ForeignKey("scheduling.Cita", on_delete=models.CASCADE, related_name="notificaciones")
    canal = models.CharField(max_length=20, choices=NotificationChannel.choices)
    estado = models.CharField(max_length=20, default="pending")
    enviada_en = models.DateTimeField(blank=True, null=True)
    error = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "notifications_notificacion"
        verbose_name = "notificación"
        verbose_name_plural = "notificaciones"
        indexes = [models.Index(fields=["cita"])]

    def __str__(self) -> str:
        return f"{self.canal} · {self.cita_id} · {self.estado}"
