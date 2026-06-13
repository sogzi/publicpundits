import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FIXTURES_SEED } from "@/lib/fixtures-data";
import { FixturesClient } from "@/components/fixtures/FixturesClient";

export const revalidate = 30;

export default async function FixturesPage() {
  const supabase = createClient();

  // Check if matches table is empty
  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  // If table is empty, nothing to do — sync-fixtures must be called to populate
  // (old static seed removed; real data comes from football-data.org via /api/sync-fixtures)

  // Delete any legacy static-seed rows that have no api_football_id
  // (these were inserted before the API integration and cause duplicate phantom fixtures)
  const admin = createAdminClient();
  await admin.from("matches").delete().is("api_football_id", null);

  // Fetch all matches ordered by kickoff time
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Fixtures</h1>
        <p className="text-sm text-gray-500 mt-1">
          All 104 FIFA World Cup 2026 matches · Times shown in your local timezone
        </p>
      </div>
      <FixturesClient matches={matches ?? []} />
    </div>
  );
}
