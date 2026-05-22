import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null as null,
      unauthorized: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return {
    session: session as {
      user: { id: string; name: string };
    },
    unauthorized: null as null,
  };
}
