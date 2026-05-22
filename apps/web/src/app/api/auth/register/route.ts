import {
  validateLoginId,
  validateName,
  validatePassword,
} from "@/lib/auth-validation";
import { createUser, userExists } from "@/lib/es-users";
import type { UserDocument } from "@photo-drive/shared";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: {
    id?: string;
    password?: string;
    passwordConfirm?: string;
    name?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const passwordConfirm =
    typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
  const name = typeof body.name === "string" ? body.name : "";

  const idErr = validateLoginId(id);
  if (idErr) {
    return NextResponse.json({ error: idErr }, { status: 400 });
  }
  const pwErr = validatePassword(password);
  if (pwErr) {
    return NextResponse.json({ error: pwErr }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json(
      { error: "비밀번호 확인이 일치하지 않습니다" },
      { status: 400 }
    );
  }
  const nameErr = validateName(name);
  if (nameErr) {
    return NextResponse.json({ error: nameErr }, { status: 400 });
  }

  if (await userExists(id)) {
    return NextResponse.json(
      { error: "이미 사용 중인 아이디입니다" },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const doc: UserDocument = {
    id,
    passwordHash: await bcrypt.hash(password, 10),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  };

  await createUser(doc);

  return NextResponse.json({ ok: true, id });
}
