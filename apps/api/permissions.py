from rest_framework.permissions import SAFE_METHODS, BasePermission


class RolePermission(BasePermission):
    """Permite el acceso según `view.required_roles` (escritura) o lectura autenticada.

    Define en la vista:
        required_roles = (Role.ADMIN, ...)  # para métodos de escritura
        safe_roles = (...)                  # opcional, restringe también GET
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS and not getattr(view, "safe_roles", None):
            return True
        required = getattr(view, "safe_roles", None) if request.method in SAFE_METHODS else None
        if required is None:
            required = getattr(view, "required_roles", None)
        if not required:
            return True
        return user.rol in required
