/**
 * 초기 사용자 시드 (선택)
 *
 *   export ELASTICSEARCH_URL=http://127.0.0.1:9200
 *   export AUTH_BOOTSTRAP_USERS='[{"id":"jung","password":"...","name":"정"}]'
 *   pnpm --filter @photo-drive/web es:seed-users
 */
import bcrypt from "bcryptjs";
import { ES_INDEX_USERS, type UserDocument } from "@photo-drive/shared";
import { Client } from "@elastic/elasticsearch";

interface BootstrapUser {
  id: string;
  password: string;
  name: string;
}

function parseBootstrap(): BootstrapUser[] {
  const raw = process.env.AUTH_BOOTSTRAP_USERS;
  if (!raw?.trim()) {
    console.error("AUTH_BOOTSTRAP_USERS env 가 비어 있습니다.");
    process.exit(1);
  }
  const parsed = JSON.parse(raw) as BootstrapUser[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AUTH_BOOTSTRAP_USERS must be a non-empty JSON array");
  }
  return parsed;
}

async function main() {
  const url = process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
  const client = new Client({ node: url });
  const users = parseBootstrap();
  const force = process.argv.includes("--force");

  for (const u of users) {
    const id = u.id.trim();
    const exists = await client.exists({ index: ES_INDEX_USERS, id });
    if (exists.body && !force) {
      console.log(`skip (exists): ${id}`);
      continue;
    }

    const now = new Date().toISOString();
    const doc: UserDocument = {
      id,
      passwordHash: bcrypt.hashSync(u.password, 10),
      name: u.name.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await client.index({
      index: ES_INDEX_USERS,
      id,
      body: doc,
      refresh: "wait_for",
    });
    console.log(`seeded: ${id} (${doc.name})`);
  }

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
