from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    path("", views.dashboard, name="home"),
    path("login/", auth_views.LoginView.as_view(template_name="login.html"), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("panel/", views.dashboard, name="dashboard"),
    path("agenda/", views.agenda, name="agenda"),
    path("pacientes/<uuid:paciente_id>/ficha/", views.ficha, name="paciente-ficha"),
]
