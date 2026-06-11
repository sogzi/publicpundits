import { Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/types/database";
import { cn } from "@/lib/utils";

interface Props {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardTable({ entries, currentUserId }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 w-12">#</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Player</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className={cn(
                "transition-colors",
                entry.id === currentUserId ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-900"
              )}
            >
              <td className="px-4 py-3">
                {entry.rank === 1 && <Medal className="h-5 w-5 text-yellow-500" />}
                {entry.rank === 2 && <Medal className="h-5 w-5 text-gray-400" />}
                {entry.rank === 3 && <Medal className="h-5 w-5 text-amber-600" />}
                {entry.rank! > 3 && <span className="text-gray-500">{entry.rank}</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                    {(entry.username ?? "?")[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{entry.display_name ?? entry.username}</p>
                    <p className="text-xs text-gray-400">@{entry.username}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                {entry.total_points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
