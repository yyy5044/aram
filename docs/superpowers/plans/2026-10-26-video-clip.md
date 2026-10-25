# 영상 클립 블록 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 글쓰기에서 `/` 메뉴나 영상 버튼으로 영상 칸을 넣고, 끌어다 놓거나 고른 영상을 서버가 720p·24fps·무음·30초 MP4로 줄여 본문에 자동 반복 클립으로 넣는다.

**Architecture:** 백엔드 `video` 패키지가 업로드(원본은 임시 파일) → 단일 스레드 줄 → ffmpeg 변환(진행률 DB 기록) → `ImageStorage`에 `videos/{id}.mp4`·`.jpg` 저장을 맡는다. 본문에는 `video` 노드(`src=/api/videos/{uuid}`)가 들어가고, 글 저장 때 `VideoPostLinker`가 사진과 같은 규칙으로 연결한다. 화면은 Tiptap `video`/`uploadBox` 노드와 React NodeView, `@tiptap/suggestion` `/` 메뉴로 만든다.

**Tech Stack:** Spring Boot 4.1 / JPA / Flyway / ffmpeg·ffprobe(프로세스 실행), React 19 / Tiptap 3.32(`@tiptap/suggestion`, `@tiptap/extensions` Placeholder) / Vitest.

**Spec:** `docs/superpowers/specs/2026-10-26-video-clip-design.md`

## Global Constraints

- 가지: `video`(이미 있음, `dev`에서 갈라짐). 끝나면 `dev`에 합친다. 푸시는 사용자가 요청할 때만.
- 변환 규격(고정): 앞 30초(`-t 30`), `scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24`, `-an`, `-c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -profile:v high -movflags +faststart`, `-threads 2`. 첫 장면 `-frames:v 1 -q:v 4`. 제한 시간 3분.
- 한도: 원본 200MB(`app.videos.max-bytes`, 기본 209715200), 한 글에 영상 3개, multipart 전체 210MB.
- 상태 값: `QUEUED`, `PROCESSING`, `READY`, `FAILED`. 진행률 0~100(변환 중 최대 99, 끝나면 100). DB 진행률 쓰기는 1초에 한 번 이하.
- 문구(해요체, 그대로):
  - `VIDEO_TOO_LARGE` 413 "영상 파일은 200MB까지 올릴 수 있어요"
  - `VIDEO_UNSUPPORTED` 400 "영상 파일만 넣을 수 있어요"
  - `VIDEO_NOT_FOUND` 404 "영상을 찾을 수 없어요"
  - 변환 실패 "변환하지 못했어요. 다른 파일을 올려 주세요"
  - 재시작 실패 "서버가 다시 켜져서 변환이 멈췄어요. 다시 올려 주세요"
  - ffmpeg 없음 "변환 프로그램이 없어요"
  - 본문 검사 "영상은 한 글에 3개까지 넣을 수 있어요", "올린 적 없는 영상이 들어 있어요", "영상 변환이 끝나지 않았어요"
  - 화면: "파일을 업로드해주세요", "끌어다 놓거나 눌러서 고르기 · 30초 · 200MB까지", "사진을 업로드해주세요", "끌어다 놓거나 눌러서 고르기", "올리는 중 n%", "변환 중 n%", "변환 차례를 기다리고 있어요", "앞 30초만 넣었어요", "다른 파일 올리기", "영상 변환이 끝나면 등록할 수 있어요", "변환하지 못한 영상을 빼거나 다시 올려 주세요", "/를 입력하면 영상·사진을 넣을 수 있어요", 버튼 aria "영상 빼기"·"영상 멈추기"·"영상 재생"
- 본문 서식 규칙은 서버 `PostContentValidator`, 화면 `editor/extensions.ts`, `editor/extensions.test.ts` 셋을 함께 바꾼다.
- 디자인 규칙: `@theme` 이름만, 버튼은 `buttonClass`, 간격 4의 배수, 칸은 모서리 0.
- 로컬 테스트에는 ffmpeg·ffprobe가 PATH에 있어야 한다. 없으면 사용자에게 설치(`winget install Gyan.FFmpeg`) 허락을 받는다. CI는 apt로 설치한다. ffmpeg가 필요한 테스트를 건너뛰게 만들지 않는다.

