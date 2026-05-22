import { stripBasePath, withBasePath } from "@/lib/paths";
import type { NextAuthConfig } from "next-auth";

function isPublicPath(path: string): boolean {
  if (path === "/login" || path === "/login/new") return true;
  if (path.startsWith("/api/auth")) return true;
  if (path === "/api/health") return true;
  if (path.startsWith("/_next")) return true;
  if (path.startsWith("/icons")) return true;
  if (path === "/manifest.webmanifest") return true;
  if (path.endsWith("/sw.js")) return true;
  return false;
}

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: withBasePath("/login"),
  },
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const path = stripBasePath(nextUrl.pathname);
      if (isPublicPath(path)) return true;
      return !!auth?.user?.id;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.name = (token.name as string) ?? token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
