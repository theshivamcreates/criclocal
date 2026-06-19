"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Smartphone, Tv } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OverHistory } from "@/components/OverHistory";
import { Scoreboard } from "@/components/Scoreboard";
import { subscribeToMatch } from "@/lib/firebaseMatches";
import {
  applyBall,
  buildNewMatch,
  endCurrentOver,
  getCurrentInnings,
} from "@/lib/matchUtils";
import type { BallEvent, Match } from "@/types/match";

function buildDemoMatch() {
  let match = buildNewMatch(
    "Mumbai Indians",
    "Chennai Super Kings",
    20,
    "team1",
    "bat",
    "demo-user",
  );
  (["1", "4", "0", "W", "2", "6", "1", "WD", "4"] as BallEvent[]).forEach(
    (event) => {
      match = {
        ...match,
        innings: { "1": applyBall(getCurrentInnings(match), event) },
      };
    },
  );
  match = {
    ...match,
    innings: { "1": endCurrentOver(getCurrentInnings(match)) },
  };
  (["0", "1", "4"] as BallEvent[]).forEach((event) => {
    match = {
      ...match,
      innings: { "1": applyBall(getCurrentInnings(match), event) },
    };
  });
  return match;
}

export default function LivePage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [match, setMatch] = useState<Match | null>(
    matchId === "demo" ? buildDemoMatch() : null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (matchId === "demo") return;
    try {
      return subscribeToMatch(matchId, setMatch);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to load match.",
      );
    }
  }, [matchId]);

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-primary">
              Public scoreboard
            </p>
            <h1 className="text-2xl font-black">
              {match
                ? `${match.meta.team1} vs ${match.meta.team2}`
                : "Loading match"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              className="flex items-center gap-1 rounded-md border border-outline bg-surface px-3 py-2 text-sm font-black"
              href={`/match/${matchId}/score`}
            >
              <Smartphone size={16} /> Score
            </Link>
            <Link
              className="flex items-center gap-1 rounded-md border border-outline bg-surface px-3 py-2 text-sm font-black"
              href={`/match/${matchId}/overlay`}
            >
              <Tv size={16} /> Overlay
            </Link>
          </div>
        </div>
        {match ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <Scoreboard match={match} />
            <aside className="rounded-lg border border-outline bg-surface p-4 shadow-sm">
              <h2 className="mb-3 font-black">Completed overs</h2>
              <OverHistory
                history={getCurrentInnings(match).overHistory ?? []}
              />
            </aside>
          </div>
        ) : (
          <div className="rounded-lg border border-outline bg-surface p-8 text-center text-on-surface-variant">
            {error || "Waiting for live data..."}
          </div>
        )}
      </section>
    </AppShell>
  );
}
