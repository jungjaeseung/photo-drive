import { requireSession } from "@/lib/require-session";
import { savePushSubscription } from "@/lib/push-subscriptions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json(
      { error: "invalid push subscription" },
      { status: 400 }
    );
  }

  await savePushSubscription(
    body as PushSubscriptionJSON,
    request.headers.get("user-agent") ?? undefined
  );

  return NextResponse.json({ ok: true });
}
