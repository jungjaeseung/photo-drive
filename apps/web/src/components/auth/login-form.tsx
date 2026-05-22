"use client";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/paths";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const callbackUrl = searchParams.get("callbackUrl") ?? withBasePath("/");

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        id: id.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <h1 className="text-xl font-bold">Photo Drive</h1>
        <p className="mt-1 text-sm text-zinc-500">로그인이 필요합니다</p>
      </div>

      {registered && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          가입이 완료되었습니다. 로그인해 주세요.
        </p>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">아이디</span>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="username"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          required
        />
      </label>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "로그인"}
      </Button>
    </form>
  );
}
