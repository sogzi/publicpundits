"use client";

import type { MatchEvent } from "@/types/database";

interface Props {
  events: MatchEvent[];
  homeCode: string;
  awayCode: string;
}

function eventIcon(type: MatchEvent["type"]) {
  switch (type) {
    case "GOAL":          return "⚽";
    case "OWN GOAL":     return "⚽";
    case "PENALTY GOAL": return "⚽";
    case "YELLOW CARD":  return "🟨";
    case "RED CARD":     return "🟥";
    case "SUBSTITUTION": return "🔄";
  }
}

function minuteLabel(e: MatchEvent) {
  return e.injury_time ? `${e.minute}+${e.injury_time}'` : `${e.minute}'`;
}

function HomeEvent({ event }: { event: MatchEvent }) {
  const isGoal = event.type === "GOAL" || event.type === "PENALTY GOAL" || event.type === "OWN GOAL";
  const isSub  = event.type === "SUBSTITUTION";

  return (
    <div className="text-right pr-2">
      {isGoal && (
        <p className="text-sm font-bold text-gray-900 leading-tight">
          {event.player}
          {event.type === "OWN GOAL" && <span className="text-[10px] text-red-500 ml-1">(OG)</span>}
          {event.type === "PENALTY GOAL" && <span className="text-[10px] text-gray-400 ml-1">(P)</span>}
        </p>
      )}
      {isGoal && event.assist && (
        <p className="text-[10px] text-gray-400">Assist: {event.assist}</p>
      )}
      {isSub && (
        <p className="text-xs text-gray-500 leading-tight">
          <span className="text-emerald-600">▲ {event.player_in}</span>
          <br />
          <span className="text-red-400">▼ {event.player_out}</span>
        </p>
      )}
      {event.type === "YELLOW CARD" && (
        <p className="text-sm text-gray-700">{event.player}</p>
      )}
      {event.type === "RED CARD" && (
        <p className="text-sm font-bold text-red-600">{event.player}</p>
      )}
    </div>
  );
}

function AwayEvent({ event }: { event: MatchEvent }) {
  const isGoal = event.type === "GOAL" || event.type === "PENALTY GOAL" || event.type === "OWN GOAL";
  const isSub  = event.type === "SUBSTITUTION";

  return (
    <div className="text-left pl-2">
      {isGoal && (
        <p className="text-sm font-bold text-gray-900 leading-tight">
          {event.player}
          {event.type === "OWN GOAL" && <span className="text-[10px] text-red-500 ml-1">(OG)</span>}
          {event.type === "PENALTY GOAL" && <span className="text-[10px] text-gray-400 ml-1">(P)</span>}
        </p>
      )}
      {isGoal && event.assist && (
        <p className="text-[10px] text-gray-400">Assist: {event.assist}</p>
      )}
      {isSub && (
        <p className="text-xs text-gray-500 leading-tight">
          <span className="text-emerald-600">▲ {event.player_in}</span>
          <br />
          <span className="text-red-400">▼ {event.player_out}</span>
        </p>
      )}
      {event.type === "YELLOW CARD" && (
        <p className="text-sm text-gray-700">{event.player}</p>
      )}
      {event.type === "RED CARD" && (
        <p className="text-sm font-bold text-red-600">{event.player}</p>
      )}
    </div>
  );
}

export function MatchTimeline({ events, homeCode, awayCode }: Props) {
  // Filter to only key events (goals, cards) for the primary view; subs in a collapsible
  const keyEvents  = events.filter((e) => e.type !== "SUBSTITUTION");
  const subs       = events.filter((e) => e.type === "SUBSTITUTION");
  const sorted     = [...events].sort((a, b) => a.minute - b.minute || (a.injury_time ?? 0) - (b.injury_time ?? 0));
  const keySorted  = sorted.filter((e) => e.type !== "SUBSTITUTION");
  const subsSorted = sorted.filter((e) => e.type === "SUBSTITUTION");

  if (events.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
      <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
        <span>{homeCode}</span>
        <span>MATCH EVENTS</span>
        <span>{awayCode}</span>
      </div>

      {/* Key events */}
      {keySorted.map((event, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          {event.team_side === "home" ? <HomeEvent event={event} /> : <div />}
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-14">
            <span className="text-base leading-none">{eventIcon(event.type)}</span>
            <span className="text-[10px] text-gray-400 font-medium">{minuteLabel(event)}</span>
          </div>
          {event.team_side === "away" ? <AwayEvent event={event} /> : <div />}
        </div>
      ))}

      {/* Substitutions collapsible */}
      {subsSorted.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-400 font-medium select-none pt-1 border-t border-gray-50">
            Substitutions ({subsSorted.length})
          </summary>
          <div className="mt-2 space-y-2">
            {subsSorted.map((event, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                {event.team_side === "home" ? <HomeEvent event={event} /> : <div />}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0 w-14">
                  <span className="text-base leading-none">{eventIcon(event.type)}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{minuteLabel(event)}</span>
                </div>
                {event.team_side === "away" ? <AwayEvent event={event} /> : <div />}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
