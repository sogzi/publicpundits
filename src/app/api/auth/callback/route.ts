import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/fan-prediction";
  const error = searchParams.get("error");

  // Supabase redirects errors back here too (e.g. otp_expired)
  if (error) {
    const desc = searchParams.get("error_description") ?? error;
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(desc)}`
    );
  }

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // next must start with / to prevent open-redirect
  const safeNext = next.startsWith("/") ? next : "/fan-prediction";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
