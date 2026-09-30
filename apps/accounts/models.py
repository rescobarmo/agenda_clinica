import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import Role


class User(AbstractUser):
    """Usuario del sistema. El acceso se segmenta por clínica/sucursal y por rol."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rol = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    clinica = models.ForeignKey(
        "tenants.Clinica", null=True, blank=True, on_delete=models.SET_NULL, related_name="usuarios"
    )
    sucursal = models.ForeignKey(
        "tenants.Sucursal", null=True, blank=True, on_delete=models.SET_NULL, related_name="usuarios"
    )
    medico = models.OneToOneField(
        "scheduling.Medico", null=True, blank=True, on_delete=models.SET_NULL, related_name="usuario"
    )
    paciente = models.OneToOneField(
        "scheduling.Paciente", null=True, blank=True, on_delete=models.SET_NULL, related_name="usuario"
    )

    class Meta:
        db_table = "accounts_user"
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username} ({self.rol})"