## Review Focus

- 휴대폰에서 찍은 세로 영상(예: 1080×1920)·회전 정보가 있는 MOV → 세로 비율 그대로 720 이하로 줄어야 한다(가로로 눕거나 늘어나지 않음) → Task 1에 세로 샘플 테스트.
- 소리가 없는 원본, 길이 정보가 없는 원본(일부 WebM) → 변환은 되고 진행률은 0에 멈춰 있다가 100이 되어야 한다(0으로 나누기 없음) → Task 1 테스트.
- 변환 중 칸을 지우거나 페이지를 떠남 → 화면의 1초 상태 조회가 멈춰야 하고, 서버는 끝까지 변환한 뒤 하루 뒤 정리 → Task 5 테스트(칸 삭제 후 조회 멈춤).
- 같은 영상 칸을 복사·붙여넣기해 같은 영상이 두 번 들어간 본문 → 저장은 되고 개수는 서로 다른 영상 기준이 아니라 노드 기준 3개 제한 → Task 3 검사 테스트.
- 200MB 바로 위 파일이 multipart 한도(210MB)보다 작아 서비스까지 오는 경우와, 210MB를 넘어 Spring이 먼저 막는 경우 모두 `VIDEO_TOO_LARGE` → Task 2 테스트(서비스 한도는 설정으로 작게, Spring 한도 처리는 `/api/videos` 경로 판별 단위 테스트).

---

### Task 1: 변환기 (ffmpeg)

**Files:**
- Create: `backend/src/main/java/com/aram/community/video/VideoTranscoder.java`, `FfmpegVideoTranscoder.java`, `TranscodeException.java`, `VideoTypes.java`, `VideoProperties.java`
- Test: `backend/src/test/java/com/aram/community/video/FfmpegVideoTranscoderTest.java`, `VideoTypesTest.java`, `support/SampleVideos.java`(테스트 도우미)

**Interfaces:**
- Produces:
  - `interface VideoTranscoder { Result transcode(Path input, Path output, Path poster, IntConsumer progress) throws TranscodeException; record Result(int width, int height, int durationMs, boolean truncated) {} }`
  - `class TranscodeException extends Exception { TranscodeException(String userMessage) }` — 메시지는 Global Constraints의 문구.
  - `final class VideoTypes { static final int HEADER_BYTES = 16; static boolean looksLikeVideo(byte[] header) }` — `ftyp`(4~7바이트) 또는 EBML `1A 45 DF A3`(0~3바이트).
  - `@ConfigurationProperties("app.videos") record VideoProperties(String ffmpegPath, String ffprobePath, Path tmpDir, long maxBytes)` 기본값 `ffmpeg`, `ffprobe`, `data/video-tmp`, `209715200`. `application.yml`에 `app.videos` 블록 추가.
  - `SampleVideos.make(Path dir, int width, int height, int fps, int seconds, boolean audio) -> Path` (테스트 전용, `ffmpeg -f lavfi -i testsrc2=...` + 선택적 `sine`).

