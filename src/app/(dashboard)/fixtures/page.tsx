import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FIXTURES_SEED } from "@/lib/fixtures-data";
import { FixturesClient } from "@/components/fixtures/FixturesClient";

export const revalidate = 60;

export default async function FixturesPage() {
  const supabase = createClient();

  // Check if matches table is empty
  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  // Auto-seed all 64 fixtures if empty
  if (count === 0) {
    const admin = createAdminClient();
    const { error } = await admin.from("matches").insert(FIXTURES_SEED as any);
    if (error) {
      console.error("Seed error:", error.message);
    }
  }

  // Fetch all matches
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Fixtures</h1>
        <p className="text-sm text-gray-500 mt-1">
          All 64 FIFA World Cup 2026 matches · Times shown in your local timezone
        </p>
      </div>
      <FixturesClient matches={matches ?? []} />
    </div>
  );
}
