"use client";

import { useState, useEffect } from "react";
import type { Match } from "@/types/database";

const BRAND = "#1D9E75";

interface StatRow {
  label: string;
  format: "percent" | "number";
  values: [number, number];
}

interface StatsResponse {
  homeCode: string;
  awayCode: string;
  stats: StatRow[];
  notAvailable?: boolean;
  reason?: string;
  error?: string;
}

function ComparisonBar({
  label,
  homeValue,
  awayValue,
  format,
}: {
  label: string;
  homeValue: number;
  awayValue: number;
  format: "percent" | "number";
}) {
  const total = homeValue + awayValue;
  const homePct = total === 0 ? 50 : (homeValue / total) * 100;
  const awayPct = 100 - homePct;

  const fmt = (v: number) => (format === "percent" ? `${v}%` : String(v));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="font-bold text-gray-900 min-w-[28px]">{fmt(homeValue)}</span>
        <span className="text-gray-400 text-[11px] font-medium">{label}</span>
        <span className="font-bold text-gray-900 min-w-[28px] text-right">{fmt(awayValue)}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
        <div
          className="h-full rounded-l-full transition-all duration-700"
          style={{ width: `${homePct}%`, backgroundColor: BRAND }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-700"
          style={{ width: `${awayPct}%`, backgroundColor: "#f97316" }}
        />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-3 w-8 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-8 bg-gray-200 rounded" />
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function StatsTab({ match }: { match: Match }) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/match-stats?matchId=${match.id}`)
      .then((r) => r.json())
      .then((d: StatsResponse) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message ?? "Failed to load stats");
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [match.id]);

  if (loading) return <StatsSkeleton />;

  if (error) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-3xl">⚠️</p>
        <p className="text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  if (!data || data.notAvailable || data.error) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-3xl">📊</p>
        <p className="text-sm font-semibold text-gray-700">
          {match.status === "upcoming" ? "Stats available after kickoff" : "Stats not available for this match"}
        </p>
        {data?.reason === "no_livescore_id" && (
          <p className="text-xs text-gray-400">Live data link pending — check back shortly</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Legend */}
      <div className="flex justify-between text-xs font-bold mb-5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND }} />
          <span className="text-gray-700">{data.homeCode}</span>
        </div>
        <span className="text-gray-300 text-[11px] font-medium">MATCH STATS</span>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-700">{data.awayCode}</span>
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
        </div>
      </div>

      {/* Stat rows */}
      <div className="space-y-4">
        {data.stats.map((stat) => (
          <ComparisonBar
            key={stat.label}
            label={stat.label}
            homeValue={stat.values[0]}
            awayValue={stat.values[1]}
            format={stat.format}
          />
        ))}
      </div>
    </div>
  );
}
