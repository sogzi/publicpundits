"use client";

import { useState } from "react";
import { MatchHeader } from "./MatchHeader";
import { OverviewTab } from "./tabs/OverviewTab";
import { PredictTab }  from "./tabs/PredictTab";
import { LineupsTab }  from "./tabs/LineupsTab";
import { RateTab }     from "./tabs/RateTab";
import { VoteTab }     from "./tabs/VoteTab";
import { BanterTab }   from "./tabs/BanterTab";
import type {
  Match, PlatformPrediction, ScorePrediction,
  LineupPlayer, SquadPlayer,
} from "@/types/database";

const BRAND = "#1D9E75";

interface ConfirmedLineup {
  team_code: string;
  team_name: string;
  formation: string | null;
  start_xi: any;
  substitutes: any;
}

interface Player {
  name: string;
  team_code: string;
  position: string;
  shirt: number;
}

interface RatingAgg {
  [playerName: string]: { team_code: string; sum: number; count: number };
}

interface Props {
  match: Match;
  userId: string | null;
  platformPrediction: PlatformPrediction | null;
  userScorePrediction: ScorePrediction | null;
  homeLineupPrediction: LineupPlayer[] | null;
  awayLineupPrediction: LineupPlayer[] | null;
  confirmedLineups: ConfirmedLineup[];
  homeSquad: SquadPlayer[];
  awaySquad: SquadPlayer[];
  chatMessages: any[];
  ratingAgg: RatingAgg;
  userRatingMap: Record<string, number>;
  potgAgg: Record<string, { team_code: string; votes: number }>;
  userPotgVote: string | null;
  allPlayers: Player[];
}

type TabId = "overview" | "predict" | "lineups" | "rate" | "vote" | "banter";

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
  show: boolean;
}

export function MatchPageClient({
  match, userId,
  platformPrediction, userScorePrediction,
  homeLineupPrediction, awayLineupPrediction,
  confirmedLineups, homeSquad, awaySquad,
  chatMessages, ratingAgg, userRatingMap,
  potgAgg, userPotgVote, allPlayers,
}: Props) {
  const finished = match.status === "finished";
  const upcoming = match.status === "upcoming";

  const TABS: Tab[] = [
    { id: "overview", label: "Overview", emoji: "📊", show: true },
    { id: "predict",  label: "Predict",  emoji: "🎯", show: upcoming },
    { id: "lineups",  label: "Lineups",  emoji: "📋", show: true },
    { id: "rate",     label: "Rate",     emoji: "⭐", show: finished },
    { id: "vote",     label: "POTG",     emoji: "🏆", show: finished },
    { id: "banter",   label: "Banter",   emoji: "💬", show: true },
  ].filter((t) => t.show) as Tab[];

  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Ensure active tab is valid (e.g. page loaded on predict tab but match finished)
  const validTabs = TABS.map((t) => t.id);
  const currentTab: TabId = validTabs.includes(activeTab) ? activeTab : "overview";

  function renderTab() {
    switch (currentTab) {
      case "overview":
        return (
          <OverviewTab
            match={match}
            platformPrediction={platformPrediction}
            userScorePrediction={userScorePrediction}
            userId={userId}
            onGoToPredict={() => setActiveTab("predict")}
          />
        );
      case "predict":
        return (
          <PredictTab
            match={match}
            userId={userId}
            existing={userScorePrediction}
            homeLineupPlayers={homeLineupPrediction}
            awayLineupPlayers={awayLineupPrediction}
            homeSquad={homeSquad}
            awaySquad={awaySquad}
          />
        );
      case "lineups":
        return <LineupsTab match={match} confirmedLineups={confirmedLineups} />;
      case "rate":
        return (
          <RateTab
            match={match}
            userId={userId}
            players={allPlayers}
            ratingAgg={ratingAgg}
            userRatingMap={userRatingMap}
          />
        );
      case "vote":
        return (
          <VoteTab
            match={match}
            userId={userId}
            players={allPlayers}
            potgAgg={potgAgg}
            userVote={userPotgVote}
          />
        );
      case "banter":
        return (
          <BanterTab
            matchId={match.id}
            userId={userId}
            initialMessages={chatMessages}
          />
        );
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-8">
      {/* Persistent match header */}
      <MatchHeader match={match} />

      {/* Desktop tab bar */}
      <div className="hidden md:flex gap-1 mb-6 bg-gray-50 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
            style={currentTab === tab.id
              ? { backgroundColor: BRAND, color: "#fff" }
              : { color: "#6b7280" }
            }
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {renderTab()}
      </div>

      {/* Mobile fixed bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors"
                style={isActive ? { color: BRAND } : { color: "#9ca3af" }}
              >
                <span className="text-lg leading-none">{tab.emoji}</span>
                <span className="text-[10px] font-semibold">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-0.5 rounded-full" style={{ backgroundColor: BRAND }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
