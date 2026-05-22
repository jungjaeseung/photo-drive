/**
 * 처리 실패·썸네일 없는 동영상을 poster.webp / preview.mp4 로 재변환
 *
 * Docker (ffmpeg 포함, 권장):
 *   docker compose exec worker node dist/cli/regenerate-videos.js -- --dry-run
 *
 * 호스트 (ffmpeg·ffprobe 설치 필요):
 *   export STORAGE_ROOT=/mnt/extra/photo-drive
 *   export ELASTICSEARCH_URL=http://127.0.0.1:9200
 *   pnpm --filter @photo-drive/worker regenerate:videos
 */
import { getStorageRoot } from "../config.js";
import { scrollVideoIdsNeedingReprocess } from "../es.js";
import { processVideo } from "../process-video.js";
import { parseDryRunLimitArgs } from "./parse-args.js";

async function main() {
  const { dryRun, limit } = parseDryRunLimitArgs(process.argv.slice(2));
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
