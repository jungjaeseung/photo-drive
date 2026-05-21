export function getStorageRoot(): string {
  return process.env.STORAGE_ROOT ?? pathJoin(process.cwd(), "../../storage");
}

export function getElasticsearchUrl(): string {
  return process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
}

export function getRedisUrl(): string {
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

export function getPublicBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? (getBasePath() || "");
}

function pathJoin(...parts: string[]): string {
  return parts.join("/").replace(/\/+/g, "/");
}
