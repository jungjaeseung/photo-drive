import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isSecureRequest(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  const proto = request.headers.get("x-forwarded-proto");
  return proto === "https" || proto === "https,http";
}

/** nginx auth_request: 세션 쿠키 유효 시 200, 아니면 401 */
export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecureRequest(request),
  });

  const userId =
    (token as { id?: string } | null)?.id ?? token?.sub ?? null;
  if (!userId) {
    return new NextResponse(null, { status: 401 });
  }
  return new NextResponse(null, { status: 200 });
}
