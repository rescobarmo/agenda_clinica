# Guía de despliegue en producción

**Sistema de agendamiento de horas médicas**
Stack: Django 5 + DRF + Celery + Gunicorn · PostgreSQL 16 (RLS) · PgBouncer · Redis 7 · HTMX + Alpine + Tailwind · WhatsApp Cloud API · Docker + Traefik v3 · VPS Ubuntu 24.04 LTS

---

## Variables (edítalas antes de empezar)

```bash
DOMINIO="midominio.com"
IP_VPS="123.45.67.89"
USUARIO="deploy"
EMAIL_ADMIN="admin@midominio.com"
REPO_GIT="git@github.com:usuario/clinica-app.git"
APP_DIR="/opt/clinica-app"
```

DNS a configurar (registros **A** hacia `IP_VPS`): `midominio.com`, `www`, `api`, `whatsapp`, `status`, `flower`, `traefik`.

---

## Fase 1: Preparación inicial del VPS

```bash
# Conexión SSH inicial como root
ssh root@$IP_VPS
```

```bash
# Actualización del sistema
apt-get update -y && apt-get upgrade -y
```

```bash
# Crear usuario no-root con sudo
adduser --gecos "" $USUARIO
usermod -aG sudo $USUARIO
```

```bash
# Zona horaria
timedatectl set-timezone America/Santiago
timedatectl
```

```bash
# Verificar recursos (CPU, RAM, disco)
nproc && free -h && df -h /
```

**Verificación:** `timedatectl` debe mostrar `America/Santiago`; `df -h` con espacio libre > 10 GB.

---

## Fase 2: Hardening del VPS

> ⚠️ **Dependencia:** antes de deshabilitar el login por contraseña, copia tu clave pública al VPS.

```bash
# (En TU máquina local) copiar la clave pública al servidor
ssh-copy-id -i ~/.ssh/id_ed25519.pub $USUARIO@$IP_VPS
```

```bash
# (En el VPS, como $USUARIO) crear ~/.ssh con permisos correctos si hiciera falta
mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
```

```bash
# UFW: solo 22, 80 y 443
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

```bash
# Fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable --now fail2ban
sudo systemctl status fail2ban --no-pager
```

```bash
# Actualizaciones automáticas de seguridad
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

```bash
# Ajustes de kernel (sysctl)
sudo tee /etc/sysctl.d/99-agenda.conf >/dev/null <<'EOF'
net.ipv4.tcp_syncookies=1
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.all.accept_redirects=0
net.ipv6.conf.all.accept_redirects=0
net.ipv4.conf.all.send_redirects=0
vm.swappiness=10
fs.file-max=100000
EOF
sudo sysctl --system
```

```bash
# Deshabilitar login root y por contraseña (EN EL VPS, como root)
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh
```

**Verificación CRÍTICA (antes de cerrar la sesión root):** abre **otra terminal** y comprueba que entras con clave:

```bash
ssh $USUARIO@$IP_VPS
sudo whoami   # debe responder: root
```

Si falla, mantén la sesión root abierta y revisa `/var/log/auth.log`. **No cierres la sesión root** hasta confirmar el acceso.

---

## Fase 3: Docker y Docker Compose

```bash
# Instalar Docker desde el repositorio oficial
curl -fsSL https://get.docker.com | sudo sh
```

```bash
# Plugin Docker Compose v2 (incluido por el script; verificar)
docker compose version
```

```bash
# Añadir el usuario deploy al grupo docker
sudo usermod -aG docker $USUARIO
newgrp docker
```

```bash
# Verificación
docker run --rm hello-world
```

**Verificación:** aparece el mensaje de `hello-world`. Si da "permission denied", cierra sesión y vuelve a entrar para refrescar el grupo.

---

## Fase 4: Clonado y configuración del proyecto

