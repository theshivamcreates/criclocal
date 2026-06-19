"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import Link from "next/link";
import { Activity, Trophy, Calendar } from "lucide-react";
import type { Match as CricketMatch } from "@/types/match";
import type { FootballMatch } from "@/types/football";

export default function ScoresPage() {
  const [cricketMatches, setCricketMatches] = useState<Record<string, CricketMatch>>({});
  const [footballMatches, setFootballMatches] = useState<Record<string, FootballMatch>>({});
  const [activeTab, setActiveTab] = useState<"football" | "cricket">("football");

  useEffect(() => {
    if (!db) return;
    
    const unsubCricket = onValue(ref(db, "matches"), (snapshot) => {
      setCricketMatches(snapshot.val() ?? {});
    });
    
    const unsubFootball = onValue(ref(db, "football/matches"), (snapshot) => {
      setFootballMatches(snapshot.val() ?? {});
    });

    return () => {
      unsubCricket();
      unsubFootball();
    };
  }, []);

  const completedCricket = useMemo(() => {
    return Object.entries(cricketMatches)
      .map(([id, match]) => ({ ...match, id, sport: "cricket" as const }))
      .filter((m) => m.meta.status === "completed")
      .sort((a, b) => b.meta.createdAt - a.meta.createdAt);
  }, [cricketMatches]);

  const completedFootball = useMemo(() => {
    return Object.entries(footballMatches)
      .map(([id, match]) => ({ ...match, id, sport: "football" as const }))
      .filter((m) => m.meta.status === "completed")
      .sort((a, b) => b.meta.createdAt - a.meta.createdAt);
  }, [footballMatches]);

  const allRecent = useMemo(() => {
    return [...completedCricket, ...completedFootball]
      .sort((a, b) => b.meta.createdAt - a.meta.createdAt)
      .slice(0, 4); // Show top 4 recent
  }, [completedCricket, completedFootball]);

  const renderCricketCard = (match: CricketMatch & { id: string }) => {
    return (
      <div key={match.id} className="bg-surface rounded-2xl border border-outline shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
        <div className="bg-surface-dim border-b border-outline px-4 py-2 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          <span>Cricket</span>
          <span className="flex items-center gap-1"><Calendar size={12}/> Ended</span>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center">
           <div className="flex justify-between items-center mb-4">
             <div className="font-black text-on-surface text-lg max-w-[40%] truncate">{match.meta.team1}</div>
             <div className="text-xl font-black bg-surface-variant px-3 py-1 rounded-md text-on-surface">{match.innings?.["1"]?.runs || 0}/{match.innings?.["1"]?.wickets || 0}</div>
           </div>
           <div className="flex justify-between items-center">
             <div className="font-black text-on-surface text-lg max-w-[40%] truncate">{match.meta.team2}</div>
             <div className="text-xl font-black bg-surface-variant px-3 py-1 rounded-md text-on-surface">{match.innings?.["2"]?.runs || 0}/{match.innings?.["2"]?.wickets || 0}</div>
           </div>
        </div>
        <div className="bg-inverse-surface text-inverse-on-surface p-3 text-center text-sm font-bold">
          {match.result || "Match Completed"}
        </div>
      </div>
    );
  };

  const renderFootballCard = (match: FootballMatch & { id: string }) => {
    return (
      <div key={match.id} className="bg-surface rounded-2xl border border-outline shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
        <div className="bg-surface-dim border-b border-outline px-4 py-2 flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          <span>Football</span>
          <span className="flex items-center gap-1"><Calendar size={12}/> Full Time</span>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center text-on-surface">
           <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col items-center flex-1">
                {match.meta.team1Logo ? (
                   <img src={match.meta.team1Logo} className="w-12 h-12 rounded-full border-2 object-cover bg-surface mb-2" style={{borderColor: match.meta.team1Color}} />
                ) : (
                   <div className="w-12 h-12 rounded-full mb-2 flex items-center justify-center text-white font-black text-sm" style={{backgroundColor: match.meta.team1Color || "var(--color-primary)"}}>{match.meta.team1.substring(0,2).toUpperCase()}</div>
                )}
                <span className="font-bold text-sm text-center line-clamp-1 text-on-surface">{match.meta.team1}</span>
              </div>

              <div className="text-4xl font-black tabular-nums tracking-tighter shrink-0 flex items-center justify-center gap-2">
                <span>{match.score.team1}</span>
                <span className="text-outline-variant text-2xl">-</span>
                <span>{match.score.team2}</span>
              </div>

              <div className="flex flex-col items-center flex-1">
                {match.meta.team2Logo ? (
                   <img src={match.meta.team2Logo} className="w-12 h-12 rounded-full border-2 object-cover bg-surface mb-2" style={{borderColor: match.meta.team2Color}} />
                ) : (
                   <div className="w-12 h-12 rounded-full mb-2 flex items-center justify-center text-white font-black text-sm" style={{backgroundColor: match.meta.team2Color || "var(--color-primary)"}}>{match.meta.team2.substring(0,2).toUpperCase()}</div>
                )}
                <span className="font-bold text-sm text-center line-clamp-1 text-on-surface">{match.meta.team2}</span>
              </div>
           </div>
        </div>
        <div className="bg-inverse-surface text-inverse-on-surface p-3 text-center text-sm font-bold">
          {match.result || "Match Completed"}
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-8 min-h-[80vh]">
        
        {/* Latest Results Section */}
        {allRecent.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-black text-on-surface mb-6 flex items-center gap-2">
              <Activity size={24} className="text-primary"/> Latest Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {allRecent.map(m => 
                m.sport === "cricket" 
                  ? renderCricketCard(m as CricketMatch & {id: string})
                  : renderFootballCard(m as FootballMatch & {id: string})
              )}
            </div>
          </section>
        )}

        {/* Directory Section */}
        <section>
          <div className="flex items-center gap-6 border-b border-outline mb-8">
            <button
              onClick={() => setActiveTab("football")}
              className={`pb-4 text-lg font-black transition-colors relative ${activeTab === "football" ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              Football Feed
              {activeTab === "football" && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab("cricket")}
              className={`pb-4 text-lg font-black transition-colors relative ${activeTab === "cricket" ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              Cricket Feed
              {activeTab === "cricket" && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === "football" && (
              completedFootball.length === 0 ? (
                <div className="col-span-full py-12 text-center text-on-surface-variant font-bold">No football results available yet.</div>
              ) : (
                completedFootball.map(m => renderFootballCard(m))
              )
            )}

            {activeTab === "cricket" && (
              completedCricket.length === 0 ? (
                <div className="col-span-full py-12 text-center text-on-surface-variant font-bold">No cricket results available yet.</div>
              ) : (
                completedCricket.map(m => renderCricketCard(m))
              )
            )}
          </div>
        </section>

      </div>
    </AppShell>
  );
}