- [ ] **Step 1: 실패하는 테스트**
  - `transcodesLongLandscapeTo720p24NoAudioFirst30Seconds`: 1920×1080, 60fps, 소리 있음, 35초 샘플 → `Result(1280, 720, ~30000±200, truncated=true)`, `ffprobe`로 결과 파일에 오디오 흐름 없음·`r_frame_rate=24/1`, poster 파일 존재(JPEG `FF D8`).
  - `keepsPortraitAspect`: 1080×1920, 3초 → width 404~406, height 720, `truncated=false`.
  - `keepsSmallSourceSize`: 320×240, 2초 → 320×240.
  - `reportsIncreasingProgressEndingAt99OrLess`: 받은 값들이 단조 증가, 모두 0~99.
  - `rejectsNonVideo`: 텍스트 파일 → `TranscodeException("영상 파일만 넣을 수 있어요")`.
  - `missingFfmpegFails`: `ffmpegPath="no-such-ffmpeg"` → `TranscodeException("변환 프로그램이 없어요")`.
  - `VideoTypesTest`: mp4 머리(`00 00 00 18 66 74 79 70`) true, webm(`1A 45 DF A3`) true, png 머리 false, 4바이트 미만 false.
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests '*video*'` → 컴파일 실패/FAIL.
- [ ] **Step 3: 구현**
  - `ffprobe -v error -show_entries format=duration:stream=codec_type -of json input`로 길이·영상 흐름 확인(영상 흐름 없으면 "영상 파일만 넣을 수 있어요", 길이 없으면 0으로 두고 진행률은 끝에서만 100).
  - ffmpeg는 Global Constraints 옵션 + `-progress pipe:1 -nostats -y`. 표준 출력의 `out_time_us=`를 읽어 `min(99, out_time / min(길이,30초) * 100)`을 `progress`로 넘긴다(길이 0이면 넘기지 않음). 표준 오류는 별도 스레드로 버리며 마지막 20줄만 로그용으로 남긴다.
  - 결과 크기는 출력 파일 `ffprobe`로 읽는다. 제한 시간 3분(`Process.waitFor(3, MINUTES)`, 넘으면 `destroyForcibly`).
  - 프로세스 시작 실패(`IOException`) → "변환 프로그램이 없어요". 그 밖의 실패 → "변환하지 못했어요. 다른 파일을 올려 주세요".
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS.
- [ ] **Step 5: 커밋** — `"Add an ffmpeg transcoder for 720p 24fps silent 30-second clips"`.

### Task 2: 영상 업로드·변환 줄·상태·내려주기 API

**Files:**
- Create: `db/migration/V11__videos.sql`, `video/Video.java`, `VideoStatus.java`, `VideoRepository.java`, `VideoService.java`, `VideoQueue.java`, `VideoController.java`, `VideoStatusResponse.java`
- Modify: `common/ErrorCode.java`(3개 추가), `common/GlobalExceptionHandler.java`(`MaxUploadSizeExceededException` → 요청 경로가 `/api/videos`로 시작하면 `VIDEO_TOO_LARGE`), `image/ImageStorage.java`(`Optional<Path> path(String key)`), `image/LocalImageStorage.java`, `application.yml`(multipart `max-file-size: 210MB`, `max-request-size: 211MB`)
- Test: `video/VideoApiTest.java`(IntegrationTest), `common/GlobalExceptionHandlerTest` 해당 경우

**Interfaces:**
- Consumes: Task 1 `VideoTranscoder`, `VideoTypes`, `VideoProperties`.
- Produces:
  - `V11`: 설계 4.1 표 그대로(테이블 `videos`, 인덱스 `videos_post_idx`, `videos_unlinked_idx`(`created_at` where `post_id is null`), `videos_status_idx`).
  - `Video` 엔티티: 설계 칼럼, `static Video queued(UUID id, long uploaderId, Instant now)`, `markProcessing()`, `updateProgress(int)`, `markReady(String storageKey, String posterKey, VideoTranscoder.Result r, long size)`, `markFailed(String message)`.
  - `VideoRepository`: `findByPostId`, `findUnlinkedBefore(Instant)`, `findByStatusIn(Collection<VideoStatus>)`, `linkAll`, `unlinkOthers`, `unlinkAll`(이미지 저장소와 같은 쿼리).
  - `VideoStatusResponse(String id, String status, int progress, boolean truncated, String url, String posterUrl, Integer width, Integer height, String errorMessage)` — `url`/`posterUrl`은 READY일 때만 `/api/videos/{id}`, `/api/videos/{id}/poster`.
  - `VideoService`: `VideoStatusResponse upload(User, MultipartFile)`, `VideoStatusResponse status(UUID, long viewerId)`, `void process(UUID)`(줄이 부름), `Path servedFile(UUID)`, `Path posterFile(UUID)`, `void deleteAll(List<Video>)`, `@EventListener(ApplicationReadyEvent) void failInterrupted()`.
  - `VideoQueue`: 단일 스레드 실행기, `void submit(UUID id)`. 업로드 트랜잭션이 커밋된 뒤에 넣는다(`TransactionSynchronization.afterCommit`).
  - 원본 임시 파일 이름 `{tmpDir}/{id}.src`. `process`가 끝나면(성공·실패) 지운다. 출력은 `{tmpDir}/{id}.mp4`·`.jpg`에 만든 뒤 `ImageStorage.save("videos/{id}.mp4", …)`로 옮긴다.

- [ ] **Step 1: 실패하는 테스트** (`VideoApiTest`, 테스트 설정에서 `app.videos.max-bytes=1048576`, `tmp-dir=build/test-video-tmp`)
  - `uploadConvertsAndServes`: 2초 320×240 샘플 업로드 → 201 `{status:"QUEUED"|"PROCESSING", progress}` → 상태를 100ms 간격 최대 30초 조회해 `READY`, `progress=100`, `url="/api/videos/{id}"` → `GET url` 200 `video/mp4`, `Range: bytes=0-99` → 206·100바이트·`Content-Range` → `GET posterUrl` 200 `image/jpeg` → 임시 폴더에 `{id}.src` 없음.
  - `rejectsNonVideo`: png 업로드 → 400 `VIDEO_UNSUPPORTED`.
  - `rejectsOverLimit`: 1MB+1 파일 → 413 `VIDEO_TOO_LARGE`.
  - `statusIsPrivate`: 다른 사용자가 상태 조회 → 404 `VIDEO_NOT_FOUND`.
  - `notReadyIsNotServed`: `QUEUED` 행 직접 저장 → `GET /api/videos/{id}` 404.
  - `restartFailsInterruptedJobs`: `PROCESSING` 행 저장 후 `failInterrupted()` → `FAILED`, 메시지 "서버가 다시 켜져서 변환이 멈췄어요. 다시 올려 주세요".
  - `nicknameRequired`: 닉네임 없는 사용자 업로드 → 403 `NICKNAME_REQUIRED`.
  - `GlobalExceptionHandler`: `/api/videos` 요청의 `MaxUploadSizeExceededException` → `VIDEO_TOO_LARGE`, `/api/images` → 기존 `IMAGE_TOO_LARGE`.
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests '*VideoApiTest' --tests '*GlobalExceptionHandler*'`.
- [ ] **Step 3: 구현** — 위 Interfaces 그대로. `GET /api/videos/{id}`는 `ResponseEntity<Resource>`(`FileSystemResource`)로 돌려 Spring의 Range 처리를 쓴다. 캐시 머리글은 이미지와 같음. 진행률 콜백은 마지막 DB 기록 후 1초가 지났을 때만 저장(별도 짧은 트랜잭션).
- [ ] **Step 4: 통과 확인** — 같은 명령, 이어서 `./gradlew test` 전체 PASS.
- [ ] **Step 5: 커밋** — `"Add video upload, a one-at-a-time transcode queue, status polling, and ranged playback"`.

