"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/fan-prediction";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl">
      <h2 className="text-xl font-bold mb-6">Sign in</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-sm text-center text-gray-500 mt-4">
        No account?{" "}
        <Link href="/register" className="text-emerald-600 font-medium hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-gray-900 to-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Trophy className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h1 className="text-3xl font-black text-white">PublicPundits</h1>
          <p className="text-gray-400 mt-1">The World Cup fan arena</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-2xl p-8 shadow-xl h-64 animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
