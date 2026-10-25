#!/usr/bin/env bash
# 새 Lightsail 서버(Ubuntu 24.04)를 처음 한 번 준비해요. 다시 돌려도 이미 된 일은 건너뛰어요.
# 사용법: sudo bash server-setup.sh "<배포 전용 공개 키 한 줄>"
set -euo pipefail

DEPLOY_PUBKEY="${1:?배포 전용 공개 키가 필요해요}"
APP_DIR=/opt/aram
APP_USER=ubuntu

if [ "$(id -u)" -ne 0 ]; then
	echo "sudo로 실행해 주세요."
	exit 1
fi

# 1. Docker (공식 apt 저장소)
if ! command -v docker > /dev/null; then
	apt-get update
	apt-get install -y ca-certificates curl
	install -m 0755 -d /etc/apt/keyrings
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
	chmod a+r /etc/apt/keyrings/docker.asc
	. /etc/os-release
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
		> /etc/apt/sources.list.d/docker.list
	apt-get update
	apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
usermod -aG docker "$APP_USER"

# 2. 스왑 2GB (게임 데이터 동기화 때 메모리가 순간적으로 늘어요)
if [ ! -f /swapfile ]; then
	fallocate -l 2G /swapfile
	chmod 600 /swapfile
	mkswap /swapfile
	swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 3. 앱 폴더와 비밀 값 파일 틀
mkdir -p "$APP_DIR"
if [ ! -f "$APP_DIR/.env" ]; then
	cat > "$APP_DIR/.env" <<'ENV'
DOMAIN=
POSTGRES_PASSWORD=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
APP_ADMIN_DISCORD_IDS=
ENV
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 600 "$APP_DIR/.env"

# 4. GitHub Actions가 접속할 배포 전용 키
SSH_DIR="/home/$APP_USER/.ssh"
mkdir -p "$SSH_DIR"
touch "$SSH_DIR/authorized_keys"
grep -qxF "$DEPLOY_PUBKEY" "$SSH_DIR/authorized_keys" || echo "$DEPLOY_PUBKEY" >> "$SSH_DIR/authorized_keys"
chown -R "$APP_USER:$APP_USER" "$SSH_DIR"
chmod 700 "$SSH_DIR"
chmod 600 "$SSH_DIR/authorized_keys"

echo
echo "준비가 끝났어요."
echo "서버 지문(Claude에게 알려주세요):"
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
echo "다음: nano $APP_DIR/.env 로 비밀 값을 채워요."
