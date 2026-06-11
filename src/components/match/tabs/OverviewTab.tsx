"use client";

import Link from "next/link";
import type { Match, PlatformPrediction, ScorePrediction } from "@/types/database";

const BRAND = "#1D9E75";

interface Props {
  match: Match;
  platformPrediction: PlatformPrediction | null;
  userScorePrediction: ScorePrediction | null;
  userId: string | null;
  onGoToPredict: () => void;
}

function ScoreDisplay({ home, away, label }: { home: number; away: number; label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <span className="text-4xl font-black text-gray-900">{home}</span>
      <span className="text-2xl font-bold text-gray-300">–</span>
      <span className="text-4xl font-black text-gray-900">{away}</span>
      {label && <span className="text-xs text-gray-400 ml-1">{label}</span>}
    </div>
  );
}

export function OverviewTab({ match, platformPrediction, userScorePrediction, userId, onGoToPredict }: Props) {
  const isFinished = match.status === "finished";

  return (
    <div className="space-y-4">
      {/* Points awarded banner (finished + user predicted) */}
      {isFinished && userScorePrediction && userScorePrediction.points_awarded !== null && (
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: userScorePrediction.points_awarded > 0 ? "#ecfdf5" : "#f9fafb", border: "1px solid", borderColor: userScorePrediction.points_awarded > 0 ? "#6ee7b7" : "#e5e7eb" }}
        >
          <p className="text-sm text-gray-500">Points earned</p>
          <p className="text-3xl font-black mt-0.5" style={{ color: userScorePrediction.points_awarded > 0 ? BRAND : "#9ca3af" }}>
            +{userScorePrediction.points_awarded}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Platform prediction card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <div>
              <h3 className="font-bold text-sm text-gray-900">
                {match.status === "upcoming" ? "Our Prediction" : "Our Pre-match Prediction"}
              </h3>
              {match.status !== "upcoming" && (
                <p className="text-[10px] text-gray-400 mt-0.5">Generated before kickoff</p>
              )}
            </div>
          </div>

          {platformPrediction ? (
            <>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span className="font-medium text-gray-600">{match.home_team_code}</span>
                <span className="font-medium text-gray-600">{match.away_team_code}</span>
              </div>
              <ScoreDisplay home={platformPrediction.home_score} away={platformPrediction.away_score} />

              {/* Confidence bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Confidence</span>
                  <span className="font-semibold text-gray-700">{platformPrediction.confidence}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${platformPrediction.confidence}%`, backgroundColor: BRAND }}
                  />
                </div>
              </div>

              {/* One-line reasoning */}
              <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-3">
                {platformPrediction.reasoning.split(".")[0]}.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No prediction generated yet.</p>
          )}
        </div>

        {/* User prediction card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h3 className="font-bold text-sm text-gray-900">Your Prediction</h3>
          </div>

          {!userId ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">Sign in to make a prediction</p>
              <Link
                href="/login"
                className="text-sm font-semibold px-4 py-2 rounded-lg"
                style={{ backgroundColor: BRAND, color: "#fff" }}
              >
                Sign in
              </Link>
            </div>
          ) : userScorePrediction ? (
            <>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span className="font-medium text-gray-600">{match.home_team_code}</span>
                <span className="font-medium text-gray-600">{match.away_team_code}</span>
              </div>
              <ScoreDisplay home={userScorePrediction.home_score} away={userScorePrediction.away_score} />
              {isFinished && userScorePrediction.points_awarded !== null && (
                <p className="text-center text-xs mt-2 font-bold" style={{ color: userScorePrediction.points_awarded > 0 ? BRAND : "#9ca3af" }}>
                  {userScorePrediction.points_awarded > 0 ? `+${userScorePrediction.points_awarded} pts` : "0 pts"}
                </p>
              )}
              {!isFinished && (
                <button
                  onClick={onGoToPredict}
                  className="mt-3 w-full text-xs font-semibold underline text-gray-400 hover:text-gray-600"
                >
                  Edit prediction →
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-3">You haven&apos;t predicted this match yet</p>
              {match.status === "upcoming" ? (
                <button
                  onClick={onGoToPredict}
                  className="text-sm font-semibold px-4 py-2 rounded-lg"
                  style={{ backgroundColor: BRAND, color: "#fff" }}
                >
                  Make a prediction →
                </button>
              ) : (
                <p className="text-xs text-gray-300">Predictions closed</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full reasoning accordion (if platform pred exists) */}
      {platformPrediction && (
        <details className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-gray-700 select-none">
            Full analysis
          </summary>
          <p className="mt-2 text-gray-600 leading-relaxed">{platformPrediction.reasoning}</p>
        </details>
      )}
    </div>
  );
}
