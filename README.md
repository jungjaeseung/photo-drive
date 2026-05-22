# Photo Drive

개인 미디어 뷰어 (Next.js + Elasticsearch + Sharp/FFmpeg worker)

## 기능

- 이미지/동영상 업로드 (비동기 파생본 생성)
- SHA256 중복 감지 (409 + 기존 미디어 ID)
- 보관함 (날짜별 그룹, infinite scroll, virtualization)
- 앨범 (grouping only), 사진만/동영상만 뷰
- Nginx immutable 캐시 (thumbnail/preview)
- PWA (홈 화면 추가, 분홍 사진 앱 스타일 아이콘)

## PWA (홈 화면에 추가)

- **iPhone:** Safari에서 `/photos` 접속 → 공유 → **홈 화면에 추가**
- **Android:** Chrome 메뉴 → **앱 설치** 또는 홈 화면에 추가

아이콘·manifest·service worker는 `apps/web/public/`에 있습니다. 프로덕션에서는 `NEXT_PUBLIC_BASE_PATH=/photos`가 설정되어 있어야 합니다.

아이콘 원본: `apps/web/public/icons/image.png` — 변경 후 `pnpm --filter @photo-drive/web icons:generate`로 PNG 크기별 생성.

### 업로드 완료 푸시 알림

홈 화면에 추가한 PWA에서 **업로드 처리 완료** 시 Web Push 알림을 받을 수 있습니다 (여러 기기·가족 폰 모두 구독 가능).

**요구 사항**

- HTTPS (프로덕션)
- iOS 16.4+ **홈 화면에 추가된 PWA** (Safari 탭만으로는 푸시 불가)
- 앱 실행 후 「알림 받기」 허용

**VAPID 키 설정 (1회)**

```bash
npx web-push generate-vapid-keys
```

`.env` 또는 Docker 배포 환경에 설정:

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 공개 키 (브라우저 구독용, web·app 컨테이너) |
| `VAPID_PUBLIC_KEY` | 공개 키 (worker 발송용) |
| `VAPID_PRIVATE_KEY` | 비밀 키 (worker만, **저장소에 커밋 금지**) |
| `VAPID_SUBJECT` | `mailto:you@example.com` 형식 |

```bash
# 인덱스 (최초 1회)
pnpm es:init

# 로컬 예시
export NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
export VAPID_PUBLIC_KEY="..."
export VAPID_PRIVATE_KEY="..."
export VAPID_SUBJECT="mailto:you@example.com"
```

Docker:

```bash
export NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
export VAPID_PUBLIC_KEY="..."
export VAPID_PRIVATE_KEY="..."
export VAPID_SUBJECT="mailto:you@example.com"
docker compose up -d app worker
```

연속 업로드는 **3초 묶음** 후 `n개의 파일이 업로드 되었습니다` 알림 1회로 발송됩니다.

**알림이 안 올 때**

1. 서버에 VAPID 4개 변수가 설정됐는지 (`docker compose` 전에 `export` 또는 `.env`)
2. `pnpm es:init` 후 `docker compose build && docker compose up -d app worker` (코드·env 반영)
3. **홈 화면 아이콘으로 앱 실행** (iPhone은 Safari 탭만으로는 푸시 불가 — **다시 추가할 필요는 없음**, 기존 아이콘으로 열면 됨)
4. 앱에서 **「알림 받기」** 탭 → iOS 알림 허용
5. 「나중에」를 눌렀다면 배너가 숨겨짐 → 앱을 완전히 종료 후 다시 열거나, Safari 설정에서 사이트 데이터 초기화 후 재허용

브라우저에서 확인: `https://…/photos/api/push/config` → `{"enabled":true,"vapidPublicKey":"…"}` 이어야 함.

**PWA에서 주소 확인 (iPhone)**  
홈 화면 앱에는 주소창이 없습니다. 앱 **오른쪽 위 분홍 종 버튼** → 「현재 주소」「경로」에 `/photos` 가 포함되는지 확인하세요.

## 로컬 개발

```bash
pnpm install
# Elasticsearch 7.10 (js-wallet 인프라 또는 로컬)
export ELASTICSEARCH_URL=http://localhost:9200
export REDIS_URL=redis://localhost:6379
export STORAGE_ROOT=./storage

pnpm es:init
pnpm dev          # Next.js (apps/web)
pnpm --filter @photo-drive/worker dev   # worker (별도 터미널)
```

## Docker (홈서버)

```bash
# 사전: home-network, js-es 실행
docker network create home-network 2>/dev/null || true
cd ../js-wallet && pnpm docker:start:infra

export STORAGE_HOST_PATH=/mnt/extra/photo-drive
pnpm docker:build
pnpm docker:start
pnpm es:init   # 컨테이너 내 또는 호스트에서 ES 인덱스 생성
```

