import { getEsClient } from "@/lib/es";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const es = getEsClient();
    const health = await es.cluster.health();
    return NextResponse.json({
      ok: true,
      elasticsearch: health.body.status,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 503 }
    );
  }
}
