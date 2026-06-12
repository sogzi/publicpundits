import type { LeaderboardEntry } from "@/types/database";

const BRAND = "#1D9E75";

function FormDot({ correct_score, correct_outcome }: {
  correct_score: boolean | null;
  correct_outcome: boolean | null;
}) {
  let bg    = "#E5E7EB";
  let title = "Incorrect";
  if (correct_score)        { bg = BRAND;     title = "Correct score (+3)"; }
  else if (correct_outcome) { bg = "#FCD34D"; title = "Correct outcome (+1)"; }
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: bg }}
      title={title}
    />
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg leading-none" title="1st">🥇</span>;
  if (rank === 2) return <span className="text-lg leading-none" title="2nd">🥈</span>;
  if (rank === 3) return <span className="text-lg leading-none" title="3rd">🥉</span>;
  return <span className="text-sm font-bold text-gray-500 tabular-nums w-6 text-center">{rank}</span>;
}

function Avatar({ name, isMe }: { name: string; isMe: boolean }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 uppercase"
      style={isMe
        ? { backgroundColor: BRAND, color: "#fff" }
        : { backgroundColor: "#F3F4F6", color: "#374151" }
      }
    >
      {(name ?? "?")[0]}
    </div>
  );
}

function LeaderboardRow({ entry, currentUserId }: { entry: LeaderboardEntry; currentUserId?: string }) {
  const isMe = entry.id === currentUserId;
  const form = (entry.recent_form ?? []).slice(0, 5);

  return (
    <tr
      className="border-b border-gray-50 last:border-0"
      style={isMe ? { backgroundColor: "#F0FDF4" } : undefined}
    >
      <td className="pl-4 pr-2 py-3 w-10">
        <div className="flex items-center justify-center">
          <RankBadge rank={entry.rank} />
        </div>
      </td>

      <td className="px-2 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={entry.username} isMe={isMe} />
          <div className="min-w-0">
            <p className={`text-sm font-semibold truncate ${isMe ? "text-emerald-700" : "text-gray-900"}`}>
              {entry.display_name ?? entry.username}
              {isMe && (
                <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-500">
                  You
                </span>
              )}
            </p>
            <p className="text-xs text-gray-400 truncate">@{entry.username}</p>
          </div>
        </div>
      </td>

      {/* Form dots */}
      <td className="px-2 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-1">
          {form.length > 0
            ? form.map((f, i) => (
                <FormDot key={i} correct_score={f.correct_score} correct_outcome={f.correct_outcome} />
              ))
            : <span className="text-xs text-gray-300">—</span>
          }
          {Array.from({ length: Math.max(0, 5 - form.length) }).map((_, i) => (
            <span key={`pad-${i}`} className="inline-block w-2.5 h-2.5 rounded-full bg-gray-100 flex-shrink-0" />
          ))}
        </div>
      </td>

      <td className="px-2 py-3 text-center hidden md:table-cell">
        <span className="text-sm font-semibold" style={{ color: BRAND }}>{entry.correct_scores ?? 0}</span>
      </td>

      <td className="px-2 py-3 text-center hidden md:table-cell">
        <span className="text-sm font-semibold text-yellow-500">{entry.correct_outcomes ?? 0}</span>
      </td>

      <td className="pr-4 pl-2 py-3 text-right">
        <span className={`text-base font-black tabular-nums ${isMe ? "text-emerald-600" : "text-gray-900"}`}>
          {entry.total_points}
        </span>
        <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
      </td>
    </tr>
  );
}

export function LeaderboardTable({
  entries,
  currentUserId,
  emptyMessage,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  emptyMessage?: React.ReactNode;
}) {
  if (!entries.length) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        {emptyMessage ?? "No data yet."}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="pl-4 pr-2 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide w-10">#</th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide">Player</th>
            <th className="px-2 py-2.5 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Form</th>
            <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell">✓ Scores</th>
            <th className="px-2 py-2.5 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell">~ Results</th>
            <th className="pr-4 pl-2 py-2.5 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wide">Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} currentUserId={currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