### Task 3: 본문 `video` 노드 검사·글 연결·정리

**Files:**
- Modify: `post/PostContentValidator.java`, `post/ValidatedContent.java`(`List<UUID> videoIds` 추가), `post/PostService.java`(생성·수정·삭제에서 영상 연결)
- Create: `post/VideoPostLinker.java`(인터페이스), `video/DbVideoPostLinker.java`, `video/VideoCleanupJob.java`
- Test: `post/PostContentValidatorTest.java`(추가), `video/PostVideoTest.java`(IntegrationTest), `video/VideoCleanupJobTest.java`

**Interfaces:**
- Consumes: Task 2 `VideoRepository`, `VideoService.deleteAll`, `Video`.
- Produces:
  - 검사: `video` 노드는 `attrs.src`가 `^/api/videos/(uuid)$`만, 자식·마크 없음, 노드 수 3개 초과면 "영상은 한 글에 3개까지 넣을 수 있어요". `ValidatedContent.videoIds`는 등장 순서(중복 포함 안 함).
  - `interface VideoPostLinker { void link(long postId, long uploaderId, List<UUID> videoIds); void deleteForPost(long postId); }`
  - `DbVideoPostLinker`: 내 영상·`READY`·다른 글에 안 쓰임만 허용. 아니면 `INVALID_INPUT` + `content` 칸에 "올린 적 없는 영상이 들어 있어요" 또는(내 영상인데 READY가 아님) "영상 변환이 끝나지 않았어요". 빠진 영상은 연결 해제.
  - `VideoCleanupJob`: `@Scheduled(cron = "0 0 4 * * *")`, `int cleanup(Instant now)` — `post_id is null` 이고 24시간 지난 영상(상태 무관) 삭제.

