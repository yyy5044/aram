# 배포와 자동 검사·배포(CI/CD) 설계

- 작성일: 2026-10-25
- 상태: 사용자가 대화에서 방향(서버 하나에 담기, 도메인 구입, 테스트 통과 시 자동 반영, dev/main 가지 흐름)을 승인함. 이 문서는 검토 대기.

## 1. 목적

친구 약 10명이 인터넷에서 `https://내도메인`으로 접속해 디스코드로 로그인하고 글·사진을 올릴 수 있게 한다. 코드를 고쳐서 `main`에 올리면 테스트를 거쳐 사이트에 자동으로 반영되게 한다.

**성공 기준**
1. 친구가 휴대폰·PC에서 `https://내도메인`으로 접속해 디스코드 로그인, 글쓰기, 사진 올리기를 할 수 있다. 주소창에 자물쇠가 보인다.
2. 서버를 재부팅하거나 새 버전으로 바꿔도 로그인이 풀리지 않고(30일 유지), 글·사진이 남아 있다.
3. `dev`나 `main`을 GitHub에 올리면 테스트가 자동으로 돈다. `main`이고 모두 통과하면 사이트에 자동 반영된다. 반영 후 사이트가 정상으로 뜨지 않으면 직전 버전으로 자동으로 돌아간다.
4. 서버 전체가 매일 자동으로 백업되어 7일치가 남는다.
5. AWS 요금이 월 15달러를 넘을 것 같으면 메일이 온다.
6. 한 달 비용이 약 2만원 이내다.

## 2. 범위

**포함**: 가지 흐름(`dev`/`main`), 로그인 정보를 DB에 저장, 운영 설정(`prod`), Docker 이미지 2개, 운영용 Compose·Caddy 설정, 업데이트 중 안내, GitHub Actions(테스트·이미지 만들기·배포·되돌리기), 서버 준비 스크립트, 운영 안내 문서(`docs/deploy.md`), 사용자가 직접 할 일 안내, README·CLAUDE.md 갱신.

**제외**
- S3 이미지 저장소와 DB 따로 백업 — 사진은 서버 디스크에 두고 서버 전체 스냅샷으로 백업한다. `ImageStorage` 인터페이스는 그대로 두어 나중에 S3 구현을 더할 수 있다.
- `www.` 주소, 여러 대 서버, 무중단 배포, 모니터링·로그 수집 서비스.
- 화면 문구 번역(i18n), 새 기능.

## 3. 가지(브랜치) 흐름

```
기능 가지 ──합치기──▶ dev ──(충분히 쌓이면) 합치기──▶ main ──▶ 자동 배포
```

- 평소 작업은 기능 가지에서 하고, 끝나면 **`dev`에 합친다**. `main`에 바로 합치지 않는다.
- `dev`를 GitHub에 올리면 테스트만 돈다. 사이트는 바뀌지 않는다.
- 사용자가 "업데이트하자"고 하면 `dev`를 `main`에 합치고 올린다. 이때 사이트에 반영된다.
- 푸시는 지금처럼 사용자가 요청할 때만 한다. "dev에 올려줘"는 테스트만, "업데이트해줘"는 `main` 배포다.
- `dev`는 2026-10-25에 그때의 `main`에서 만들었다. 이 문서도 `dev`에 커밋한다.

## 4. 서버 구성

### 4.1 Lightsail

- 지역: 서울(`ap-northeast-2`). 운영체제: Ubuntu 24.04 LTS.
- 크기: 메모리 2GB, 2 vCPU, SSD 60GB, 전송량 월 3TB, **월 12달러**(고정 IP 포함, 2026-10-25 AWS 가격표 기준).
- 고정 IP(Static IP)를 붙이고 도메인의 A 레코드를 이 IP로 둔다.
- 방화벽: 22(SSH), 80, 443만 연다. 22는 GitHub Actions가 접속해야 해서 모든 곳에 열되, 비밀번호 로그인은 꺼져 있고 키로만 들어간다(Lightsail Ubuntu 기본값).
- 스왑 2GB를 만든다. 게임 데이터 동기화 때 큰 JSON을 읽느라 메모리가 순간적으로 늘어서다.

