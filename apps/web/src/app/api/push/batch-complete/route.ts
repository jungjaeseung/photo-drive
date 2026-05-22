import { requireSession } from "@/lib/require-session";
import { finalizeUploadBatch } from "@/lib/push-batch-complete";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const { session, unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      batchId?: string;
      count?: number;
    };

    const batchId = body.batchId?.trim();
    const count =
      typeof body.count === "number" ? Math.floor(body.count) : NaN;

    if (!batchId || !Number.isFinite(count) || count < 0) {
      return NextResponse.json(
        { error: "batchId and count are required" },
        { status: 400 }
      );
    }

    const uploaderName = session.user.name?.trim() || undefined;
    await finalizeUploadBatch(batchId, count, uploaderName);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("push batch-complete error", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
