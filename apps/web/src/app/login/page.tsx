import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-zinc-500">불러오는 중…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
