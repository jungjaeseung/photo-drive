import { authConfig } from "@/auth.config";
import { getUserById } from "@/lib/es-users";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        id: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const id =
          typeof credentials?.id === "string" ? credentials.id.trim() : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";
        if (!id || !password) return null;

        const user = await getUserById(id);
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name };
      },
    }),
  ],
});
