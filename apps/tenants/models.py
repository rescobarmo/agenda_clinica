from django.db import models

from apps.core.models import TimeStampedModel


class Clinica(TimeStampedModel):
    nombre = models.CharField(max_length=200)
    rut = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=40, blank=True, null=True)

    class Meta:
        db_table = "tenants_clinica"
        verbose_name = "clínica"
        verbose_name_plural = "clínicas"

    def __str__(self) -> str:
        return self.nombre


class Sucursal(TimeStampedModel):
    clinica = models.ForeignKey(Clinica, on_delete=models.CASCADE, related_name="sucursales")
    nombre = models.CharField(max_length=200)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    zona_horaria = models.CharField(max_length=64, default="America/Santiago")

    class Meta:
        db_table = "tenants_sucursal"
        verbose_name = "sucursal"
        verbose_name_plural = "sucursales"
        indexes = [models.Index(fields=["clinica"])]

    def __str__(self) -> str:
        return f"{self.nombre} · {self.clinica.nombre}"


class Consultorio(TimeStampedModel):
    sucursal = models.ForeignKey(Sucursal, on_delete=models.CASCADE, related_name="consultorios")
    nombre = models.CharField(max_length=200)

    class Meta:
        db_table = "tenants_consultorio"
        verbose_name = "consultorio"
        verbose_name_plural = "consultorios"
        indexes = [models.Index(fields=["sucursal"])]

    def __str__(self) -> str:
        return f"{self.nombre} · {self.sucursal.nombre}"
