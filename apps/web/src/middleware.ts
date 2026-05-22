import { authConfig } from "@/auth.config";
import { isPublicPath } from "@/lib/auth-public-paths";
import { stripBasePath, withBasePath } from "@/lib/paths";
import {
  isRegistrationBasicAuthConfigured,
  isRegistrationGatePath,
  registrationBasicAuthChallenge,
  registrationBasicAuthForbidden,
  verifyRegistrationBasicAuth,
} from "@/lib/registration-basic-auth";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const path = stripBasePath(req.nextUrl.pathname);

  if (isRegistrationGatePath(path)) {
    if (!isRegistrationBasicAuthConfigured()) {
      return registrationBasicAuthForbidden();
    }
    if (!verifyRegistrationBasicAuth(req)) {
      return registrationBasicAuthChallenge();
    }
  }

  if (isPublicPath(path)) return;

  if (!req.auth?.user?.id) {
    const loginUrl = new URL(withBasePath("/login"), req.nextUrl.origin);
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }
});

/**
 * matcher는 basePath(/photos) 없이 적은 경로 — Next가 /photos 접두사를 자동 적용.
 * '/' 를 넣어야 /photos(보관함) 루트도 보호됨.
 */
export const config = {
  matcher: [
    // 업로드는 본문이 크므로 미들웨어 제외(10MB 버퍼 한도). 인증은 upload route에서 requireSession.
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw\\.js|api/media/upload).*)",
    "/",
  ],
};
