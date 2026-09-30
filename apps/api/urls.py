from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CitaViewSet,
    DisponibilidadViewSet,
    MedicoViewSet,
    PacienteViewSet,
    WhatsAppWebhookView,
)

router = DefaultRouter()
router.register("citas", CitaViewSet, basename="cita")
router.register("medicos", MedicoViewSet, basename="medico")
router.register("pacientes", PacienteViewSet, basename="paciente")
router.register("disponibilidad", DisponibilidadViewSet, basename="disponibilidad")

urlpatterns = [
    path("health/", include("apps.web.health_urls")),
    path("whatsapp/webhook/", WhatsAppWebhookView.as_view(), name="whatsapp-webhook"),
    path("", include(router.urls)),
]
