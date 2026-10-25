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
