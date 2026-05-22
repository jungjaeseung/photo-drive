import { requireSession } from "@/lib/require-session";
import { removePushSubscription } from "@/lib/push-subscriptions";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const endpoint =
    typeof body.endpoint === "string"
      ? body.endpoint
      : request.nextUrl.searchParams.get("endpoint");

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  await removePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
