import { createClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/matches/MatchCard";
import type { Match } from "@/types/database";

const stageOrder = ["group", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];
const stageLabel: Record<string, string> = {
  group: "Group Stage", round_of_16: "Round of 16", quarter_final: "Quarter-finals",
  semi_final: "Semi-finals", third_place: "3rd Place Play-off", final: "Final",
};

export const revalidate = 60;

export default async function MatchesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  const { data: predictions } = user
    ? await supabase.from("score_predictions").select("match_id, home_score, away_score").eq("user_id", user.id)
    : { data: [] };

  const predMap = Object.fromEntries((predictions ?? []).map((p) => [p.match_id, p]));

  const grouped = (matches ?? []).reduce<Record<string, Match[]>>((acc, m) => {
    acc[m.stage] = [...(acc[m.stage] ?? []), m];
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Fixtures</h1>
      {stageOrder.filter((s) => grouped[s]?.length).map((stage) => (
        <section key={stage}>
          <h2 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-300">{stageLabel[stage]}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[stage].map((match) => (
              <MatchCard key={match.id} match={match} userPrediction={predMap[match.id]} />
            ))}
          </div>
        </section>
      ))}
      {!matches?.length && (
        <p className="text-center text-gray-500 py-16">No fixtures scheduled yet.</p>
      )}
    </div>
  );
}