### 4.2 Docker Compose (서버의 `/opt/aram`)

| 서비스 | 이미지 | 하는 일 |
|---|---|---|
| `web` | `ghcr.io/yyy5044/aram-web:<커밋>` | Caddy. https 인증서 자동 발급·갱신, 화면 파일 내려주기, `/api`·`/oauth2`·`/login/oauth2`를 백엔드로 넘기기, 업데이트 중 안내 |
| `backend` | `ghcr.io/yyy5044/aram-backend:<커밋>` | Spring Boot (`prod` 설정) |
| `db` | `postgres:18` | PostgreSQL |

- 모두 `restart: unless-stopped`로 재부팅 후 자동으로 켜진다. Docker 자체도 부팅 시 켜진다.
- 저장 공간(이름 있는 볼륨): `pgdata`(DB), `images`(사진, 백엔드의 `/data/images`), `caddy-data`(인증서). 모두 서버 디스크에 있어서 스냅샷에 함께 들어간다.
- `db`는 바깥으로 포트를 열지 않는다. `backend`는 서버 자신(`127.0.0.1:8080`)에만 열어 배포 스크립트가 상태를 확인할 수 있게 한다. 바깥에서는 Caddy를 거쳐 `/api`, `/oauth2`, `/login/oauth2`만 닿는다(`/actuator`는 바깥에서 안 보인다).
- 메모리 상한: `backend` 1200MB(JVM은 그 70%를 힙으로), `db` 512MB. 컨테이너 로그는 10MB × 3개까지만 남겨 디스크가 차지 않게 한다.
- 이미지 태그는 커밋 SHA다. 서버의 `.env`에 지금 태그(`IMAGE_TAG`)를 적어 두고 Compose가 읽는다.

### 4.3 Caddy 설정 (`deploy/Caddyfile`, `web` 이미지에 들어감)

- 사이트 주소는 `{$DOMAIN}`. 도메인으로 들어온 요청만 받는다. IP로 들어오면 응답하지 않는다. http는 https로 넘긴다(Caddy 기본).
- `/api/*`, `/oauth2/*`, `/login/oauth2/*` → `backend:8080`. Caddy는 원래 Host를 그대로 넘기고 `X-Forwarded-Proto`·`X-Forwarded-For`를 붙인다.
- 그 밖의 주소 → 화면 파일. 없는 파일이면 `index.html`(React Router가 처리).
- 캐시: `/assets/*`(파일 이름에 해시가 붙음)는 1년 `immutable`, `index.html`은 `no-cache`.
- 압축: gzip·zstd.
- **업데이트 중 안내**: 백엔드가 응답하지 않으면(502·503·504)
  - `/api/*`는 503과 JSON `{"code":"MAINTENANCE","message":"잠시 업데이트 중이에요. 조금 뒤에 다시 시도해 주세요."}`를 준다(서버 오류 응답처럼 `fieldErrors`는 없으면 생략). 화면의 API 클라이언트가 이 문장을 그대로 띄운다(지금 코드 그대로).
  - 그 밖의 주소는 503과 `maintenance.html`을 준다. "잠시 업데이트 중이에요. 조금 뒤에 새로고침해 주세요." 디자인 색(밤하늘 남색 바탕, 금색 글자)을 인라인 CSS로 쓴 한 장짜리 페이지다.

## 5. 코드 변경

### 5.1 로그인 정보를 DB에 저장 (Spring Session JDBC)

- 의존성 `org.springframework.boot:spring-boot-starter-session-jdbc` (4.1.2에 있음 확인).
- 표는 Flyway `V10__spring_session.sql`로 만든다(Spring Session의 PostgreSQL 스키마 그대로). `spring.session.jdbc.initialize-schema: never`.
- 개발·테스트·운영 모두 같은 방식을 쓴다. 쿠키 이름이 `JSESSIONID`에서 `SESSION`으로 바뀌어 개발 중인 로그인은 한 번 풀린다(운영 사용자는 아직 없음).
- 유효 기간 30일과 쿠키 `Max-Age` 30일은 지금 `server.servlet.session.*` 설정을 그대로 따른다. 만료된 로그인 정보는 Spring Session이 1분마다 지운다.
- 세션에 들어가는 `AppUserPrincipal`은 이미 `Serializable`이다.

