from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from apps.core.models import ACTIVE_STATUSES, AppointmentStatus, Role
from apps.core.tenant import current_clinica_id, current_user_id
from apps.scheduling import services
from apps.scheduling.models import Auditoria, Cita, Disponibilidad, Medico, Paciente

from .permissions import RolePermission
from .serializers import (
    CitaCreateSerializer,
    CitaSerializer,
    DisponibilidadSerializer,
    MedicoSerializer,
    PacienteFichaSerializer,
    PacienteSerializer,
)

WRITE_ROLES = (
    Role.SUPER_ADMIN,
    Role.CLINIC_ADMIN,
    Role.BRANCH_ADMIN,
    Role.RECEPTIONIST,
    Role.PATIENT,
)


class TenantViewSet(viewsets.ModelViewSet):
    permission_classes = [RolePermission]

    def clinica_id(self):
        return current_clinica_id()

    def get_queryset(self):
        qs = super().get_queryset()
        clinica = self.clinica_id()
        if clinica:
            qs = qs.filter(clinica_id=clinica)
        return qs


class MedicoViewSet(TenantViewSet):
    queryset = Medico.objects.all()
    serializer_class = MedicoSerializer
    required_roles = (Role.SUPER_ADMIN, Role.CLINIC_ADMIN, Role.BRANCH_ADMIN)

    @action(detail=True, methods=["get"])
    def agenda(self, request, pk=None):
        medico = self.get_object()
        qs = Cita.objects.filter(medico=medico)
        desde = parse_datetime(request.query_params.get("desde", ""))
        hasta = parse_datetime(request.query_params.get("hasta", ""))
        if desde:
            qs = qs.filter(fecha__gte=desde)
        if hasta:
            qs = qs.filter(fecha__lte=hasta)
        return Response(CitaSerializer(qs.order_by("fecha"), many=True).data)


class PacienteViewSet(TenantViewSet):
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    required_roles = (Role.SUPER_ADMIN, Role.CLINIC_ADMIN, Role.BRANCH_ADMIN, Role.RECEPTIONIST)

    @action(detail=True, methods=["get"], url_path="ficha-clinica")
    def ficha_clinica(self, request, pk=None):
        paciente = get_object_or_404(Paciente, pk=pk)
        user = request.user
        if user.rol not in (Role.SUPER_ADMIN, Role.CLINIC_ADMIN, Role.BRANCH_ADMIN, Role.RECEPTIONIST):
            if user.rol == Role.DOCTOR:
                from apps.scheduling.models import Cita

                if not Cita.objects.filter(paciente=paciente, medico_id=user.medico_id).exists():
                    return Response({"detail": "Sin permiso"}, status=status.HTTP_403_FORBIDDEN)
            elif user.rol == Role.PATIENT and str(user.paciente_id) != str(paciente.id):
                return Response({"detail": "Sin permiso"}, status=status.HTTP_403_FORBIDDEN)
        data = PacienteFichaSerializer(paciente).data
        return Response(data)