- [ ] **Step 1: 실패하는 테스트**
  - 검사기: `acceptsVideoNode`(videoIds 1개), `rejectsForeignVideoSrc`(`https://x.com/a.mp4`, `/api/images/{uuid}`), `rejectsMoreThanThreeVideoNodes`(같은 src 4번도 거절 — 노드 기준), `sameVideoTwiceCountsOnceInIds`(2번 → ids 1개, 저장 통과), `rejectsVideoWithoutSrc`.
  - `PostVideoTest`: `postWithMyReadyVideoSaves`(글 상세 JSON에 노드 유지, `videos.post_id` 연결), `othersVideoRejected`, `processingVideoRejected`("영상 변환이 끝나지 않았어요"), `removingVideoFromBodyUnlinks`, `deletingPostDeletesVideoFiles`(저장소에서 `videos/{id}.mp4` 사라짐).
  - `VideoCleanupJobTest`: 25시간 전 미연결 READY·FAILED 삭제, 23시간 전·연결된 것은 남김.
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests '*PostContentValidatorTest' --tests '*PostVideoTest' --tests '*VideoCleanupJobTest'`.
- [ ] **Step 3: 구현** — 위 Interfaces. `PostService`는 `imageLinker` 옆에 `videoLinker`를 같은 자리에서 부른다.
- [ ] **Step 4: 통과 확인** — 같은 명령, `./gradlew test` 전체.
- [ ] **Step 5: 커밋** — `"Allow video nodes in posts and link, unlink, and clean up their clips"`.

### Task 4: 화면 — `video` 노드와 글 보기 재생

**Files:**
- Create: `frontend/src/api/videos.ts`, `frontend/src/editor/VideoNode.tsx`(Tiptap 노드 + React NodeView), `frontend/src/editor/VideoPlayer.tsx`
- Modify: `frontend/src/editor/extensions.ts`, `frontend/src/editor/extensions.test.ts`, `frontend/src/index.css`(필요한 최소 스타일만)
- Test: `frontend/src/editor/VideoPlayer.test.tsx`, `PostContentView` 렌더 테스트(기존 테스트 파일이 있으면 거기에)

**Interfaces:**
- Produces:
  - `api/videos.ts`: `MAX_VIDEO_BYTES = 200 * 1024 * 1024`, `MAX_VIDEOS_PER_POST = 3`, `type VideoStatus = { id; status: 'QUEUED'|'PROCESSING'|'READY'|'FAILED'; progress; truncated; url: string|null; posterUrl: string|null; width: number|null; height: number|null; errorMessage: string|null }`, `uploadVideo(file: File, onProgress: (percent: number) => void, signal?: AbortSignal): Promise<VideoStatus>`(XMLHttpRequest, `X-XSRF-TOKEN` 쿠키 머리글, 오류는 `ApiError`로), `fetchVideoStatus(id: string): Promise<VideoStatus>`.
  - `VideoNode`: 이름 `video`, 블록·원자·드래그 가능, 저장 속성 `src`(문자열|null), 편집기 전용 속성 `uploadId`(`rendered: false`, JSON에 남지 않게 `toJSON`에서 제외 — Task 7이 저장 전 정리), 편집기 전용 `truncated`. NodeView: `src`가 있으면 `VideoPlayer`, 없으면 Task 5의 `UploadBox`.
  - `VideoPlayer({ src, poster }: { src: string; poster?: string })`: `<video muted loop playsInline preload="metadata">`, IntersectionObserver(threshold 0.5)로 보이면 `play()`, 아니면 `pause()`. 누르면 토글, 멈춤 상태면 가운데 ▶ 원과 `aria-label="영상 재생"`, 재생 중 `aria-label="영상 멈추기"`. `play()`가 거부되면 멈춤 상태로 둔다. 세로(`videoHeight > videoWidth`)면 `max-w-[360px] mx-auto`.
  - poster 주소는 `src + '/poster'`.

- [ ] **Step 1: 실패하는 테스트**
  - `extensions.test.ts`: 허용 노드 목록에 `video` 포함, `{type:'video', attrs:{src:'/api/videos/…'}}` 본문이 읽기 편집기로 그려지면 `video[src="/api/videos/…"]`가 `muted`·`loop`·`playsinline`을 가짐.
  - `VideoPlayer.test.tsx`: 처음 `aria-label` 버튼 존재, 누르면 `pause` 호출과 "영상 재생" 라벨(HTMLMediaElement `play`/`pause`는 vi.spyOn으로 대체, IntersectionObserver는 테스트 도우미로 흉내), `play()`가 reject되면 "영상 재생" 라벨.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/editor`.
