export function getElasticsearchUrl(): string {
  return process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
}

export function getRedisUrl(): string {
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

export function getStorageRoot(): string {
  return process.env.STORAGE_ROOT ?? "./storage";
}
