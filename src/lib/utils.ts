import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKickoff(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function predictionsLocked(match: { predictions_locked_at: string | null; status: string }) {
  if (match.status !== "upcoming") return true;
  if (!match.predictions_locked_at) return false;
  return new Date() >= new Date(match.predictions_locked_at);
}

export function scoreOutcome(home: number, away: number): "home" | "draw" | "away" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function calcScorePredictionPoints(
  predicted: { home: number; away: number },
  actual: { home: number; away: number }
): number {
  if (predicted.home === actual.home && predicted.away === actual.away) return 3;
  if (scoreOutcome(predicted.home, predicted.away) === scoreOutcome(actual.home, actual.away)) return 1;
  return 0;
}