### 5.2 운영 설정 (`application-prod.yml`)

- DB: `jdbc:postgresql://db:5432/aram`, 사용자 `aram`, 비밀번호 `${POSTGRES_PASSWORD}`.
- `server.forward-headers-strategy: native` — Tomcat이 Caddy가 붙인 `X-Forwarded-Proto`를 믿어서 디스코드 로그인 후 돌아올 주소가 `https://내도메인/login/oauth2/code/discord`로 만들어진다. Tomcat은 사설 IP(Docker 내부망)에서 온 머리글만 믿는다.
- `server.servlet.session.cookie.secure: true`. `XSRF-TOKEN` 쿠키는 요청이 https면 자동으로 `Secure`가 붙는다.
- `app.images.dir: /data/images`.
- **개발 로그인은 운영에서 절대 켜지지 않게** `DevLoginController`에 `@Profile("!prod")`를 더한다. 환경 변수가 설정 파일보다 우선해서, 설정 파일에 `false`를 적는 것만으로는 막을 수 없기 때문이다.
- 시간대는 바꾸지 않는다. 한국 시간이 필요한 곳(활동 잔디, 가입일)은 이미 코드에서 한국 시간으로 계산한다.

### 5.3 Docker 이미지

- `backend/Dockerfile`: 1단계 `eclipse-temurin:21-jdk`에서 `./gradlew bootJar`, 2단계 `eclipse-temurin:21-jre`에 jar만 담는다. `SPRING_PROFILES_ACTIVE=prod`, `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=70`. 루트가 아닌 사용자로 실행한다. `developmentOnly`인 docker-compose 모듈은 jar에 들어가지 않는다.
- `deploy/web.Dockerfile`(빌드 위치는 저장소 루트): 1단계 `node:24`에서 `npm ci && npm run build`, 2단계 `caddy:2`에 `dist`, `Caddyfile`, `maintenance.html`을 담는다.
- `.dockerignore`로 `node_modules`, `build`, `data`, `.env`를 뺀다. 비밀 값은 이미지에 절대 들어가지 않는다.

### 5.4 배포 파일 (`deploy/`)

| 파일 | 내용 |
|---|---|
| `compose.prod.yaml` | 4.2의 운영 Compose |
| `Caddyfile`, `maintenance.html`, `web.Dockerfile` | 4.3, 5.3 |
| `deploy.sh` | 서버에서 실행하는 배포·되돌리기 스크립트 (6.3) |
| `server-setup.sh` | 서버를 처음 한 번 준비하는 스크립트 (8장) |
| `.env.prod.example` | 서버 `.env`에 들어갈 이름 목록(값은 비움) |

기존 개발 방식(`./gradlew bootRun` + 루트 `backend/compose.yaml`의 개발 DB, `npm run dev`)은 바꾸지 않는다.

## 6. 자동 검사·배포 (GitHub Actions, `.github/workflows/ci.yml`)

### 6.1 언제 도는가

- `dev`·`main`에 푸시할 때, 그리고 PR이 열리거나 갱신될 때 테스트가 돈다.
- 배포는 **`main`에 푸시**했고 테스트가 모두 통과했을 때만 돈다.
- 배포는 한 번에 하나만(`concurrency: deploy`, 진행 중인 것은 취소하지 않고 기다림).

### 6.2 작업

1. `backend-test`: Java 21(Temurin), Gradle 캐시, `./gradlew test`. GitHub 실행 환경에 Docker가 있어서 Testcontainers가 그대로 돈다.
2. `frontend-test`: Node 24, npm 캐시, `npm ci`, `npm test`, `npm run build`, `npm run lint`.
3. `deploy` (1·2가 통과하고 `main` 푸시일 때)
   - 권한: `contents: read`, `packages: write`.
   - 이미지 2개를 만들어 GitHub 이미지 저장소(ghcr.io)에 `커밋 SHA` 태그로 올린다. 이미지는 비공개로 둔다.
   - 서버에 SSH로 접속해 `compose.prod.yaml`과 `deploy.sh`를 복사하고 `deploy.sh <SHA>`를 실행한다. 이미지를 받을 때 쓸 일회용 토큰(`GITHUB_TOKEN`)은 표준 입력으로 넘긴다(작업이 끝나면 만료).
   - 공식 액션(`actions/*`, `docker/*`)만 쓴다.