- [ ] **Step 3: 구현** — 위 Interfaces.
- [ ] **Step 4: 통과 확인** — `npm test` 전체.
- [ ] **Step 5: 커밋** — `"Render video clips in posts as silent looping players"`.

### Task 5: 화면 — 업로드 칸(영상·사진)

**Files:**
- Create: `frontend/src/editor/UploadBox.tsx`, `frontend/src/editor/UploadBoxNode.ts`(사진 칸 노드 `uploadBox`)
- Modify: `frontend/src/editor/VideoNode.tsx`, `frontend/src/editor/PostEditor.tsx`(도구 줄 **영상** 버튼, `insertVideoBox()`, 칸이 쓰는 `onError`·이미지 업로드 재사용), `frontend/src/editor/extensions.ts`(편집기 전용 확장 목록 `editorExtensions()` 분리: `postExtensions()` + `uploadBox` — 읽기 화면에는 `uploadBox` 없음)
- Test: `frontend/src/editor/UploadBox.test.tsx`, `PostEditor.test.tsx`(있으면 추가)

**Interfaces:**
- Consumes: Task 4 `uploadVideo`, `fetchVideoStatus`, `VideoNode`, 기존 `uploadImage`·`IMAGE_TYPES`·`MAX_IMAGE_BYTES`·`MAX_IMAGES_PER_POST`.
- Produces:
  - `UploadBox({ kind: 'video' | 'image', onFile(file: File): void, state: BoxState, onRetry(): void })` — 표시만 담당. `type BoxState = { phase: 'empty' } | { phase: 'uploading'; percent: number } | { phase: 'queued' } | { phase: 'processing'; percent: number } | { phase: 'failed'; message: string }`. 끌어다 놓기(dragover 시 `data-dragging`), 누르면 숨은 `<input type="file" accept="video/*"|"image/*">`.
  - 영상 칸 흐름(VideoNode NodeView 안): 파일 검사(형식 `video/*`, 200MB, 본문 `video` 노드 중 src 있음+진행 중 합계 3개) → `uploadVideo` 진행률 → 응답 id로 1초마다 `fetchVideoStatus` → READY면 노드 `src` 설정, `truncated` 설정 → 칸이 지워지면(언마운트) 업로드 `abort`·조회 중지.
  - 사진 칸: 파일을 받으면 기존 `insertImages` 규칙으로 올리고 칸을 `image` 노드로 바꾼다.
  - 편집기 안의 영상·사진 칸(완료된 영상 포함)은 마우스를 올리거나 고르면 오른쪽 위에 ✕ 버튼(`aria-label="영상 빼기"`, 사진 칸은 "사진 칸 빼기", 36px `buttonClass('ghost', 36)`)이 보이고 누르면 노드를 지운다. 읽기 화면에는 없다.
  - `PostEditor`가 부모에 알리는 새 콜백: `onPendingChange(pending: { busy: number; failed: number }) => void`.
  - 편집기 저장 직전 정리 함수 `cleanContent(json: JSONContent): JSONContent` — `src` 없는 `video`와 모든 `uploadBox` 노드 제거, `uploadId`·`truncated` 속성 제거. `editor/cleanContent.ts`.

