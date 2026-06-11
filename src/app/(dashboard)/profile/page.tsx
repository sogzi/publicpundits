import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./ProfileClient";
import { notFound } from "next/navigation";

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) notFound();

  const { data: recentPreds } = await supabase
    .from("score_predictions")
    .select("*, matches(home_team_code, away_team_code, home_score, away_score, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return <ProfileClient profile={profile} recentPredictions={recentPreds ?? []} />;
}
