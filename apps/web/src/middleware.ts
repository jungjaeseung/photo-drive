import { authConfig } from "@/auth.config";
import NextAuth from "next-auth";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/photos/:path*",
    "/photos",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