- [ ] **Step 1: 실패하는 테스트**
  - `UploadBox`: 단계별 문구(Global Constraints 문구: "파일을 업로드해주세요", "올리는 중 45%", "변환 차례를 기다리고 있어요", "변환 중 62%", 실패 문장과 "다른 파일 올리기"), 사진 칸 문구, 파일 놓기→`onFile`.
  - 영상 칸 흐름(fetch/XHR 흉내): 업로드 50% → "올리는 중 50%", 상태 PROCESSING 40 → "변환 중 40%", READY → `video` 요소 보임, truncated면 "앞 30초만 넣었어요".
  - 거절: 이미지 파일 → `onError("영상 파일만 넣을 수 있어요")`, 200MB+1 → "영상 파일은 200MB까지 올릴 수 있어요", 이미 3개 → "영상은 한 글에 3개까지 넣을 수 있어요"(업로드 호출 없음).
  - `removeButtonDeletesNode`: 완료된 영상 칸의 "영상 빼기" 누름 → 본문에서 `video` 노드 사라짐.
  - `removingBoxStopsPolling`: 변환 중 칸 지움 → 이후 `fetchVideoStatus` 더 안 불림(Review Focus).
  - `cleanContent`: 빈 영상·사진 칸 제거, 편집기 전용 속성 제거, 나머지 그대로.
  - `onPendingChange`: 업로드 중 `{busy:1, failed:0}`, 실패 `{busy:0, failed:1}`, 완료 `{0,0}`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/editor`.
- [ ] **Step 3: 구현** — 위 Interfaces. 모양: 높이 160, 점선 2px `border-line`(드래그 중 `border-teal bg-ice`), 진행 막대 높이 8 `bg-teal`, 글자 15/13.
- [ ] **Step 4: 통과 확인** — `npm test`.
- [ ] **Step 5: 커밋** — `"Add drop-or-pick upload boxes for clips and photos with upload and transcode progress"`.

### Task 6: `/` 메뉴와 빈 본문 안내

**Files:**
- Modify: `frontend/package.json`(`@tiptap/suggestion@^3.32.0`), `frontend/src/editor/extensions.ts`(`editorExtensions()`에 `SlashCommand`, `Placeholder`), `frontend/src/index.css`(placeholder `::before` 스타일)
- Create: `frontend/src/editor/SlashCommand.ts`, `frontend/src/editor/SlashMenu.tsx`
- Test: `frontend/src/editor/SlashMenu.test.tsx`

**Interfaces:**
- Consumes: Task 5 `insertVideoBox`, 사진 칸 넣기(`uploadBox` 노드).
- Produces: `SlashCommand` 확장(`char: '/'`, `startOfLine: false`, 공백 뒤나 줄 맨 앞에서만), 항목 `[{ key:'video', label:'영상', hint:'/v', match:['v','영'] }, { key:'image', label:'사진', hint:'/i', match:['i','사'] }]`. 쿼리가 비면 둘 다, 쿼리 첫 글자로 거른다, 맞는 게 없으면 메뉴 닫힘. 고르면 `/`+쿼리를 지우고 칸 삽입. 위·아래·Enter·Esc. `Placeholder.configure({ placeholder: '/를 입력하면 영상·사진을 넣을 수 있어요' })`.

- [ ] **Step 1: 실패하는 테스트** — 편집기에 `/` 입력 → `role="listbox"`에 "영상"·"사진", `/v` → "영상"만, Enter → 본문에 영상 칸(UploadBox 문구 보임)·`/v` 글자 없음, `/x` → 메뉴 없음, Esc → 메뉴 닫힘·`/` 남음, 빈 편집기에 안내 문구(`data-placeholder`).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/editor/SlashMenu.test.tsx`.
- [ ] **Step 3: 구현** — 메뉴는 `ReactRenderer`로 커서 좌표에 띄우는 절대 위치 상자(surface, `border-line`, `shadow-pop`, 항목 높이 40, 고른 항목 `bg-ice`, 오른쪽 hint 13px `text-ink-3`).
- [ ] **Step 4: 통과 확인** — `npm test`, `npm run build`, `npm run lint`.
- [ ] **Step 5: 커밋** — `"Add a slash menu for inserting clips and photos"`.

### Task 7: 글쓰기 등록 잠금과 저장 정리

**Files:**
- Modify: `frontend/src/pages/WritePage.tsx`
- Test: `frontend/src/pages/WritePage.test.tsx`(추가)

