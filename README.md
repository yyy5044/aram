# ARAM

증강 칼바람 커뮤니티.

리그 오브 레전드 증강 칼바람 나락 모드의 증강 정보를 친구들과 공유하는 커뮤니티 사이트예요. 챔피언별 추천 증강, 증강 소개, 조합 추천을 글로 올리고 챔피언·증강 태그로 모아 볼 수 있어요.

설계 문서는 [docs/superpowers/specs](docs/superpowers/specs/2026-10-24-aram-community-v1-design.md)에 있어요.

## 구성

| 폴더 | 내용 |
|---|---|
| `backend/` | Spring Boot 4, Java 21, JPA(Hibernate), Flyway, PostgreSQL 18 |
| `frontend/` | React 19, TypeScript, Vite, Tailwind CSS, Tiptap 편집기 |

챔피언 목록과 현재 패치는 라이엇 Data Dragon에서, 증강 목록은 CommunityDragon에서 서버가 자동으로 받아와요. 따로 입력할 필요가 없어요.

## 처음 한 번만: 디스코드 로그인 설정

1. [디스코드 개발자 포털](https://discord.com/developers/applications)에서 **New Application**으로 앱을 만들어요.
2. 왼쪽 **OAuth2** 메뉴에서 **Redirects**에 아래 주소를 추가하고 저장해요.

   ```
   http://localhost:5173/login/oauth2/code/discord
   ```

3. 같은 화면의 **Client ID**와 **Client Secret**을 확인해요.
4. `backend/.env.example`을 복사해서 `backend/.env`를 만들고, 디스코드 줄 맨 앞의 `#`을 지운 뒤 값을 넣어요. 이 파일은 git에 올라가지 않아요.

   ```
   DISCORD_CLIENT_ID=복사한 Client ID
   DISCORD_CLIENT_SECRET=복사한 Client Secret
   APP_ADMIN_DISCORD_IDS=내 디스코드 사용자 ID
   ```

   내 디스코드 사용자 ID는 디스코드 설정의 **고급 > 개발자 모드**를 켠 뒤, 내 프로필을 우클릭하고 **사용자 ID 복사**로 얻어요. 이 ID의 사용자는 관리자로 누구의 글이든 지울 수 있어요.

> 값을 아직 모르면 디스코드 줄을 `#`으로 막아둔 채로 두세요. 빈 값(`DISCORD_CLIENT_ID=`)으로 두면 서버가 시작되지 않아요.

## 로컬에서 실행하기

1. Docker Desktop을 시작 메뉴에서 켜요.
2. 백엔드를 실행해요. PostgreSQL 컨테이너는 자동으로 같이 떠요.

   ```bash
   cd backend
   ./gradlew bootRun
   ```

3. 다른 터미널에서 프론트엔드를 실행하고 http://localhost:5173 에 접속해요.

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 디스코드 없이 확인하기 (개발 로그인)

`backend/.env`에 `APP_DEV_LOGIN_ENABLED=true`를 넣으면, 디스코드 없이 원하는 닉네임으로 로그인하는 `POST /api/dev/login`이 켜져요. 여러 사용자로 바꿔가며 확인할 때 써요.

**실제 서버에서는 절대 켜지 마세요.** 누구나 아무 사용자로 로그인할 수 있게 돼요.

## 테스트

```bash
cd backend && ./gradlew test
cd frontend && npm test
```

## 배포

운영 사이트는 AWS Lightsail 서버 한 대에서 Docker Compose(Caddy + 백엔드 + PostgreSQL)로 돌아요. 평소 작업은 `dev`에 합치고, `main`에 올리면 GitHub Actions가 테스트를 거쳐 서버에 자동으로 반영해요. 처음 설정, 실패했을 때, 복원 방법은 [docs/deploy.md](docs/deploy.md)에 있어요.

## 규칙

- DB 테이블 변경은 `backend/src/main/resources/db/migration`의 Flyway 파일로만 해요. Hibernate는 검증만 해요.
- 본문에 허용하는 서식(문단, 목록, 인용, 이미지, 굵게, 기울임)은 서버 `PostContentValidator`와 화면 `editor/extensions.ts`가 같은 규칙을 지켜요. 하나를 바꾸면 다른 쪽도 바꿔요.
