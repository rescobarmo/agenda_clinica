from django.db import connection
from django.http import JsonResponse
from django.urls import path


def healthz(_request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        database = "up"
    except Exception:  # pragma: no cover
        database = "down"
    return JsonResponse(
        {"status": "ok" if database == "up" else "degraded", "database": database},
        status=200 if database == "up" else 503,
    )


urlpatterns = [
    path("", healthz, name="api-health"),
]
