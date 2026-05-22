"use client";

import { getAuthApiBasePath } from "@/lib/auth-base-path";
import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider basePath={getAuthApiBasePath()}>
      {children}
    </SessionProvider>
  );
}
