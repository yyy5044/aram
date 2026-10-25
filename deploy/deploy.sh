#!/usr/bin/env bash
# 서버에서 새 버전으로 바꾸고, 사이트가 정상으로 뜨지 않으면 직전 버전으로 되돌려요.
# 사용법: echo "<ghcr 토큰>" | bash deploy.sh <이미지 태그> <ghcr 사용자>
# 토큰이 비어 있으면 이미지를 받지 않고 이 컴퓨터에 있는 이미지를 써요(로컬 리허설용).
# 이 스크립트가 있는 폴더의 compose.yaml 과 .env 를 써요.
set -euo pipefail

TAG="${1:?이미지 태그가 필요해요}"
GHCR_USER="${2:-}"
HEALTH_URL="http://127.0.0.1:8080/actuator/health"
HEALTH_TIMEOUT=180

cd "$(dirname "$0")"
touch .env

PREVIOUS="$(sed -n 's/^IMAGE_TAG=//p' .env | tail -n 1)"
DOMAIN="$(sed -n 's/^DOMAIN=//p' .env | tail -n 1)"

set_tag() {
	if grep -q '^IMAGE_TAG=' .env; then
		sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$1/" .env
	else
		printf '\nIMAGE_TAG=%s\n' "$1" >> .env
	fi
}

# 백엔드가 UP이고, Caddy가 http 요청을 https로 넘기면(308) 정상이에요. 인증서 없이 확인할 수 있어요.
backend_up() {
	curl -fsS -m 5 "$HEALTH_URL" 2>/dev/null | grep -q '"status":"UP"'
}

web_up() {
	[ "$(curl -s -o /dev/null -m 5 -w '%{http_code}' -H "Host: $DOMAIN" http://127.0.0.1/ 2>/dev/null)" = "308" ]
}

healthy() {
	local deadline=$((SECONDS + HEALTH_TIMEOUT))
	while [ "$SECONDS" -lt "$deadline" ]; do
		if backend_up && web_up; then
			return 0
		fi
		sleep 3
	done
	return 1
}

TOKEN="$(cat || true)"
if [ -n "$TOKEN" ]; then
	printf '%s' "$TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
	IMAGE_TAG="$TAG" docker compose pull backend web
	docker logout ghcr.io
fi

set_tag "$TAG"
# 교체 자체가 실패해도 아래의 되돌리기로 가요.
if docker compose up -d && healthy; then
	docker image prune -af --filter "until=168h" > /dev/null
	echo "배포 완료: $TAG"
	exit 0
fi

echo "새 버전($TAG)이 ${HEALTH_TIMEOUT}초 안에 정상으로 뜨지 않았어요."
docker compose logs --tail 100 backend web || true
if [ -n "$PREVIOUS" ]; then
	set_tag "$PREVIOUS"
	docker compose up -d || true
	echo "직전 버전($PREVIOUS)으로 되돌렸어요."
else
	# 실패한 버전을 다음 배포가 "직전 버전"으로 착각하지 않게 지워요.
	sed -i '/^IMAGE_TAG=/d' .env
	echo "되돌릴 버전이 없어요."
fi
exit 1
