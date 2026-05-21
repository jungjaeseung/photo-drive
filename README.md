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

## 구조

- `apps/web` — Next.js UI + API
- `apps/worker` — BullMQ + Sharp + FFmpeg
- `packages/shared` — 타입, 경로, 상수