접속: `https://3harang.ddns.net/photos`

**nginx:** `home-server/nginx/nginx-ssl.conf`와 `nginx.conf` 둘 다에 `/photos` 라우트 필요 (SSL 사용 시 **ssl 파일 필수**). 스니펫: `docker/nginx/home-server-snippet.conf`

### 502 Bad Gateway 시

```bash
# 1) photo-drive 컨테이너 상태
docker ps -a | grep photo-drive
docker logs photo-drive-app --tail 50

# 2) home-network 연결
docker network inspect home-network --format '{{range .Containers}}{{.Name}} {{end}}'
# photo-drive-app, home-server-nginx 포함 확인

# 3) nginx 설정 반영 후 재시작
cd ~/source/home-server && docker compose restart nginx
docker exec home-server-nginx nginx -t
```

### `docker builder prune` 후 사진/동영상이 안 보일 때

`docker builder prune -a`는 **빌드 캐시만** 지웁니다. `/mnt/extra/photo-drive` 파일은 그대로여야 합니다.  
목록은 **Elasticsearch**(`photo-drive-media` 인덱스)에서 읽습니다. 파일만 있고 ES가 비어 있으면 화면이 비어 보입니다.

**1) 스토리지 마운트 확인** (컨테이너가 실제 데이터 경로를 보는지)

```bash
export STORAGE_HOST_PATH=/mnt/extra/photo-drive
docker compose up -d app worker media-nginx

docker exec photo-drive-app ls /storage/media | head
docker exec photo-drive-app sh -c 'find /storage/media -name metadata.json | head -3'
```

비어 있으면 `STORAGE_HOST_PATH` 없이 올린 것입니다. 반드시 export 후 `docker compose up -d` 하세요.

**2) Elasticsearch 문서 수 확인**

```bash
curl -s 'http://127.0.0.1:9200/photo-drive-media/_count'   # js-es 포트가 다르면 조정
```

`count`가 0이면 인덱스만 비어 있는 상태입니다.

**3) 디스크 metadata.json → ES 복구**

```bash
cd ~/source/photo-drive
export STORAGE_ROOT=/mnt/extra/photo-drive
export ELASTICSEARCH_URL=http://127.0.0.1:9200   # js-es 주소
pnpm install
pnpm --filter @photo-drive/web es:reindex
```

완료 후 `/photos` 새로고침. 앨범 인덱스는 별도(`photo-drive-albums`)라 앨범이 비어 있으면 앱에서 다시 만들거나 백업이 있으면 복구하세요.

**주의:** `docker volume prune` / `docker system prune -a --volumes`는 **redis·nginx 캐시 볼륨**을 지울 수 있습니다. `js-es` 데이터까지 지웠다면 위 reindex가 필요합니다.

## GitHub Actions 배포 (main push)

`main` 브랜치에 push하면 홈서버에 SSH로 배포합니다.

### 1. 홈서버 준비

- `~/source/photo-drive`에 repo clone
- `docker`, `docker compose` 설치 (빌드는 Docker 안에서 실행, 호스트에 `pnpm` 불필요)
- 배포 키 등록 (아래 공개키를 `~/.ssh/authorized_keys`에 추가)

```bash
# 배포 전용 키 생성 (로컬 또는 서버)
ssh-keygen -t ed25519 -C "github-actions-photo-drive" -f ~/.ssh/photo-drive-deploy -N ""
cat ~/.ssh/photo-drive-deploy.pub   # 이 내용을 authorized_keys에
```

### 2. GitHub Secrets 설정

Repository → Settings → Secrets and variables → Actions:

| Secret | 예시 |
|--------|------|
| `SSH_HOST` | `59.13.92.28` 또는 DDNS |
| `SSH_USER` | `jung` |
| `SSH_PRIVATE_KEY` | `photo-drive-deploy` **개인키 전체** |
| `SSH_PORT` | **`2222`** (홈서버 SSH 포트, 22가 아니면 필수) |

연결 테스트:

```bash
ssh -i ~/.ssh/photo-drive-deploy -p 2222 jung@59.13.92.28 "echo ok"
```

### 3. 실행 내용

```bash
cd ~/source/photo-drive
git pull origin main
export STORAGE_HOST_PATH=/mnt/extra/photo-drive
docker compose build
docker compose up -d app worker
```

worker도 같이 올리려면 워크플로 마지막 줄을 `docker compose up -d app worker`로 바꾸세요.

## 구조

- `apps/web` — Next.js UI + API
- `apps/worker` — BullMQ + Sharp + FFmpeg
- `packages/shared` — 타입, 경로, 상수
