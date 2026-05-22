import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** nginx auth_request: 세션 쿠키 유효 시 200, 아니면 401 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }
  return new NextResponse(null, { status: 200 });
}
