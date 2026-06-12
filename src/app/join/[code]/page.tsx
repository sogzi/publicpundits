import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function JoinPage({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const code = params.code.toUpperCase();

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → send to auth, store return URL
  if (!user) {
    redirect(`/login?next=/join/${code}`);
  }

  // Look up the league by invite code
  const { data: league } = await (supabase as any)
    .from("leagues")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  if (!league) {
    // Invalid code — send to leagues with error param
    redirect("/leagues?error=invalid_code");
  }

  // Already a member? Just redirect
  const { data: existing } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    await (supabase.from("league_members") as any)
      .insert({ league_id: league.id, user_id: user.id });
  }

  redirect(`/leagues/${league.id}`);
}
