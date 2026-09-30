from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def healthz(_request):
    """Healthcheck para Traefik / Uptime Kuma."""
    from django.db import connection

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        database = "up"
    except Exception:  # pragma: no cover
        database = "down"
    status_code = 200 if database == "up" else 503
    return JsonResponse(
        {"status": "ok" if database == "up" else "degraded", "database": database},
        status=status_code,
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz/", healthz, name="healthz"),
    path("api/", include("apps.api.urls")),
    path("", include("apps.web.urls")),
]
