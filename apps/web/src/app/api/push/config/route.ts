import { NextResponse } from "next/server";

export async function GET() {
  const vapidPublicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    null;
  const enabled = !!(
    vapidPublicKey &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );

  return NextResponse.json({
    enabled,
    vapidPublicKey: enabled ? vapidPublicKey : null,
  });
}
