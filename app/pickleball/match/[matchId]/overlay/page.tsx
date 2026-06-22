"use client";

import { useEffect, useState, use } from "react";
import { subscribeToPickleballMatch } from "@/lib/firebasePickleball";
import type { PickleballMatch } from "@/types/pickleball";

export default function PickleballOverlayPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const [match, setMatch] = useState<PickleballMatch | null>(null);

  useEffect(() => {
    return subscribeToPickleballMatch(matchId, setMatch);
  }, [matchId]);

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
          width: "540px",
          height: "140px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* LEFT BLOCK: Logo & Timer */}
        <div className="flex flex-col w-[35%] h-full">
          {/* Top Half (Red): Logo Placeholder */}
          <div className="h-1/2 w-full bg-[#ed1c24] flex items-center justify-center relative">
            {match.meta.overlayLogo ? (
              <img src={match.meta.overlayLogo} alt="Overlay Logo" className="h-[140%] w-[140%] object-contain drop-shadow-md z-10 scale-[1.2]" />
            ) : (
              <>
                <div className="absolute font-black text-5xl flex select-none">
                  <span className="text-white transform translate-x-1">X</span>
                  <span className="text-black transform -translate-x-1">X</span>
                </div>
                <div className="z-10 font-black text-5xl italic tracking-tighter flex items-center justify-center">
                  <span className="text-white relative left-1 z-20">X</span>
                  <span className="text-black relative right-1 z-10">X</span>
                </div>
              </>
            )}
          </div>

          {/* Bottom Half (White): Match Title */}
          <div className="h-1/2 w-full bg-surface flex items-center justify-center border-t-2 border-[#ed1c24]">
            <span
              className="font-black text-xl text-black tracking-tight uppercase px-4 text-center truncate"
            >
              {match.meta.matchTitle || "MATCH 1"}
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
        <div className="flex flex-col w-[30%] h-full bg-surface relative">
           {/* Red Accent vertical bar for Team 2 */}
           <div className="absolute left-0 top-[51%] bottom-0 w-2 bg-[#ed1c24] h-[49%] z-10"></div>
           
           {/* Team 1 Score Row */}
           <div className="h-[49%] w-full flex items-center pl-4 pr-2">
              <div className="w-1/3 flex justify-center border-r-2 border-slate-200 pr-2">
                 <span className="font-bold text-2xl text-slate-400">{match.score.team1.sets}</span>
              </div>
              <div className="w-2/3 flex justify-center pl-2">
                 <span className="font-black text-5xl text-black">{match.score.team1.points}</span>
              </div>
           </div>

           {/* Separator Line */}
           <div className="h-[2%] w-[80%] mx-auto bg-black relative z-20"></div>

           {/* Team 2 Score Row */}
           <div className="h-[49%] w-full flex items-center pl-4 pr-2">
              <div className="w-1/3 flex justify-center border-r-2 border-slate-200 pr-2">
                 <span className="font-bold text-2xl text-slate-400">{match.score.team2.sets}</span>
              </div>
              <div className="w-2/3 flex justify-center pl-2">
                 <span className="font-black text-5xl text-black">{match.score.team2.points}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
