import { getAuthApiBasePath } from "@/lib/auth-base-path";
import { getBasePath } from "@/lib/config";
import type { NextAuthConfig } from "next-auth";

const basePath = getBasePath();

export const authConfig = {
  basePath: getAuthApiBasePath(),
  trustHost: true,
  cookies: {
    sessionToken: {
      options: {
        path: basePath || "/",
        sameSite: "lax",
      },
    },
  },
  pages: {
    /** next.config basePath가 자동으로 붙음 — /photos/login 이 되도록 내부 경로만 */
    signIn: "/login",
  },
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const id = (token.id as string | undefined) ?? token.sub ?? "";
        session.user.id = id;
        session.user.name = (token.name as string | undefined) ?? id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
