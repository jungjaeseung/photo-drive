/**
 * ready 상태 이미지의 thumb.webp / medium.webp 를 현재 WebP quality 설정으로 재생성
 *
 * 사용 (서버, worker 중지 불필요·푸시 알림 없음):
 *   export STORAGE_ROOT=/mnt/extra/photo-drive
 *   export ELASTICSEARCH_URL=http://127.0.0.1:9200
 *   pnpm --filter @photo-drive/worker regenerate:images
 *
 * 옵션:
 *   --dry-run   대상 개수만 출력
 *   --limit N   최대 N건만 처리 (테스트용)
 */
import { THUMB_WEBP_QUALITY, MEDIUM_WEBP_QUALITY } from "@photo-drive/shared";
import { getStorageRoot } from "../src/config.js";
import { scrollReadyImageIds } from "../src/es.js";
import { processImage } from "../src/process-image.js";

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") dryRun = true;
    if (argv[i] === "--limit" && argv[i + 1]) {
      limit = parseInt(argv[i + 1], 10);
      i++;
    }
  }

  return { dryRun, limit };
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv.slice(2));
  const storageRoot = getStorageRoot();

  console.log(
    `WebP quality: thumb=${THUMB_WEBP_QUALITY}, medium=${MEDIUM_WEBP_QUALITY}`
  );
  console.log(`STORAGE_ROOT=${storageRoot}`);

  const ids = await scrollReadyImageIds();
  const targets = limit != null && limit > 0 ? ids.slice(0, limit) : ids;

  console.log(`대상 이미지 ${targets.length}건 (전체 ready ${ids.length}건)`);

  if (dryRun) return;

  let ok = 0;
  let fail = 0;

  for (const mediaId of targets) {
    try {
      await processImage(mediaId, storageRoot, { notify: false });
      ok += 1;
      if (ok % 50 === 0) {
        console.log(`  ... ${ok}/${targets.length} 완료`);
      }
    } catch (err) {
      fail += 1;
      console.warn(`  실패 ${mediaId}:`, err);
    }
  }

  console.log(`완료: 성공 ${ok}, 실패 ${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
