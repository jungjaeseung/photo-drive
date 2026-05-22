/**
 * 처리 실패·썸네일 없는 동영상을 poster.webp / preview.mp4 로 재변환
 *
 * 사용 (서버, 푸시 알림 없음):
 *   export STORAGE_ROOT=/mnt/extra/photo-drive
 *   export ELASTICSEARCH_URL=http://127.0.0.1:9200
 *   pnpm --filter @photo-drive/worker regenerate:videos
 *
 * 옵션:
 *   --dry-run   대상 개수만 출력
 *   --limit N   최대 N건만 처리 (테스트용)
 */
import { getStorageRoot } from "../src/config.js";
import { scrollVideoIdsNeedingReprocess } from "../src/es.js";
import { processVideo } from "../src/process-video.js";

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

  console.log(`STORAGE_ROOT=${storageRoot}`);

  const ids = await scrollVideoIdsNeedingReprocess();
  const targets = limit != null && limit > 0 ? ids.slice(0, limit) : ids;

  console.log(`재변환 대상 동영상 ${targets.length}건 (스크롤 전체 ${ids.length}건)`);

  if (dryRun) return;

  let ok = 0;
  let fail = 0;

  for (const mediaId of targets) {
    try {
      await processVideo(mediaId, storageRoot, { notify: false });
      ok += 1;
      console.log(`  OK ${mediaId}`);
    } catch (err) {
      fail += 1;
      console.warn(`  FAIL ${mediaId}:`, err);
    }
  }

  console.log(`완료: 성공 ${ok}, 실패 ${fail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
