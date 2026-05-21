import { Client } from "@elastic/elasticsearch";
import { ES_INDEX_ALBUMS, ES_INDEX_MEDIA } from "@photo-drive/shared";

const url = process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
const client = new Client({ node: url });

const mediaMappings = {
  properties: {
    id: { type: "keyword" },
    type: { type: "keyword" },
    status: { type: "keyword" },
    originalPath: { type: "keyword" },
    thumbnailPath: { type: "keyword" },
    previewPath: { type: "keyword" },
    filename: { type: "text", fields: { keyword: { type: "keyword" } } },
    mimeType: { type: "keyword" },
    extension: { type: "keyword" },
    width: { type: "integer" },
    height: { type: "integer" },
    duration: { type: "float" },
    size: { type: "long" },
    sha256: { type: "keyword" },
    createdAt: { type: "date" },
    takenAt: { type: "date" },
    sortAt: { type: "date" },
    uploadedAt: { type: "date" },
    albumIds: { type: "keyword" },
    favorite: { type: "boolean" },
    exif: { type: "object", enabled: false },
    deletedAt: { type: "date" },
    codec: { type: "keyword" },
    resolution: { type: "keyword" },
    errorMessage: { type: "text" },
  },
};

const albumMappings = {
  properties: {
    id: { type: "keyword" },
    name: { type: "text", fields: { keyword: { type: "keyword" } } },
    description: { type: "text" },
    coverMediaId: { type: "keyword" },
    mediaCount: { type: "integer" },
    sortOrder: { type: "long" },
    createdAt: { type: "date" },
    updatedAt: { type: "date" },
  },
};

async function ensureIndex(name: string, mappings: object) {
  const exists = await client.indices.exists({ index: name });
  if (exists.body) {
    console.log(`Index ${name} already exists`);
    return;
  }
  await client.indices.create({
    index: name,
    body: { mappings },
  });
  console.log(`Created index ${name}`);
}

async function main() {
  await ensureIndex(ES_INDEX_MEDIA, mediaMappings);
  await ensureIndex(ES_INDEX_ALBUMS, albumMappings);
  console.log("Elasticsearch indices ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
