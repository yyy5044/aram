# 화면 + Caddy 운영 이미지. 저장소 루트에서 만들어요: docker build -f deploy/web.Dockerfile .

FROM node:24 AS build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM caddy:2
COPY --from=build /src/dist /srv
COPY deploy/maintenance.html /srv/maintenance.html
COPY deploy/Caddyfile /etc/caddy/Caddyfile
# 설정에 오타가 있으면 이미지를 만들 때 실패해서 서버까지 가지 않아요.
RUN DOMAIN=localhost caddy validate --config /etc/caddy/Caddyfile
