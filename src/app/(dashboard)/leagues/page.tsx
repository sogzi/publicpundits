import { createClient } from "@/lib/supabase/server";
import { LeaguesClient } from "./LeaguesClient";

export default async function LeaguesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, invite_code, description, owner_id, is_public)")
    .eq("user_id", user.id);

  const { data: owned } = await supabase
    .from("leagues")
    .select("*")
    .eq("owner_id", user.id);

  return <LeaguesClient userId={user.id} memberships={memberships ?? []} owned={owned ?? []} />;
}