**Interfaces:**
- Consumes: Task 5 `onPendingChange`, `cleanContent`.

- [ ] **Step 1: 실패하는 테스트**
  - `pending.busy > 0`이면 등록 버튼 `disabled`, 옆에 "영상 변환이 끝나면 등록할 수 있어요".
  - `pending.failed > 0`에서 등록 누르면 알림 "변환하지 못한 영상을 빼거나 다시 올려 주세요", 요청 안 감.
  - 저장 요청 본문은 `cleanContent`를 거친 JSON(빈 칸 없음, `uploadId` 없음).
- [ ] **Step 2: 실패 확인** — `npx vitest run src/pages/WritePage.test.tsx`.
- [ ] **Step 3: 구현** — 버튼 잠금은 `submitting || pending.busy > 0`. 안내 문구는 버튼 옆 13px `text-ink-3`(좁은 화면은 버튼 위 줄).
- [ ] **Step 4: 통과 확인** — `npm test`.
- [ ] **Step 5: 커밋** — `"Lock posting while clips transcode and strip empty upload boxes on save"`.

### Task 8: 운영·CI·문서

**Files:**
- Modify: `backend/Dockerfile`(실행 단계에 `apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*`, `MaxRAMPercentage=50`), `deploy/compose.prod.yaml`(`backend` `mem_limit: 1500m`), `backend/src/main/resources/application-prod.yml`(`app.videos.tmp-dir: /data/images/tmp`), `.github/workflows/ci.yml`(`backend-test`에 `sudo apt-get update && sudo apt-get install -y ffmpeg` 단계), `CLAUDE.md`(구조·기술 주의사항·남은 일)

- [ ] **Step 1: 이미지 확인** — `docker build -f backend/Dockerfile -t ghcr.io/yyy5044/aram-backend:local .` 성공, `docker run --rm --entrypoint sh ghcr.io/yyy5044/aram-backend:local -c "ffmpeg -version | head -1; ffprobe -version | head -1; id -u"` → 버전 두 줄, `10001`.
- [ ] **Step 2: 운영 리허설** — 스크래치 폴더에서 `compose.prod.yaml`(DOMAIN=localhost) 띄우고, 개발 로그인이 없으므로 리허설은 `GET /api/videos/{없는 id}` 404 JSON과 `docker compose exec backend ls -ld /data/images/tmp`(앱이 만들 수 있는 소유자)만 확인. 정리 `down -v`.
- [ ] **Step 3: CI 문법** — actionlint 통과.
- [ ] **Step 4: CLAUDE.md** — 구조 표에 `video/`, 기술 주의사항에 변환 규격·한도·임시 폴더·ffmpeg 필요(로컬 설치 방법)·본문 노드 `video`/편집기 전용 `uploadBox`·`cleanContent`, 남은 일 완료 항목.
- [ ] **Step 5: 커밋** — `"Ship ffmpeg in the backend image and give it memory headroom"`.

### Task 9: 실제 화면 확인과 마무리

- [ ] **Step 1: 전체 테스트** — `cd backend && ./gradlew test`, `cd frontend && npm test && npm run build && npm run lint` 모두 통과.
- [ ] **Step 2: 브라우저 확인** (`bootRun` + 미리보기, 개발 로그인)
  - `SampleVideos`와 같은 ffmpeg 명령으로 만든 40초 1080p60 소리 있는 영상과 세로 영상을 준비한다.
  - 글쓰기에서 `/` → 메뉴, `/v` Enter → 칸, 칸 누르기로 파일 고르기 → "올리는 중" → "변환 중" → 재생, "앞 30초만 넣었어요" 확인. 도구 줄 영상 버튼도 확인.
  - 변환 중 등록 잠금·안내 확인, 완료 뒤 등록 → 글 보기에서 자동 반복·누르면 멈춤·▶ 표시.
  - `/i`로 사진 칸에 사진 넣기.
  - 휴대폰 크기(375px)에서 칸·메뉴가 넘치지 않는지.
- [ ] **Step 3: `dev`에 합치기** — 최종 검토 뒤 `git checkout dev && git merge --no-ff video`.
