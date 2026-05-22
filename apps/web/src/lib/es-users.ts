import { getEsClient } from "@/lib/es";
import { ES_INDEX_USERS, type UserDocument } from "@photo-drive/shared";

export async function getUserById(id: string): Promise<UserDocument | null> {
  const es = getEsClient();
  try {
    const result = await es.get({ index: ES_INDEX_USERS, id });
    return result.body._source as UserDocument;
  } catch {
    return null;
  }
}

export async function userExists(id: string): Promise<boolean> {
  const user = await getUserById(id);
  return user !== null;
}

export async function createUser(doc: UserDocument): Promise<void> {
  const es = getEsClient();
  await es.index({
    index: ES_INDEX_USERS,
    id: doc.id,
    body: doc,
    refresh: "wait_for",
  });
}