class DisponibilidadViewSet(TenantViewSet):
    queryset = Disponibilidad.objects.all()
    serializer_class = DisponibilidadSerializer
    required_roles = (Role.SUPER_ADMIN, Role.CLINIC_ADMIN, Role.BRANCH_ADMIN, Role.RECEPTIONIST, Role.DOCTOR)

    def get_queryset(self):
        qs = Disponibilidad.objects.select_related("medico", "sucursal")
        clinica = self.clinica_id()
        if clinica:
            qs = qs.filter(medico__clinica_id=clinica)
        medico = self.request.query_params.get("medico")
        if medico:
            qs = qs.filter(medico_id=medico)
        return qs

    @action(detail=False, methods=["get"])
    def slots(self, request):
        clinica = self.clinica_id()
        sucursal = request.query_params.get("sucursal")
        fecha = parse_date(request.query_params.get("fecha", ""))
        if not clinica or not sucursal or not fecha:
            return Response(
                {"detail": "Parámetros requeridos: sucursal, fecha (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = services.available_slots(
            clinica_id=clinica,
            sucursal_id=sucursal,
            fecha=fecha,
            medico_id=request.query_params.get("medico"),
            especialidad_id=request.query_params.get("especialidad"),
        )
        for slot in data:
            slot["desde"] = slot["desde"].isoformat()
            slot["hasta"] = slot["hasta"].isoformat()
        return Response(data)


class CitaViewSet(TenantViewSet):
    queryset = Cita.objects.select_related("medico", "paciente", "sucursal")
    serializer_class = CitaSerializer
    required_roles = WRITE_ROLES

    def get_queryset(self):
        qs = Cita.objects.select_related("medico", "paciente", "sucursal")
        clinica = self.clinica_id()
        user = self.request.user
        if clinica:
            qs = qs.filter(clinica_id=clinica)
        if user.rol == Role.DOCTOR and user.medico_id:
            qs = qs.filter(medico_id=user.medico_id)
        if user.rol == Role.PATIENT and user.paciente_id:
            qs = qs.filter(paciente_id=user.paciente_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = CitaCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        clinica = self.clinica_id()
        if not clinica:
            return Response({"detail": "Se requiere contexto de clínica."}, status=status.HTTP_400_BAD_REQUEST)

        medico = data["medico"]
        paciente = data["paciente"]
        if medico.clinica_id != clinica or paciente.clinica_id != clinica:
            return Response(
                {"detail": "Médico o paciente fuera de la clínica."}, status=status.HTTP_400_BAD_REQUEST
            )

        start = data["fecha"]
        duracion = data.get("duracion_minutos") or 30
        end = services.add_minutes(start, duracion)

        if services.doctor_has_overlap(clinica, medico.id, start, end):
            return Response({"detail": "El médico ya tiene una cita en ese horario."}, status=status.HTTP_409_CONFLICT)
        if services.patient_has_overlap(clinica, paciente.id, start, end):
            return Response({"detail": "El paciente ya tiene una cita a esa hora."}, status=status.HTTP_409_CONFLICT)

        with transaction.atomic():
            cita = Cita.objects.create(
                clinica_id=clinica,
                sucursal=data["sucursal"],
                consultorio=data.get("consultorio"),
                especialidad=data.get("especialidad"),
                medico=medico,
                paciente=paciente,
                fecha=start,
                duracion_minutos=duracion,
                origen="web",
                notas=data.get("notas"),
                creado_por_id=current_user_id(),
            )
            Auditoria.objects.create(
                clinica_id=clinica,
                usuario_id=current_user_id(),
                accion="CREATE_CITA",
                entidad="Cita",
                entidad_id=str(cita.id),
            )
        return Response(CitaSerializer(cita).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"])
    def reagendar(self, request, pk=None):
        cita = self.get_object()
        if cita.estado not in ACTIVE_STATUSES:
            return Response({"detail": "Cita no reagendable."}, status=status.HTTP_409_CONFLICT)
        nueva = parse_datetime(request.data.get("fecha", ""))
        if not nueva:
            return Response({"detail": "Fecha inválida."}, status=status.HTTP_400_BAD_REQUEST)
        end = services.add_minutes(nueva, cita.duracion_minutos)
        if services.doctor_has_overlap(cita.clinica_id, cita.medico_id, nueva, end, exclude_id=cita.id):
            return Response({"detail": "El médico ya tiene una cita en ese horario."}, status=status.HTTP_409_CONFLICT)
        if services.patient_has_overlap(cita.clinica_id, cita.paciente_id, nueva, end, exclude_id=cita.id):
            return Response({"detail": "El paciente ya tiene una cita a esa hora."}, status=status.HTTP_409_CONFLICT)
        cita.fecha = nueva
        cita.estado = AppointmentStatus.RESCHEDULED
        cita.save(update_fields=["fecha", "estado", "updated_at"])
        Auditoria.objects.create(
            clinica_id=cita.clinica_id,
            usuario_id=current_user_id(),
            accion="RESCHEDULE_CITA",
            entidad="Cita",
            entidad_id=str(cita.id),
        )
        return Response(CitaSerializer(cita).data)

    @action(detail=True, methods=["patch"])
    def cancelar(self, request, pk=None):
        cita = self.get_object()
        if cita.estado not in ACTIVE_STATUSES:
            return Response({"detail": "Cita no cancelable."}, status=status.HTTP_409_CONFLICT)
        cita.estado = AppointmentStatus.CANCELLED
        cita.save(update_fields=["estado", "updated_at"])
        Auditoria.objects.create(
            clinica_id=cita.clinica_id,
            usuario_id=current_user_id(),
            accion="CANCEL_CITA",
            entidad="Cita",
            entidad_id=str(cita.id),
        )
        return Response(CitaSerializer(cita).data)


class WhatsAppWebhookView(APIView):
    """Webhook de la WhatsApp Cloud API (verificación e ingreso de mensajes)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.conf import settings

        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")
        if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
            return Response(int(challenge) if challenge and challenge.isdigit() else challenge)
        return Response({"detail": "Verificación fallida"}, status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        from apps.notifications.tasks import send_whatsapp_notification

        entry = (request.data.get("entry") or [{}])[0]
        changes = (entry.get("changes") or [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages") or []
        for msg in messages:
            sender = msg.get("from")
            text = (msg.get("text") or {}).get("body", "")
            send_whatsapp_notification.delay(str(sender), str(sender), f"Recibimos tu mensaje: {text}")
        return Response({"status": "received"})
