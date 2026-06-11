import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { predictionsLocked } from "@/lib/utils";
import { ScorePredictionForm } from "@/components/predictions/ScorePredictionForm";
import { LineupPredictionForm } from "@/components/predictions/LineupPredictionForm";
import { PlayerRatingPanel } from "@/components/ratings/PlayerRatingPanel";
import { PotgVotePanel } from "@/components/ratings/PotgVotePanel";
import { MatchChat } from "@/components/chat/MatchChat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKickoff } from "@/lib/utils";
import type { LineupPlayer } from "@/types/database";

export const revalidate = 30;

export default async function MatchPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: match } = await supabase.from("matches").select("*").eq("id", params.id).single();
  if (!match) notFound();

  const locked = predictionsLocked(match);

  const [
    { data: scorePred },
    { data: homeLineup },
    { data: awayLineup },
    { data: ratingsRaw },
    { data: potgRaw },
    { data: userPotg },
    { data: chatMessages },
  ] = await Promise.all([
    supabase.from("score_predictions").select("*").eq("match_id", match.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("lineup_predictions").select("*").eq("match_id", match.id).eq("user_id", user.id).eq("team_code", match.home_team_code).maybeSingle(),
    supabase.from("lineup_predictions").select("*").eq("match_id", match.id).eq("user_id", user.id).eq("team_code", match.away_team_code).maybeSingle(),
    supabase.from("player_ratings").select("player_name, team_code, rating").eq("match_id", match.id),
    supabase.from("potg_votes").select("player_name, team_code").eq("match_id", match.id),
    supabase.from("potg_votes").select("player_name").eq("match_id", match.id).eq("user_id", user.id).maybeSingle(),
    supabase.from("chat_messages").select("*, profiles(username, display_name, avatar_url)").eq("match_id", match.id).order("created_at", { ascending: true }).limit(100),
  ]);

  // Aggregate ratings
  const ratingsByPlayer: Record<string, { team_code: string; sum: number; count: number; userRating?: number }> = {};
  for (const r of ratingsRaw ?? []) {
    if (!ratingsByPlayer[r.player_name]) ratingsByPlayer[r.player_name] = { team_code: r.team_code, sum: 0, count: 0 };
    ratingsByPlayer[r.player_name].sum += r.rating;
    ratingsByPlayer[r.player_name].count++;
  }

  const playerList = Object.entries(ratingsByPlayer).map(([name, v]) => ({
    name,
    team_code: v.team_code,
    avgRating: v.sum / v.count,
    totalVotes: v.count,
  }));

  // Aggregate POTG votes
  const potgCounts: Record<string, { team_code: string; votes: number }> = {};
  for (const v of potgRaw ?? []) {
    if (!potgCounts[v.player_name]) potgCounts[v.player_name] = { team_code: v.team_code, votes: 0 };
    potgCounts[v.player_name].votes++;
  }
  const potgPlayers = Object.entries(potgCounts).map(([name, v]) => ({ name, ...v }));

  return (
    <div className="space-y-6">
      {/* Match header */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              {match.status === "live" && <Badge variant="live">LIVE</Badge>}
              {match.status === "finished" && <Badge variant="secondary">Full Time</Badge>}
              {match.status === "upcoming" && <Badge variant="outline">Upcoming</Badge>}
            </div>
            <div className="flex items-center justify-center gap-6 py-4">
              <div className="text-center">
                <p className="text-3xl font-black">{match.home_team_code}</p>
                <p className="text-sm text-gray-500">{match.home_team}</p>
              </div>
              <div className="text-center">
                {match.status === "upcoming" ? (
                  <p className="text-xl text-gray-400 font-bold">vs</p>
                ) : (
                  <p className="text-4xl font-black">{match.home_score} – {match.away_score}</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-3xl font-black">{match.away_team_code}</p>
                <p className="text-sm text-gray-500">{match.away_team}</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">{formatKickoff(match.kickoff_at)}</p>
            {match.venue && <p className="text-xs text-gray-400">{match.venue}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score prediction */}
        <Card>
          <CardContent className="pt-6">
            <ScorePredictionForm
              match={match}
              userId={user.id}
              existing={scorePred}
              locked={locked}
            />
          </CardContent>
        </Card>

        {/* Chat */}
        <Card>
          <CardContent className="pt-6">
            <MatchChat
              matchId={match.id}
              userId={user.id}
              initialMessages={(chatMessages ?? []) as any}
            />
          </CardContent>
        </Card>

        {/* Home lineup prediction */}
        <Card>
          <CardContent className="pt-6">
            <LineupPredictionForm
              match={match}
              userId={user.id}
              teamCode={match.home_team_code}
              teamName={match.home_team}
              existingPlayers={homeLineup?.players as LineupPlayer[]}
              locked={locked}
            />
          </CardContent>
        </Card>

        {/* Away lineup prediction */}
        <Card>
          <CardContent className="pt-6">
            <LineupPredictionForm
              match={match}
              userId={user.id}
              teamCode={match.away_team_code}
              teamName={match.away_team}
              existingPlayers={awayLineup?.players as LineupPlayer[]}
              locked={locked}
            />
          </CardContent>
        </Card>

        {/* Player ratings */}
        {match.status === "finished" && playerList.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <PlayerRatingPanel matchId={match.id} userId={user.id} players={playerList} />
            </CardContent>
          </Card>
        )}

        {/* POTG voting */}
        {match.status !== "upcoming" && potgPlayers.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <PotgVotePanel
                matchId={match.id}
                userId={user.id}
                players={potgPlayers}
                userVote={userPotg?.player_name}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