### 6.3 `deploy.sh` (서버)

1. 지금 태그를 `PREVIOUS`로 기억한다(`.env`의 `IMAGE_TAG`).
2. 받은 토큰으로 ghcr.io에 로그인해 새 이미지를 받고, 로그아웃한다.
3. `IMAGE_TAG`를 새 태그로 바꾸고 `docker compose up -d`.
4. `http://127.0.0.1:8080/actuator/health`가 `UP`이 될 때까지 최대 3분 기다린다(DB 변경 실행 시간 포함).
5. 실패하면 `IMAGE_TAG`를 `PREVIOUS`로 되돌리고 다시 `up -d`, 실패로 끝낸다. GitHub이 실패 메일을 보낸다.
6. 성공하면 7일 넘게 안 쓴 이미지를 지운다(직전 버전은 남는다).

- DB 구조 변경(Flyway)은 되돌리지 않는다. 지금까지의 변경은 모두 추가라 옛 버전도 새 구조에서 돈다. 앞으로 지우거나 이름을 바꾸는 변경을 할 때는 두 번에 나눠 배포한다.
- 백엔드가 다시 켜지는 30초~1분 동안은 4.3의 업데이트 중 안내가 보인다.

## 7. 비밀 값과 설정

**서버 `/opt/aram/.env`** (git 제외, 사용자가 서버에서 직접 붙여넣음)
- `DOMAIN` — 예: `aram-gg.com`
- `POSTGRES_PASSWORD` — Claude가 긴 무작위 값을 만들어 안내한다.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` — 지금 쓰는 디스코드 앱 값 그대로.
- `APP_ADMIN_DISCORD_IDS`
- `IMAGE_TAG` — `deploy.sh`가 관리한다.
- `APP_DEV_LOGIN_ENABLED`는 두지 않는다(두더라도 5.2 때문에 꺼진다).

**GitHub 저장소 비밀 값(Secrets)**
- `DEPLOY_HOST`(고정 IP), `DEPLOY_USER`(`ubuntu`), `DEPLOY_SSH_KEY`(배포 전용 개인 키), `DEPLOY_KNOWN_HOSTS`(`ssh-keyscan`으로 받은 서버 키 줄. 서버가 출력한 지문과 같은지 확인한 것).
- 배포 전용 키는 Claude가 사용자 컴퓨터에서 새로 만든다. 공개 키는 `server-setup.sh`가 서버에 등록하고, 개인 키는 사용자 승인을 받아 `gh secret set`으로 GitHub에 넣는다. 개인 키 파일은 등록 뒤 지운다.

## 8. 백업·복원·요금 알림

- **자동 스냅샷**: Lightsail 서버의 자동 스냅샷을 켜서 매일 오전 5시(한국 시간)에 찍는다. 최근 7개가 남는다. 비용은 쓴 용량 GB당 월 0.05달러라 월 1달러 미만으로 예상한다.
- **복원**(`docs/deploy.md`에 화면 순서로 적는다): 스냅샷에서 새 서버 만들기 → 고정 IP를 새 서버로 옮기기 → 사이트 확인 → 옛 서버 지우기. 그 스냅샷 이후의 글·사진은 사라진다. 서버 지문이 바뀌므로 GitHub의 `DEPLOY_KNOWN_HOSTS`도 갱신한다.
- **요금 알림**: AWS Budgets에 월 15달러 비용 예산을 만들고, 실제 금액이 100%를 넘을 때와 예상 금액이 100%를 넘을 때 메일을 받는다(예산 2개까지 무료).

## 9. 사용자가 직접 할 일 (순서)

`docs/deploy.md`에 화면 기준으로 자세히 적고, 진행할 때 한 단계씩 안내한다.

1. 도메인 구입.
2. Lightsail 서버 만들기(서울, Ubuntu 24.04, 12달러 요금제), 고정 IP 붙이기, 방화벽에 443 열기, 자동 스냅샷 켜기.
3. 도메인 회사 화면에서 A 레코드를 고정 IP로 설정.
4. Lightsail 브라우저 SSH 창에 Claude가 준비한 `server-setup.sh` 명령 붙여넣기(Docker 설치, 스왑, 폴더, 배포 키 등록).
5. 서버 `.env`에 비밀 값 붙여넣기.
6. 디스코드 개발자 포털 Redirects에 `https://내도메인/login/oauth2/code/discord` 추가.
7. AWS Budgets 요금 알림 만들기.
8. GitHub 비밀 값 등록 승인(Claude가 `gh`로 넣는다).
9. "업데이트해줘" → 첫 배포.

