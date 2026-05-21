# Photo Drive

개인 미디어 뷰어 (Next.js + Elasticsearch + Sharp/FFmpeg worker)

## 기능

- 이미지/동영상 업로드 (비동기 파생본 생성)
- SHA256 중복 감지 (409 + 기존 미디어 ID)
- 보관함 (날짜별 그룹, infinite scroll, virtualization)
- 앨범 (grouping only), 사진만/동영상만 뷰
- Nginx immutable 캐시 (thumbnail/preview)

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

접속: `https://3harang.ddns.net/photos` (home-server nginx에 `docker/nginx/home-server-snippet.conf` 참고)

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
