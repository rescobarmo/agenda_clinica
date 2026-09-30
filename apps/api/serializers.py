from rest_framework import serializers

from apps.scheduling.models import (
    Cita,
    Disponibilidad,
    Especialidad,
    FichaClinica,
    Medico,
    Paciente,
)


class EspecialidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Especialidad
        fields = ["id", "nombre", "duracion_minutos"]


class MedicoSerializer(serializers.ModelSerializer):
    especialidades = EspecialidadSerializer(many=True, read_only=True)

    class Meta:
        model = Medico
        fields = ["id", "nombre", "rut", "registro_profesional", "especialidades"]


class PacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paciente
        fields = ["id", "nombre", "apellido", "rut", "telefono", "email"]


class FichaClinicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FichaClinica
        fields = ["antecedentes", "alergias", "medicamentos", "notas_evolucion"]


class PacienteFichaSerializer(PacienteSerializer):
    ficha = FichaClinicaSerializer(read_only=True)

    class Meta(PacienteSerializer.Meta):
        fields = PacienteSerializer.Meta.fields + ["ficha"]


class DisponibilidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disponibilidad
        fields = [
            "id",
            "medico",
            "sucursal",
            "consultorio",
            "dia_semana",
            "hora_inicio",
            "hora_fin",
            "vigente_desde",
            "vigente_hasta",
        ]


class CitaSerializer(serializers.ModelSerializer):
    medico = MedicoSerializer(read_only=True)
    paciente = PacienteSerializer(read_only=True)

    class Meta:
        model = Cita
        fields = [
            "id",
            "fecha",
            "duracion_minutos",
            "estado",
            "origen",
            "notas",
            "medico",
            "paciente",
            "sucursal",
            "especialidad",
            "created_at",
        ]


class CitaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cita
        fields = [
            "sucursal",
            "consultorio",
            "especialidad",
            "medico",
            "paciente",
            "fecha",
            "duracion_minutos",
            "notas",
        ]
