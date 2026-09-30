"""Lógica de negocio de agendamiento: solapamientos y slots disponibles."""
from datetime import datetime, timedelta

from django.utils import timezone

from apps.core.models import ACTIVE_STATUSES, AppointmentStatus

from .models import BloqueoAgenda, Cita, Disponibilidad

SLOT_MINUTES = 30


def add_minutes(moment: datetime, minutes: int) -> datetime:
    return moment + timedelta(minutes=minutes)


def overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


def doctor_has_overlap(clinica_id, medico_id, start: datetime, end: datetime, exclude_id=None) -> bool:
    day_start = timezone.make_aware(datetime.combine(start.date(), datetime.min.time())) if timezone.is_naive(start) else start.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    qs = Cita.objects.filter(
        clinica_id=clinica_id,
        medico_id=medico_id,
        estado__in=ACTIVE_STATUSES,
        fecha__gte=day_start,
        fecha__lt=day_end,
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return any(overlaps(c.fecha, add_minutes(c.fecha, c.duracion_minutos), start, end) for c in qs)


def patient_has_overlap(clinica_id, paciente_id, start: datetime, end: datetime, exclude_id=None) -> bool:
    day_start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    qs = Cita.objects.filter(
        clinica_id=clinica_id,
        paciente_id=paciente_id,
        estado__in=ACTIVE_STATUSES,
        fecha__gte=day_start,
        fecha__lt=day_end,
    )
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return any(overlaps(c.fecha, add_minutes(c.fecha, c.duracion_minutos), start, end) for c in qs)


def available_slots(clinica_id, sucursal_id, fecha, medico_id=None, especialidad_id=None):
    """Genera slots libres de SLOT_MINUTES para una fecha/sucursal."""
    dia_semana = fecha.weekday()
    disponibilidades = Disponibilidad.objects.filter(
        sucursal_id=sucursal_id,
        dia_semana=dia_semana,
        vigente_desde__lte=fecha,
        medico__clinica_id=clinica_id,
    )
    if medico_id:
        disponibilidades = disponibilidades.filter(medico_id=medico_id)
    if especialidad_id:
        disponibilidades = disponibilidades.filter(medico__especialidades__id=especialidad_id)

    tz = timezone.get_current_timezone()
    slots = []
    for d in disponibilidades.select_related("medico"):
        cursor = timezone.make_aware(datetime.combine(fecha, d.hora_inicio), tz)
        fin = timezone.make_aware(datetime.combine(fecha, d.hora_fin), tz)
        while add_minutes(cursor, SLOT_MINUTES) <= fin:
            until = add_minutes(cursor, SLOT_MINUTES)
            slots.append(
                {
                    "medico_id": str(d.medico_id),
                    "medico": d.medico.nombre,
                    "desde": cursor,
                    "hasta": until,
                    "consultorio_id": str(d.consultorio_id) if d.consultorio_id else None,
                }
            )
            cursor = until

    if not slots:
        return []

    day_start = timezone.make_aware(datetime.combine(fecha, datetime.min.time()), tz)
    day_end = day_start + timedelta(days=1)
    medico_ids = {s["medico_id"] for s in slots}

    citas = Cita.objects.filter(
        clinica_id=clinica_id,
        medico_id__in=medico_ids,
        estado__in=ACTIVE_STATUSES,
        fecha__gte=day_start,
        fecha__lt=day_end,
    )
    bloqueos = BloqueoAgenda.objects.filter(
        medico_id__in=medico_ids,
        fecha_desde__lt=day_end,
        fecha_hasta__gte=day_start,
    )

    result = []
    for slot in slots:
        ocupado = any(
            overlaps(c.fecha, add_minutes(c.fecha, c.duracion_minutos), slot["desde"], slot["hasta"]) for c in citas
        )
        bloqueado = any(
            overlaps(b.fecha_desde, b.fecha_hasta, slot["desde"], slot["hasta"]) for b in bloqueos
        )
        if not ocupado and not bloqueado:
            result.append(slot)
    return result
