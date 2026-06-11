import { createClient } from "@/lib/supabase/server";
import { BracketPredictor } from "@/components/bracket/BracketPredictor";

export default async function BracketPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("bracket_predictions")
    .select("bracket")
    .eq("user_id", user.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bracket = (existing as any)?.bracket ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Tournament Bracket</h1>
        <p className="text-gray-500 text-sm mt-1">Predict the full knockout bracket and tournament winner</p>
      </div>
      <BracketPredictor userId={user.id} existing={bracket} />
    </div>
  );
}
