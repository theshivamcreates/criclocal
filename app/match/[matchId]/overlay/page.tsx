"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IPLOverlay } from "@/components/IPLOverlay";
import { subscribeToMatch } from "@/lib/firebaseMatches";
import { applyBall, buildNewMatch, getCurrentInnings } from "@/lib/matchUtils";
import type { BallEvent, Match } from "@/types/match";

function demoOverlayMatch() {
  let match = buildNewMatch(
    "Royal Challengers Bengaluru",
    "Chennai Super Kings",
    20,
    "team1",
    "bat",
    "demo-user",
    undefined,
    undefined,
    ["Kohli", "Faf", "Patidar", "Maxwell", "Green"],
    ["Ruturaj", "Rachin", "Dube"],
    "#e50000",
    "#ffcb05",
  );

  const events = ["1", "4", "0", "W", "2", "6"] as BallEvent[];
  for (const event of events) {
    match = {
      ...match,
      innings: { "1": applyBall(getCurrentInnings(match), event) },
    };
  }

  // Set specific batsmen/bowler for demo matching the screenshot
  const innings = match.innings["1"];
  innings.batsmen["striker"] = {
    name: "पाटीदार",
    runs: 41,
    balls: 22,
    fours: 3,
    sixes: 2,
    status: "batting",
  };
  innings.batsmen["nonStriker"] = {
    name: "ग्रीन",
    runs: 23,
    balls: 12,
    fours: 1,
    sixes: 1,
    status: "batting",
  };
  innings.bowlers["bowler"] = {
    name: "Mustafizur",
    overs: 2,
    balls: 12,
    runs: 32,
    wickets: 0,
    wides: 0,
    noBalls: 0,
  };
  innings.runs = 171;
  innings.wickets = 2;
  innings.balls = 17 * 6; // 17 overs

  return match;
}

export default function OverlayPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [match, setMatch] = useState<Match | null>(
    matchId === "demo" ? demoOverlayMatch() : null,
  );

  useEffect(() => {
    document.body.classList.add("overlay-page");
    if (matchId === "demo") return;
    try {
      return subscribeToMatch(matchId, setMatch);
    } catch {
      return;
    }
  }, [matchId]);

  if (!match) return null;

  return (
    <main className="flex min-h-screen items-end justify-center bg-transparent p-12">
      <div className="w-full max-w-5xl">
        <IPLOverlay match={match} />
      </div>
    </main>
  );
}
