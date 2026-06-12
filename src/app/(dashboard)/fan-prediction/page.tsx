import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FanPredictionClient } from "@/components/fan-prediction/FanPredictionClient";

export const revalidate = 60;

export default async function FanPredictionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all matches ordered by kickoff
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  // Fetch this user's predictions so cards can show "predicted" state
  const { data: predictions } = user
    ? await supabase
        .from("score_predictions")
        .select("match_id, home_score, away_score")
        .eq("user_id", user.id)
    : { data: [] };

  const predMap = Object.fromEntries(
    (predictions ?? []).map((p) => [p.match_id, p])
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Fan Predictions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Predict scores for all 104 FIFA World Cup 2026 matches
        </p>
      </div>
      <FanPredictionClient matches={matches ?? []} predMap={predMap} />
    </div>
  );
}
