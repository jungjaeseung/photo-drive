/**
 * 디스크에 남아 있는 metadata.json 기준으로 ES 미디어 인덱스 복구
 *
 * 사용 (서버):
 *   export STORAGE_ROOT=/mnt/extra/photo-drive
 *   export ELASTICSEARCH_URL=http://127.0.0.1:9200
 *   pnpm --filter @photo-drive/web es:reindex
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "@elastic/elasticsearch";
import {
  computeSortAt,
  ES_INDEX_MEDIA,
  type MediaDocument,
} from "@photo-drive/shared";

const url = process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
const storageRoot = process.env.STORAGE_ROOT ?? "/mnt/extra/photo-drive";
const mediaRoot = path.join(storageRoot, "media");

async function collectMetadataFiles(dir: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(current: string) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name === "metadata.json") {
        found.push(full);
      }
    }
  }

  await walk(dir);
  return found;
}

async function main() {
  const client = new Client({ node: url });

  const metaFiles = await collectMetadataFiles(mediaRoot);
  console.log(`metadata.json ${metaFiles.length}개 발견 (${mediaRoot})`);

  let indexed = 0;
  let skipped = 0;

  for (const metaPath of metaFiles) {
    try {
      const raw = await readFile(metaPath, "utf8");
      const doc = JSON.parse(raw) as MediaDocument;
      if (!doc.id || doc.deletedAt) {
        skipped++;
        continue;
      }
      if (!doc.sortAt) {
        doc.sortAt = computeSortAt(doc);
      }
      await client.index({
        index: ES_INDEX_MEDIA,
        id: doc.id,
        body: doc,
        refresh: false,
      });
      indexed++;
      if (indexed % 100 === 0) {
        console.log(`  ... ${indexed}건 인덱싱`);
      }
    } catch (err) {
      console.warn(`skip ${metaPath}:`, err);
      skipped++;
    }
  }

  await client.indices.refresh({ index: ES_INDEX_MEDIA });
  const count = await client.count({ index: ES_INDEX_MEDIA });
  console.log(
    `완료: 인덱싱 ${indexed}건, 건너뜀 ${skipped}건, ES 총 ${count.body.count ?? 0}건`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
