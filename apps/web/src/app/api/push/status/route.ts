import { requireSession } from "@/lib/require-session";
import { listPushSubscriptions } from "@/lib/push-subscriptions";
import { NextResponse } from "next/server";

export async function GET() {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const subs = await listPushSubscriptions();
  return NextResponse.json({
    count: subs.length,
    devices: subs.map((s) => ({
      endpoint: s.endpoint.slice(0, 80) + (s.endpoint.length > 80 ? "…" : ""),
      userAgent: s.userAgent,
      updatedAt: s.updatedAt,
    })),
  });
}
