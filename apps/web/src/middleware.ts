import { authConfig } from "@/auth.config";
import { isPublicPath } from "@/lib/auth-public-paths";
import { stripBasePath, withBasePath } from "@/lib/paths";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const path = stripBasePath(req.nextUrl.pathname);
  if (isPublicPath(path)) return;

  if (!req.auth?.user?.id) {
    const login = req.nextUrl.clone();
    login.pathname = withBasePath("/login");
    login.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(login);
  }
});

export const config = {
  matcher: ["/photos/:path*", "/photos"],
};