```bash
# Clave SSH para el VPS (si no usas deploy key)
ssh-keygen -t ed25519 -C "$EMAIL_ADMIN" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copia esa clave en el repositorio Git privado: **Settings → Deploy keys → Add deploy key** (solo lectura).

```bash
# Clonar el proyecto
sudo mkdir -p /opt && sudo chown $USUARIO:$USUARIO /opt
git clone $REPO_GIT /opt/clinica-app
cd /opt/clinica-app
```

```bash
# Crear .env a partir del ejemplo
cp .env.example .env
```

```bash
# Generar secretos
mkdir -p secrets
python3 -c "import secrets; print(secrets.token_urlsafe(64))" > secrets/django_secret_key.txt
openssl rand -base64 32 > secrets/db_password.txt
echo "TU_ACCESS_TOKEN_DE_META" > secrets/whatsapp_token.txt
chmod 600 secrets/*.txt
```

```bash
# Configurar TRAEFIK_BASICAUTH y FLOWER_BASICAUTH (htpasswd)
sudo apt-get install -y apache2-utils
htpasswd -nbB admin 'TU_PASSWORD_TRAEFIK' | sed -e 's/\$/\$\$/g'
htpasswd -nbB admin 'TU_PASSWORD_FLOWER'  | sed -e 's/\$/\$\$/g'
```

Pega cada salida en `.env` (`TRAEFIK_BASICAUTH=` y `FLOWER_BASICAUTH=`) y ajusta además `DOMAIN`, `ACME_EMAIL`, `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD` y `DATABASE_URL`.

> Para usar los archivos de `secrets/`, define `DJANGO_SECRET_KEY_FILE=/run/secrets/django_secret_key` etc. y móntalos como secretos. Alternativa simple: pegar los valores directamente en `.env`.

---

## Fase 5: Ejecución del stack

```bash
# Levantar en producción
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

```bash
# Estado de los servicios
docker compose ps
docker compose logs -f web
```

```bash
# Migraciones (si no se aplican automáticamente)
docker compose exec web python manage.py migrate
```

```bash
# Políticas RLS
docker compose exec web python manage.py apply_rls_policies
```

```bash
# Superusuario de Django
docker compose exec web python manage.py createsuperuser
```

```bash
# Estáticos (ya se recolectan en el arranque; forzar si hace falta)
docker compose exec web python manage.py collectstatic --noinput
```

```bash
# Verificar emisión de certificados SSL de Traefik
docker compose logs traefik | grep -i acme
docker compose exec traefik ls -l /letsencrypt
```

```bash
# Verificar respuesta de la app
curl -I https://$DOMINIO
curl -s https://$DOMINIO/healthz/
```

**Verificación:** `curl -I` responde `HTTP/2 200`; `/healthz/` devuelve `{"status":"ok","database":"up"}`.

---

## Fase 6: Configuración de WhatsApp

1. En **Meta Business Suite → WhatsApp → Configuration → Webhook**:
   - **Callback URL:** `https://midominio.com/api/whatsapp/webhook/`
   - **Verify Token:** el mismo valor de `WHATSAPP_VERIFY_TOKEN` en `.env`.
2. Pulsa **Verify and save** (Meta hace un `GET` con `hub.verify_token`; nuestro webhook responde el `hub.challenge`).
3. Suscríbete al campo **messages**.

```bash
# Probar el flujo enviando un mensaje al número de WhatsApp Business

# Revisar logs del worker de WhatsApp
docker compose logs -f whatsapp-worker
```

**Verificación:** al enviar un mensaje, aparece en los logs la tarea procesada y llega la respuesta automática.

**Solución de problemas:**
- *Verificación falla* → el `WHATSAPP_VERIFY_TOKEN` del `.env` no coincide con el de Meta, o Traefik no enruta `midominio.com/api/...` (revisa `docker compose logs traefik`).

---

## Fase 7: Backups automáticos

```bash
# Configurar rclone con Backblaze B2 (remoto: b2, crea el bucket antes)
rclone config
rclone lsd backblaze-b2:
```

El script ya existe en `scripts/backup.sh` (pg_dump cifrado con GPG + subida a B2 + rotación local de 7 días). Asegúrate de tener `pg_dump` y `gpg`:

```bash
sudo apt-get install -y postgresql-client gnupg rclone
gpg --full-generate-key          # o importa la clave del destinatario
```

```bash
# Programar con cron (2 AM)
crontab -e
# Añadir:
# 0 2 * * * /opt/clinica-app/scripts/backup.sh >> /var/log/backup-clinica.log 2>&1
```

```bash
# Prueba de restauración en un entorno local
bash scripts/restore.sh /ruta/backup.dump.gpg
```

**Verificación:** `rclone ls backblaze-b2:agenda-backups` muestra el `.dump.gpg` reciente.

---

## Fase 8: Monitoreo

```bash
# Uptime Kuma queda expuesto en https://status.midominio.com
docker compose logs -f uptime-kuma
```

En Uptime Kuma crea los monitores:

- `https://midominio.com` → HTTP(s), esperar 200.
- `https://midominio.com/healthz/` → HTTP(s), esperar 200.
- `https://midominio.com` → tipo **TCP/SSL (certificado)**, puerto 443, avisar X días antes de expirar.

Configura notificaciones (email SMTP o Telegram) en **Settings → Notifications**.

```bash
# Flower (BasicAuth) y tareas Celery
# https://flower.midominio.com
```

```bash
# Métricas de Traefik (dashboard) y health
# https://traefik.midominio.com  (BasicAuth)
docker compose logs -f traefik
```

---

## Fase 9: Operación diaria

```bash
# Ver logs de todos los servicios
docker compose logs -f
```

```bash
# Reiniciar un solo servicio
docker compose restart web
```

```bash
# Actualizar código sin downtime (rolling de apps)
cd /opt/clinica-app
git pull
docker compose build web worker beat whatsapp-worker
docker compose up -d --no-deps web worker beat whatsapp-worker
docker compose exec web python manage.py migrate --noinput
```

```bash
# Rollback a la versión anterior
cd /opt/clinica-app
git log --oneline -5
git checkout <COMMIT_ANTERIOR>
docker compose build web worker beat whatsapp-worker
docker compose up -d --no-deps web worker beat whatsapp-worker
```

```bash
# Shell de un contenedor para debugging
docker compose exec web bash
```

---

## Fase 10: Troubleshooting

**Traefik no emite certificados SSL**
- Verifica DNS: `dig +short $DOMINIO` debe devolver `IP_VPS`.
- Puertos 80/443 abiertos en UFW y en el firewall del proveedor.
- Logs: `docker compose logs traefik | grep -i acme`. El challenge HTTP-01 necesita el puerto 80 público.
- Si superaste los límites de Let's Encrypt en pruebas, usa el *staging* y luego producción.

**La base de datos no acepta conexiones desde PgBouncer**
- `docker compose logs pgbouncer` y `docker compose logs db`.
- Verifica `DB_USER`/`DB_PASSWORD`/`DB_NAME` y que `db` esté `healthy`.
- Con PgBouncer en modo *transaction* mantenemos `DISABLE_SERVER_SIDE_CURSORS=True`. No uses `CONN_MAX_AGE` alto.

**Celery no procesa tareas**
- `docker compose logs -f worker` y `docker compose logs -f beat`.
- Confirma `CELERY_BROKER_URL` accesible: `docker compose exec redis redis-cli -n 1 ping`.
- Revisa que el worker escuche la cola correcta (`-Q celery` / `-Q whatsapp`).

**El webhook de WhatsApp falla**
- Debe ser HTTPS público y sin redirección previa.
- Revisa `WHATSAPP_VERIFY_TOKEN` y que `midominio.com/api/whatsapp/webhook/` responda (`docker compose logs web`).
- El token de acceso caduca (24 h en tokens temporales); usa un token permanente de System User.

**RLS bloquea consultas legítimas**
- Verifica que la conexión sea de un usuario con RLS aplicado y que el `TenantMiddleware` fije `app.current_clinica_id`.
- Prueba dentro de una transacción: `SELECT set_config('app.current_clinica_id', '<uuid>', true);`
- Una tarea de Celery o un comando sin contexto verá todo; para ese caso reaplica las políticas o usa un rol `BYPASSRLS` para administración.

**El disco se llena**
- `df -h`, `docker system df`.
- Limpia: `docker system prune -af` y `docker image prune -af`.
- Revisa logs grandes: `du -sh /var/lib/docker/containers/*`.

**Un contenedor entra en bucle de reinicio**
- `docker compose logs --tail=100 <servicio>`.
- Suele ser una variable de entorno faltante (p. ej. `POSTGRES_PASSWORD`) o fallo de conexión a la DB; corrige `.env` y `docker compose up -d <servicio>`.

---

## Checklist final de verificación

- [ ] Acceso SSH con clave y sin contraseña; login root deshabilitado.
- [ ] UFW activo con solo 22/80/443; fail2ban corriendo.
- [ ] `docker run hello-world` funciona sin sudo.
- [ ] `docker compose ps` muestra todo `Up`/`healthy`.
- [ ] `https://$DOMINIO` responde 200 por HTTPS (candado válido).
- [ ] `https://$DOMINIO/healthz/` → `{"status":"ok"}`.
- [ ] `/admin/` responde y el superusuario existe.
- [ ] API en `https://api.$DOMINIO/api/` responde.
- [ ] Políticas RLS aplicadas (`apply_rls_policies` sin error).
- [ ] Webhook de WhatsApp verificado en Meta y responde a un mensaje.
- [ ] `whatsapp-worker` procesa tareas (visible en logs/Flower).
- [ ] Backup manual ejecutado y visible en B2; cron programado.
- [ ] Restauración de prueba exitosa en entorno local.
- [ ] Uptime Kuma con 3 monitores en verde y alertas configuradas.
- [ ] Flower y dashboard de Traefik protegidos con BasicAuth.

---

## Script `deploy.sh`

Automatiza las fases 3–6 (Docker, clonado, secrets, primer arranque). Ver [`deploy.sh`](./deploy.sh).

```bash
sudo -u deploy DOMINIO=$DOMINIO REPO_GIT=$REPO_GIT EMAIL_ADMIN=$EMAIL_ADMIN bash deploy.sh
```
