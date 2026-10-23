# 증강 칼바람 커뮤니티

리그 오브 레전드 증강 칼바람 나락 모드의 증강 정보를 친구들과 공유하는 커뮤니티 사이트예요.

## 구성

| 폴더 | 내용 |
|---|---|
| `backend/` | Spring Boot 4, Java 21, JPA(Hibernate), Flyway, PostgreSQL 18 |
| `frontend/` | React 19, TypeScript, Vite, Tailwind CSS |

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

## 테스트

```bash
cd backend && ./gradlew test
cd frontend && npm test
```

## 규칙

- DB 테이블 변경은 `backend/src/main/resources/db/migration`의 Flyway 파일로만 해요. Hibernate는 검증만 해요.
