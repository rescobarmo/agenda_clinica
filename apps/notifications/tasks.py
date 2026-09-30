"""Tareas Celery para notificaciones."""
import logging

from celery import shared_task
from django.utils import timezone

from .models import Notificacion
from .whatsapp import send_text_message

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_whatsapp_notification(self, cita_id: str, to: str, body: str):
    notificacion = Notificacion.objects.create(cita_id=cita_id, canal="WHATSAPP", estado="pending")
    try:
        result = send_text_message(to, body)
        notificacion.estado = "sent"
        notificacion.enviada_en = timezone.now()
        notificacion.save(update_fields=["estado", "enviada_en", "updated_at"])
        return result
    except Exception as exc:  # noqa: BLE001
        notificacion.estado = "failed"
        notificacion.error = str(exc)
        notificacion.save(update_fields=["estado", "error", "updated_at"])
        logger.warning("Fallo al enviar WhatsApp (cita=%s): %s", cita_id, exc)
        raise self.retry(exc=exc)
