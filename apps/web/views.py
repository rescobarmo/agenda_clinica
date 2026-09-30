from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, render

from apps.core.models import Role
from apps.scheduling.models import Cita, Paciente

from .health_urls import healthz  # noqa: F401  (reexport para urls)


@login_required
def dashboard(request):
    citas = Cita.objects.select_related("medico", "paciente", "sucursal")
    user = request.user
    if user.clinica_id:
        citas = citas.filter(clinica_id=user.clinica_id)
    if user.rol == Role.DOCTOR and user.medico_id:
        citas = citas.filter(medico_id=user.medico_id)
    if user.rol == Role.PATIENT and user.paciente_id:
        citas = citas.filter(paciente_id=user.paciente_id)
    return render(request, "dashboard.html", {"citas": citas[:100]})


@login_required
def agenda(request):
    citas = Cita.objects.select_related("medico", "paciente")
    if request.user.clinica_id:
        citas = citas.filter(clinica_id=request.user.clinica_id)
    return render(request, "agenda.html", {"citas": citas[:200]})


@login_required
def ficha(request, paciente_id):
    paciente = get_object_or_404(Paciente.objects.select_related("ficha"), pk=paciente_id)
    return render(request, "ficha.html", {"paciente": paciente})
