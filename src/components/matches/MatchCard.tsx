import Link from "next/link";
import { formatKickoff } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Match } from "@/types/database";

interface Props {
  match: Match;
  userPrediction?: { home_score: number; away_score: number } | null;
}

const stageLabel: Record<Match["stage"], string> = {
  group:         "Group Stage",
  round_of_32:   "Round of 32",
  round_of_16:   "Round of 16",
  quarter_final: "Quarter-final",
  semi_final:    "Semi-final",
  third_place:   "3rd Place",
  final:         "Final",
};

export function MatchCard({ match, userPrediction }: Props) {
  return (
    <Link href={`/fan-prediction/${match.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">{stageLabel[match.stage]}{match.group_name ? ` · Group ${match.group_name}` : ""}</span>
            {match.status === "live" && <Badge variant="live">LIVE</Badge>}
            {match.status === "finished" && <Badge variant="secondary">FT</Badge>}
            {match.status === "upcoming" && <Badge variant="outline">Upcoming</Badge>}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-right">
              <p className="font-bold text-lg">{match.home_team_code}</p>
              <p className="text-xs text-gray-500 truncate">{match.home_team}</p>
            </div>

            <div className="text-center min-w-[80px]">
              {match.status === "upcoming" ? (
                <p className="text-sm font-medium text-gray-500">vs</p>
              ) : (
                <p className="text-2xl font-black">
                  {match.home_score ?? "-"} – {match.away_score ?? "-"}
                </p>
              )}
              {userPrediction && (
                <p className="text-xs text-emerald-600 mt-1">
                  You: {userPrediction.home_score}–{userPrediction.away_score}
                </p>
              )}
            </div>

            <div className="flex-1 text-left">
              <p className="font-bold text-lg">{match.away_team_code}</p>
              <p className="text-xs text-gray-500 truncate">{match.away_team}</p>
            </div>
          </div>

          {match.status === "upcoming" && (
            <p className="text-center text-xs text-gray-400 mt-3">{formatKickoff(match.kickoff_at)}</p>
          )}
          {match.venue && (
            <p className="text-center text-xs text-gray-400 mt-1">{match.venue}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
