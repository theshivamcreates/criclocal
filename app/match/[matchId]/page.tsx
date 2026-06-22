"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import type { Match as CricketMatch, Innings } from "@/types/match";
import { Trophy, Clock, Activity, Users } from "lucide-react";
import Link from "next/link";

export default function CricketMatchDetails() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [match, setMatch] = useState<CricketMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const matchRef = ref(db, `matches/${matchId}`);
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
        <div className="min-h-[85vh] flex items-center justify-center bg-inverse-surface">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-surface-bright font-black uppercase tracking-widest text-xs animate-pulse">Loading Match Data...</p>
          </div>
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
          <p className="text-on-surface-variant max-w-md mb-8">The cricket match you are looking for does not exist or has been removed.</p>
          <Link href="/scores" className="px-6 py-3 bg-primary text-on-primary font-black uppercase tracking-widest rounded-lg hover:bg-primary-container transition-colors">
            Back to Scores
          </Link>
        </div>
      </AppShell>
    );
  }

  const inn1 = match.innings?.["1"];
  const inn2 = match.innings?.["2"];
  
  const getOversStr = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

  const renderScorecard = (innings: Innings, label: string) => {
    if (!innings) return null;
    const battingTeamName = innings.battingTeam === "team1" ? match.meta.team1 : match.meta.team2;
    const extrasTotal = innings.extras.wide + innings.extras.noBall + innings.extras.bye + innings.extras.legBye;
    
    return (
      <div className="bg-surface border border-outline rounded-2xl overflow-hidden mb-8 shadow-sm">
        <div className="bg-surface-dim border-b border-outline px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-black text-lg text-on-surface">{label}: {battingTeamName} Innings</h3>
          <div className="font-black text-xl text-primary bg-primary/10 px-4 py-1 rounded-md">
            {innings.runs}/{innings.wickets} <span className="text-sm font-bold text-on-surface-variant">({getOversStr(innings.balls)} ov)</span>
          </div>
        </div>
        
        {/* Batting Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-variant">
              <tr className="border-b border-outline text-on-surface-variant text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Batter</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold text-right">R</th>
                <th className="px-4 py-3 font-bold text-right">B</th>
                <th className="px-4 py-3 font-bold text-right">4s</th>
                <th className="px-4 py-3 font-bold text-right">6s</th>
                <th className="px-4 py-3 font-bold text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {Object.values(innings.batsmen).map((b, i) => (
                <tr key={i} className="hover:bg-surface-dim transition-colors">
                  <td className="px-4 py-3 font-bold text-on-surface">{b.name}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">{b.status === "batting" ? "not out" : b.status}</td>
                  <td className="px-4 py-3 text-right font-black">{b.runs}</td>
                  <td className="px-4 py-3 text-right text-on-surface-variant">{b.balls}</td>
                  <td className="px-4 py-3 text-right">{b.fours}</td>
                  <td className="px-4 py-3 text-right">{b.sixes}</td>
                  <td className="px-4 py-3 text-right">{(b.balls > 0 ? (b.runs / b.balls * 100).toFixed(2) : "0.00")}</td>
                </tr>
              ))}
              <tr className="bg-surface-dim">
                <td colSpan={2} className="px-4 py-3 font-bold text-on-surface">Extras</td>
                <td colSpan={5} className="px-4 py-3 font-bold text-right">{extrasTotal} <span className="font-normal text-xs text-on-surface-variant">(W {innings.extras.wide}, NB {innings.extras.noBall}, B {innings.extras.bye}, LB {innings.extras.legBye})</span></td>
              </tr>
              <tr className="bg-surface-variant">
                <td colSpan={2} className="px-4 py-3 font-black text-on-surface uppercase tracking-widest text-xs">Total</td>
                <td colSpan={5} className="px-4 py-3 font-black text-right text-lg">{innings.runs}/{innings.wickets} <span className="font-bold text-xs text-on-surface-variant">({getOversStr(innings.balls)} Overs)</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bowling Table */}
        <div className="bg-surface-dim border-y border-outline px-4 py-2 font-black text-sm uppercase tracking-widest text-on-surface-variant">Bowling</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-outline text-on-surface-variant text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-bold">Bowler</th>
                <th className="px-4 py-3 font-bold text-right">O</th>
                <th className="px-4 py-3 font-bold text-right">R</th>
                <th className="px-4 py-3 font-bold text-right">W</th>
                <th className="px-4 py-3 font-bold text-right">WD</th>
                <th className="px-4 py-3 font-bold text-right">NB</th>
                <th className="px-4 py-3 font-bold text-right">ECON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {Object.values(innings.bowlers).map((b, i) => {
                const totalBalls = (b.overs * 6) + b.balls;
                const oversBowled = totalBalls / 6;
                const econ = oversBowled > 0 ? (b.runs / oversBowled).toFixed(2) : "0.00";
                return (
                  <tr key={i} className="hover:bg-surface-dim transition-colors">
                    <td className="px-4 py-3 font-bold text-on-surface">{b.name}</td>
                    <td className="px-4 py-3 text-right">{getOversStr(totalBalls)}</td>
                    <td className="px-4 py-3 text-right font-black">{b.runs}</td>
                    <td className="px-4 py-3 text-right font-black text-primary">{b.wickets}</td>
                    <td className="px-4 py-3 text-right">{b.wides}</td>
                    <td className="px-4 py-3 text-right">{b.noBalls}</td>
                    <td className="px-4 py-3 text-right text-on-surface-variant">{econ}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <AppShell>
      <div className="bg-surface border-b border-outline">
        <div className="max-w-[1000px] mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="inline-block bg-surface-dim border border-outline px-4 py-1 rounded-full mb-8">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                <Clock size={12}/>
                {match.meta.status === "live" ? "Match is Live" : match.meta.status === "completed" ? "Match Completed" : "Upcoming"}
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between w-full mb-8">
              {/* Team 1 */}
              <div className="flex flex-col items-center w-full md:w-1/3 mb-6 md:mb-0">
                {match.meta.team1Logo ? (
                  <img src={match.meta.team1Logo} className="w-20 h-20 rounded-full border-4 object-cover bg-surface mb-3" style={{borderColor: match.meta.team1Color || "var(--color-primary)"}} />
                ) : (
                  <div className="w-20 h-20 rounded-full mb-3 flex items-center justify-center text-white font-black text-2xl" style={{backgroundColor: match.meta.team1Color || "var(--color-primary)"}}>
                    {match.meta.team1.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h2 className="font-display text-xl md:text-2xl font-black uppercase tracking-tighter text-on-surface text-center">
                  {match.meta.team1}
                </h2>
                {inn1?.battingTeam === "team1" && (
                  <div className="text-3xl font-black mt-2 text-primary">
                    {inn1.runs}/{inn1.wickets} <span className="text-sm font-bold text-on-surface-variant">({getOversStr(inn1.balls)})</span>
                  </div>
                )}
                {inn2?.battingTeam === "team1" && (
                  <div className="text-3xl font-black mt-2 text-primary">
                    {inn2.runs}/{inn2.wickets} <span className="text-sm font-bold text-on-surface-variant">({getOversStr(inn2.balls)})</span>
                  </div>
                )}
              </div>

              {/* VS */}
              <div className="flex flex-col items-center w-full md:w-1/3 mb-6 md:mb-0">
                <div className="text-3xl font-black text-outline-variant italic">VS</div>
                <div className="text-sm font-bold text-on-surface-variant mt-2 uppercase tracking-widest">{match.meta.overs} Overs Match</div>
                <div className="text-xs font-bold text-on-surface-variant mt-1 text-center max-w-[200px]">Toss: {match.meta.toss === "team1" ? match.meta.team1 : match.meta.team2} elected to {match.meta.elected}</div>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center w-full md:w-1/3">
                {match.meta.team2Logo ? (
                  <img src={match.meta.team2Logo} className="w-20 h-20 rounded-full border-4 object-cover bg-surface mb-3" style={{borderColor: match.meta.team2Color || "var(--color-primary)"}} />
                ) : (
                  <div className="w-20 h-20 rounded-full mb-3 flex items-center justify-center text-white font-black text-2xl" style={{backgroundColor: match.meta.team2Color || "var(--color-primary)"}}>
                    {match.meta.team2.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h2 className="font-display text-xl md:text-2xl font-black uppercase tracking-tighter text-on-surface text-center">
                  {match.meta.team2}
                </h2>
                {inn1?.battingTeam === "team2" && (
                  <div className="text-3xl font-black mt-2 text-primary">
                    {inn1.runs}/{inn1.wickets} <span className="text-sm font-bold text-on-surface-variant">({getOversStr(inn1.balls)})</span>
                  </div>
                )}
                {inn2?.battingTeam === "team2" && (
                  <div className="text-3xl font-black mt-2 text-primary">
                    {inn2.runs}/{inn2.wickets} <span className="text-sm font-bold text-on-surface-variant">({getOversStr(inn2.balls)})</span>
                  </div>
                )}
              </div>
            </div>

            {match.result && (
              <div className="mt-4 bg-inverse-surface text-inverse-on-surface px-8 py-4 rounded-full text-sm sm:text-base font-black uppercase tracking-widest shadow-lg max-w-2xl w-full">
                {match.result}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 py-12">
        {renderScorecard(inn1, "1st")}
        {renderScorecard(inn2, "2nd")}
      </div>
    </AppShell>
  );
}