## 10. 검증

**자동 테스트 (먼저 쓴다)**
- 로그인 정보 저장: 개발 로그인 후 `spring_session` 표에 행이 생기고, 같은 쿠키로 `/api/me`가 로그인 상태를 준다. `Set-Cookie`의 `SESSION`에 30일 `Max-Age`가 있다.
- 운영 설정: `prod` 설정에서 `app.dev-login.enabled=true`를 줘도 `DevLoginController`가 없다. 실제 포트로 띄워 `X-Forwarded-Proto: https`를 붙여 `/oauth2/authorization/discord`를 부르면 디스코드로 보내는 주소의 `redirect_uri`가 `https://`로 시작한다. `prod`에서 세션 쿠키에 `Secure`가 붙는다.
- 지금 있는 백엔드·화면 테스트가 모두 통과한다.

**로컬 리허설** (Docker 필요)
- 두 이미지를 로컬에서 만들고 `compose.prod.yaml`을 `DOMAIN=localhost`로 띄운다(Caddy가 로컬 인증서를 쓴다). 화면이 뜨고, 새로고침한 하위 주소(`/augments`)가 열리고, API가 응답하고, `/actuator/health`가 바깥(Caddy)에서 안 보이는지 확인한다.
- 백엔드를 멈추면 화면에 업데이트 중 안내, API에 `MAINTENANCE` JSON이 오는지 확인한다.
- `deploy.sh`를 일부러 뜨지 않는 이미지(바로 끝나는 백엔드)로 돌려 직전 버전으로 돌아오는지, 직전 버전이 없을 때는 실패만 알리는지 확인한다.

**GitHub**
- 사용자 승인 후 `dev`를 올려 테스트만 돌고 배포는 건너뛰는지 확인한다.

**실제 서버** (첫 배포 후)
- `https://내도메인` 자물쇠, 디스코드 로그인, 글쓰기, 사진 올리기, 증강·챔피언 탭.
- 서버 재부팅 후 로그인 유지와 사진 유지.
- `http://` 접속이 `https://`로 넘어가는지, IP로 접속하면 사이트가 안 뜨는지.
- 첫 자동 스냅샷이 생겼는지.

## 11. 비용 (한 달, 1달러 ≈ 1,400원)

| 항목 | 금액 |
|---|---|
| Lightsail 2GB (고정 IP 포함) | 12달러 ≈ 16,800원 |
| 자동 스냅샷 | 1달러 미만 ≈ 1,000원 이하 |
| 도메인 (.com 연 1.5~2만원) | 약 1,300~1,700원 |
| GitHub Actions, ghcr.io | 공개 저장소라 무료 |
| **합계** | **약 19,000~19,500원** |

## 12. 위험과 주의

- 서버 한 대라 서버가 멈추면 사이트도 멈춘다. 친구 10명 규모라 받아들인다.
- 복원하면 마지막 스냅샷 이후의 글·사진이 사라진다(최대 하루치).
- 저장소가 공개라 배포 설정 파일도 공개다. 비밀 값은 서버 `.env`와 GitHub Secrets에만 있고, 파일에는 이름만 있다.
- 첫 배포 직후 게임 데이터 동기화는 서버가 켜지자마자 시작하지만 끝나기까지 1~2분 걸린다. 그동안 증강·챔피언 목록이 비어 "아직 … 받아오지 못했어요"가 보일 수 있다. 동기화 중 메모리가 순간적으로 늘어서 4.1의 스왑을 둔다.
- Vite 개발 서버의 프록시 설정은 개발에서만 쓰이고 운영에는 영향이 없다.
