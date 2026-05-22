"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-zinc-500"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="mr-1 h-4 w-4" />
      로그아웃
    </Button>
  );
}
