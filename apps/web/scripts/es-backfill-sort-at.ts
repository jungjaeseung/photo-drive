/**
 * 기존 ES 미디어 문서에 sortAt 필드 채우기 (통합 시간순 정렬용)
 *
 *   export ELASTICSEARCH_URL=http://127.0.0.1:9200
 *   pnpm --filter @photo-drive/web es:backfill-sort-at
 * (shared 소스를 직접 import — dist 빌드 불필요)
 */
import { Client } from "@elastic/elasticsearch";
import { ES_INDEX_MEDIA } from "../../../packages/shared/src/constants.ts";
import { computeSortAt } from "../../../packages/shared/src/media-date.ts";
import type { MediaDocument } from "../../../packages/shared/src/types.ts";

const url = process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
const client = new Client({ node: url });

async function main() {
  let updated = 0;
  let skipped = 0;

  const scroll = await client.search({
    index: ES_INDEX_MEDIA,
    scroll: "2m",
    size: 100,
    body: {
      query: { bool: { must_not: [{ exists: { field: "deletedAt" } }] } },
    },
  });

  let scrollId = scroll.body._scroll_id;
  let hits = scroll.body.hits.hits ?? [];

  while (hits.length > 0) {
    for (const hit of hits) {
      const doc = hit._source as MediaDocument | undefined;
      if (!doc?.id) {
        skipped++;
        continue;
      }

      const sortAt = computeSortAt(doc);
      if (doc.sortAt === sortAt) {
        skipped++;
        continue;
      }

      await client.update({
        index: ES_INDEX_MEDIA,
        id: doc.id,
        body: { doc: { sortAt } },
        refresh: false,
      });
      updated++;
    }

    const next = await client.scroll({
      scroll_id: scrollId,
      scroll: "2m",
    });
    scrollId = next.body._scroll_id;
    hits = next.body.hits.hits ?? [];
  }

  if (scrollId) {
    await client.clearScroll({ scroll_id: scrollId }).catch(() => {});
  }

  await client.indices.refresh({ index: ES_INDEX_MEDIA });
  console.log(`sortAt backfill 완료: ${updated}건 갱신, ${skipped}건 스킵`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
