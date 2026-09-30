from django.conf import settings
from django.db import models

from apps.core.models import AppointmentStatus, TimeStampedModel


class Especialidad(TimeStampedModel):
    nombre = models.CharField(max_length=120, unique=True)
    duracion_minutos = models.PositiveIntegerField(default=30)

    class Meta:
        db_table = "scheduling_especialidad"
        verbose_name = "especialidad"
        verbose_name_plural = "especialidades"

    def __str__(self) -> str:
        return self.nombre


class Medico(TimeStampedModel):
    clinica = models.ForeignKey("tenants.Clinica", on_delete=models.CASCADE, related_name="medicos")
    nombre = models.CharField(max_length=200)
    rut = models.CharField(max_length=20, blank=True, null=True)
    registro_profesional = models.CharField(max_length=60, blank=True, null=True)
    especialidades = models.ManyToManyField(Especialidad, blank=True, related_name="medicos")

    class Meta:
        db_table = "scheduling_medico"
        verbose_name = "médico"
        verbose_name_plural = "médicos"
        indexes = [models.Index(fields=["clinica"])]

    def __str__(self) -> str:
        return self.nombre


class Paciente(TimeStampedModel):
    clinica = models.ForeignKey("tenants.Clinica", on_delete=models.CASCADE, related_name="pacientes")
    nombre = models.CharField(max_length=200)
    apellido = models.CharField(max_length=200, blank=True, null=True)
    rut = models.CharField(max_length=20, blank=True, null=True)
    telefono = models.CharField(max_length=40, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    class Meta:
        db_table = "scheduling_paciente"
        verbose_name = "paciente"
        verbose_name_plural = "pacientes"
        indexes = [models.Index(fields=["clinica"])]

    def __str__(self) -> str:
        return f"{self.nombre} {self.apellido or ''}".strip()


class Disponibilidad(TimeStampedModel):
    DIAS = [(0, "Lunes"), (1, "Martes"), (2, "Miércoles"), (3, "Jueves"), (4, "Viernes"), (5, "Sábado"), (6, "Domingo")]

    medico = models.ForeignKey(Medico, on_delete=models.CASCADE, related_name="disponibilidades")
    sucursal = models.ForeignKey("tenants.Sucursal", on_delete=models.CASCADE, related_name="disponibilidades")
    consultorio = models.ForeignKey(
        "tenants.Consultorio", null=True, blank=True, on_delete=models.SET_NULL, related_name="disponibilidades"
    )
    dia_semana = models.PositiveSmallIntegerField(choices=DIAS)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    vigente_desde = models.DateField()
    vigente_hasta = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "scheduling_disponibilidad"
        verbose_name = "disponibilidad"
        verbose_name_plural = "disponibilidades"
        indexes = [models.Index(fields=["medico", "sucursal"])]

    def __str__(self) -> str:
        return f"{self.medico} {self.get_dia_semana_display()} {self.hora_inicio}-{self.hora_fin}"


class BloqueoAgenda(TimeStampedModel):
    medico = models.ForeignKey(Medico, on_delete=models.CASCADE, related_name="bloqueos")
    fecha_desde = models.DateTimeField()
    fecha_hasta = models.DateTimeField()
    motivo = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "scheduling_bloqueoagenda"
        verbose_name = "bloqueo de agenda"
        verbose_name_plural = "bloqueos de agenda"
        indexes = [models.Index(fields=["medico", "fecha_desde"])]

    def __str__(self) -> str:
        return f"{self.medico} {self.fecha_desde} → {self.fecha_hasta}"


class Cita(TimeStampedModel):
    clinica = models.ForeignKey("tenants.Clinica", on_delete=models.CASCADE, related_name="citas")
    sucursal = models.ForeignKey("tenants.Sucursal", on_delete=models.CASCADE, related_name="citas")
    consultorio = models.ForeignKey(
        "tenants.Consultorio", null=True, blank=True, on_delete=models.SET_NULL, related_name="citas"
    )
    especialidad = models.ForeignKey(
        Especialidad, null=True, blank=True, on_delete=models.SET_NULL, related_name="citas"
    )
    medico = models.ForeignKey(Medico, on_delete=models.CASCADE, related_name="citas")
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name="citas")
    fecha = models.DateTimeField()
    duracion_minutos = models.PositiveIntegerField(default=30)
    estado = models.CharField(max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.PENDING)
    origen = models.CharField(max_length=20, default="web")
    notas = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="citas_creadas"
    )

    class Meta:
        db_table = "scheduling_cita"
        verbose_name = "cita"
        verbose_name_plural = "citas"
        ordering = ["-fecha"]
        indexes = [
            models.Index(fields=["clinica", "fecha"]),
            models.Index(fields=["medico", "fecha"]),
            models.Index(fields=["paciente", "fecha"]),
        ]

    def __str__(self) -> str:
        return f"{self.fecha:%Y-%m-%d %H:%M} {self.paciente} · {self.medico}"


class FichaClinica(TimeStampedModel):
    paciente = models.OneToOneField(Paciente, on_delete=models.CASCADE, related_name="ficha")
    antecedentes = models.TextField(blank=True, null=True)
    alergias = models.TextField(blank=True, null=True)
    medicamentos = models.TextField(blank=True, null=True)
    notas_evolucion = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "scheduling_fichaclinica"
        verbose_name = "ficha clínica"
        verbose_name_plural = "fichas clínicas"

    def __str__(self) -> str:
        return f"Ficha de {self.paciente}"


class Auditoria(TimeStampedModel):
    clinica = models.ForeignKey("tenants.Clinica", on_delete=models.CASCADE, related_name="auditorias")
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="auditorias"
    )
    accion = models.CharField(max_length=80)
    entidad = models.CharField(max_length=80)
    entidad_id = models.CharField(max_length=64, blank=True, null=True)
    detalle = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "scheduling_auditoria"
        verbose_name = "auditoría"
        verbose_name_plural = "auditorías"
        indexes = [models.Index(fields=["clinica", "created_at"])]
