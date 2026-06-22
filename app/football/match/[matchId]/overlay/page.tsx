"use client";

import { useEffect, useState, use } from "react";
import { subscribeToFootballMatch } from "@/lib/firebaseFootball";
import type { FootballMatch } from "@/types/football";

export default function FootballOverlayPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const [match, setMatch] = useState<FootballMatch | null>(null);

  // Local timer state for live UI updates
  const [localSeconds, setLocalSeconds] = useState(0);

  useEffect(() => {
    return subscribeToFootballMatch(matchId, setMatch);
  }, [matchId]);

  useEffect(() => {
    if (!match) return;

    let interval: NodeJS.Timeout;
    if (match.timer.isRunning) {
      // If timer is running, calculate actual elapsed time
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - match.timer.lastUpdated) / 1000);
        setLocalSeconds(match.timer.seconds + diff);
      }, 500);
    } else {
      setLocalSeconds(match.timer.seconds);
    }

    return () => clearInterval(interval);
  }, [match?.timer.isRunning, match?.timer.seconds, match?.timer.lastUpdated]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!match) return null;

  return (
    <div className="flex h-screen w-screen items-end justify-start bg-transparent p-12 overflow-hidden">
      {/* 
 Scoreboard Container 
 Using precise grid dimensions to replicate the exact look
 */}
      <div
        className="flex overflow-hidden shadow-2xl"
        style={{
          width: "480px",
          height: "140px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* LEFT BLOCK: Logo & Timer */}
        <div className="flex flex-col w-[35%] h-full">
          {/* Top Half (Red): Logo Placeholder */}
          <div className="h-1/2 w-full bg-[#ed1c24] flex items-center justify-center relative">
            {/*"X" Graphic Placeholder */}
            <div className="absolute font-black text-5xl flex select-none">
              <span className="text-white transform translate-x-1">X</span>
              <span className="text-black transform -translate-x-1">X</span>
            </div>
            {/* The exact requested design shows an intertwined X. A simple CSS proxy for now: */}
            <div className="z-10 font-black text-5xl italic tracking-tighter flex items-center justify-center">
              <span className="text-white relative left-1 z-20">X</span>
              <span className="text-black relative right-1 z-10">X</span>
            </div>
          </div>

          {/* Bottom Half (White): Timer */}
          <div className="h-1/2 w-full bg-surface flex items-center justify-center border-t-2 border-[#ed1c24]">
            <span
              className="font-black text-4xl text-black tracking-tight"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatTime(localSeconds)}
            </span>
          </div>
        </div>

        {/* CENTER BLOCK: Team Logos (Black Background) */}
        <div className="flex flex-col w-[35%] h-full bg-black py-1">
          {/* Team 1 Logo */}
          <div className="h-1/2 w-full flex items-center justify-center px-2">
            {match.meta.team1Logo ? (
              <img
                src={match.meta.team1Logo}
                alt=""
                className="h-[90%] object-contain"
              />
            ) : (
              <div
                className="h-[90%] w-[90%] rounded-full flex items-center justify-center text-white font-black text-sm border-2 px-2 text-center overflow-hidden break-all leading-none"
                style={{ borderColor: match.meta.team1Color || "#fff" }}
              >
                {match.meta.team1.toUpperCase()}
              </div>
            )}
          </div>
          {/* Team 2 Logo */}
          <div className="h-1/2 w-full flex items-center justify-center px-2">
            {match.meta.team2Logo ? (
              <img
                src={match.meta.team2Logo}
                alt=""
                className="h-[90%] object-contain"
              />
            ) : (
              <div
                className="h-[90%] w-[90%] rounded-full flex items-center justify-center text-white font-black text-sm border-2 px-2 text-center overflow-hidden break-all leading-none"
                style={{ borderColor: match.meta.team2Color || "#fff" }}
              >
                {match.meta.team2.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT BLOCK: Scores (White Background) */}
        <div className="flex flex-col w-[30%] h-full bg-surface relative pl-2">
          {/* Team 1 Score */}
          <div className="h-[49%] w-full flex items-center justify-center">
            <span className="font-black text-5xl text-black">
              {match.score.team1}
            </span>
          </div>

          {/* Separator Line */}
          <div className="h-[2%] w-[80%] mx-auto bg-black"></div>

          {/* Team 2 Score + Red Accent */}
          <div className="h-[49%] w-full flex items-center justify-center relative">
            {/* Red Accent vertical bar touching the black center block */}
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#ed1c24] h-full transform translate-x-[-8px]"></div>

            <span className="font-black text-5xl text-black">
              {match.score.team2}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
