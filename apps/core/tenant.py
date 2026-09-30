"""Contexto de tenant por request (clínica y usuario activos)."""
import contextvars

_current_clinica_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "current_clinica_id", default=None
)
_current_user_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "current_user_id", default=None
)


def set_current_tenant(clinica_id: str | None, user_id: str | None):
    token = (
        _current_clinica_id.set(str(clinica_id) if clinica_id else None),
        _current_user_id.set(str(user_id) if user_id else None),
    )
    return token


def reset_current_tenant(token) -> None:
    _current_clinica_id.reset(token[0])
    _current_user_id.reset(token[1])


def current_clinica_id() -> str | None:
    return _current_clinica_id.get()


def current_user_id() -> str | None:
    return _current_user_id.get()
