#!/usr/bin/env bash
set -euo pipefail

# Hardening inicial del VPS (Ubuntu 24.04).
# Ejecutar como root: sudo bash hardening.sh

SSH_PORT="${SSH_PORT:-22}"

echo "=== Actualizando sistema ==="
apt-get update -y
apt-get upgrade -y

echo "=== Instalando paquetes de seguridad ==="
apt-get install -y ufw fail2ban unattended-upgrades

echo "=== Configurando actualizaciones automáticas ==="
cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo "=== Configurando UFW (deny por defecto) ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo "=== Hardening SSH ==="
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?X11Forwarding.*/X11Forwarding no/' /etc/ssh/sshd_config
systemctl reload ssh

echo "=== Activando fail2ban ==="
systemctl enable fail2ban
systemctl restart fail2ban

echo "=== Hardening completado. Revisa UFW y fail2ban. ==="
