"""Middleware que fija el contexto de tenant y las variables de sesión para RLS.

Las variables `app.current_clinica_id` y `app.current_user_id` se aplican con
`set_config(..., true)` (scope de transacción) para que sean seguras con
PgBouncer en modo *transaction pooling*.
"""
from django.conf import settings
from django.db import connection, transaction

from .tenant import reset_current_tenant, set_current_tenant


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        authenticated = bool(user and getattr(user, "is_authenticated", False))
        clinica_id = getattr(user, "clinica_id", None) if authenticated else None
        user_id = str(user.pk) if authenticated else None

        token = set_current_tenant(clinica_id, user_id)
        try:
            if getattr(settings, "RLS_ENABLED", False) and clinica_id:
                with transaction.atomic():
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "SELECT set_config('app.current_clinica_id', %s, true)",
                            [str(clinica_id)],
                        )
                        if user_id:
                            cursor.execute(
                                "SELECT set_config('app.current_user_id', %s, true)",
                                [user_id],
                            )
                    return self.get_response(request)
            return self.get_response(request)
        finally:
            reset_current_tenant(token)
