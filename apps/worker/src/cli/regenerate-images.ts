/**
 * ready 상태 이미지의 thumb.webp / medium.webp 를 현재 WebP quality 설정으로 재생성
 */
import { MEDIUM_WEBP_QUALITY, THUMB_WEBP_QUALITY } from "@photo-drive/shared";
import { getStorageRoot } from "../config.js";
import { scrollReadyImageIds } from "../es.js";
import { processImage } from "../process-image.js";
import { parseDryRunLimitArgs } from "./parse-args.js";

async function main() {
  const { dryRun, limit } = parseDryRunLimitArgs(process.argv.slice(2));
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
