import { NextResponse } from "next/server";

export async function GET() {
  const vapidPublicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    null;
  const canSend = !!(
    vapidPublicKey &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );

  return NextResponse.json({
    /** 클라이언트 구독 가능 (공개키만 있으면 됨) */
    enabled: !!vapidPublicKey,
    canSend,
    vapidPublicKey,
  });
}
