"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import type { FootballMatch, FootballEvent } from "@/types/football";
import { Trophy, Clock, Activity, Users } from "lucide-react";
import Link from "next/link";

export default function FootballMatchDetails() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const router = useRouter();
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const matchRef = ref(db, `football/matches/${matchId}`);
    const unsub = onValue(matchRef, (snapshot) => {
      if (snapshot.exists()) {
        setMatch(snapshot.val());
      } else {
        setMatch(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [matchId]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppShell>
    );
  }

  if (!match) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-[80vh] px-4 text-center">
          <Trophy size={64} className="text-on-surface-variant mb-6 opacity-50"/>
          <h1 className="text-4xl font-black text-on-surface mb-4">Match Not Found</h1>
          <p className="text-on-surface-variant max-w-md mb-8">The football match you are looking for does not exist or has been removed.</p>
          <Link href="/scores" className="px-6 py-3 bg-primary text-on-primary font-black uppercase tracking-widest rounded-lg hover:bg-primary-container transition-colors">
            Back to Scores
          </Link>
        </div>
      </AppShell>
    );
  }

  const eventsList = match.events ? Object.values(match.events).sort((a, b) => b.timestamp - a.timestamp) : [];

  return (
    <AppShell>
      <div className="bg-surface border-b border-outline">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="inline-block bg-surface-dim border border-outline px-4 py-1 rounded-full mb-8">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                <Clock size={12}/>
                {match.meta.status === "live" ? "Match is Live" : match.meta.status === "completed" ? "Full Time" : "Upcoming"}
              </span>
            </div>

            <div className="flex items-center justify-center gap-6 md:gap-16 w-full max-w-4xl">
              {/* Team 1 */}
              <div className="flex flex-col items-center flex-1">
                {match.meta.team1Logo ? (
                  <img src={match.meta.team1Logo} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 object-cover bg-surface mb-4" style={{borderColor: match.meta.team1Color || "var(--color-primary)"}} />
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full mb-4 flex items-center justify-center text-white font-black text-3xl md:text-5xl" style={{backgroundColor: match.meta.team1Color || "var(--color-primary)"}}>
                    {match.meta.team1.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tighter text-on-surface text-center">
                  {match.meta.team1}
                </h2>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center">
                <div className="text-5xl md:text-[80px] font-black tabular-nums tracking-tighter flex items-center gap-4 text-on-surface">
                  <span>{match.score.team1}</span>
                  <span className="text-outline-variant text-4xl md:text-6xl">-</span>
                  <span>{match.score.team2}</span>
                </div>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center flex-1">
                {match.meta.team2Logo ? (
                  <img src={match.meta.team2Logo} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 object-cover bg-surface mb-4" style={{borderColor: match.meta.team2Color || "var(--color-primary)"}} />
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full mb-4 flex items-center justify-center text-white font-black text-3xl md:text-5xl" style={{backgroundColor: match.meta.team2Color || "var(--color-primary)"}}>
                    {match.meta.team2.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tighter text-on-surface text-center">
                  {match.meta.team2}
                </h2>
              </div>
            </div>

            {match.result && (
              <div className="mt-12 bg-inverse-surface text-inverse-on-surface px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest shadow-lg">
                {match.result}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Match Timeline / Events */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-black uppercase tracking-widest text-on-surface mb-6 flex items-center gap-2">
              <Activity size={20} className="text-primary"/> Match Events
            </h3>
            <div className="bg-surface border border-outline rounded-2xl p-6">
              {eventsList.length === 0 ? (
                <p className="text-center text-on-surface-variant font-bold py-8">No events recorded yet.</p>
              ) : (
                <div className="space-y-6">
                  {eventsList.map((event) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="w-16 shrink-0 text-right">
                        <span className="text-sm font-black text-on-surface-variant bg-surface-dim px-2 py-1 rounded">{event.time}</span>
                      </div>
                      <div className="w-px bg-outline relative">
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-surface border-2 border-primary"></div>
                      </div>
                      <div className="flex-1 pb-4 border-b border-outline-variant last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                            event.team === "team1" ? "bg-primary/10 text-primary" : "bg-on-surface/10 text-on-surface"
                          }`}>
                            {event.team === "team1" ? match.meta.team1 : match.meta.team2}
                          </span>
                        </div>
                        <p className="font-bold text-on-surface">
                          {event.type === "goal" && "⚽ Goal!"}
                          {event.type === "yellow_card" && "🟨 Yellow Card"}
                          {event.type === "red_card" && "🟥 Red Card"}
                          {event.type === "sub" && "🔄 Substitution"}
                        </p>
                        {event.scorerName && <p className="text-sm text-on-surface-variant mt-1">Player: <span className="font-bold text-on-surface">{event.scorerName}</span></p>}
                        {event.assistName && <p className="text-xs text-on-surface-variant mt-0.5">Assist: {event.assistName}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rosters */}
          <div className="lg:col-span-2">
             <h3 className="text-xl font-black uppercase tracking-widest text-on-surface mb-6 flex items-center gap-2">
              <Users size={20} className="text-primary"/> Team Lineups
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Team 1 Roster */}
              <div className="bg-surface border border-outline rounded-2xl overflow-hidden">
                <div className="bg-surface-dim border-b border-outline px-4 py-3 font-black text-on-surface">
                  {match.meta.team1} Roster
                </div>
                {(!match.meta.team1Roster || match.meta.team1Roster.length === 0) ? (
                  <p className="p-6 text-center text-sm font-bold text-on-surface-variant">No players listed.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant text-on-surface-variant text-xs uppercase tracking-wider">
                        <th className="px-4 py-2 font-bold">Player Name</th>
                        <th className="px-4 py-2 font-bold text-right">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {match.meta.team1Roster.map((p, i) => (
                        <tr key={i} className="hover:bg-surface-dim transition-colors">
                          <td className="px-4 py-3 font-bold text-on-surface">{p.name}</td>
                          <td className="px-4 py-3 text-right text-on-surface-variant">{p.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Team 2 Roster */}
              <div className="bg-surface border border-outline rounded-2xl overflow-hidden">
                <div className="bg-surface-dim border-b border-outline px-4 py-3 font-black text-on-surface">
                  {match.meta.team2} Roster
                </div>
                {(!match.meta.team2Roster || match.meta.team2Roster.length === 0) ? (
                  <p className="p-6 text-center text-sm font-bold text-on-surface-variant">No players listed.</p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant text-on-surface-variant text-xs uppercase tracking-wider">
                        <th className="px-4 py-2 font-bold">Player Name</th>
                        <th className="px-4 py-2 font-bold text-right">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {match.meta.team2Roster.map((p, i) => (
                        <tr key={i} className="hover:bg-surface-dim transition-colors">
                          <td className="px-4 py-3 font-bold text-on-surface">{p.name}</td>
                          <td className="px-4 py-3 text-right text-on-surface-variant">{p.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
