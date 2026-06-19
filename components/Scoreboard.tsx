import { BatsmanRow } from "@/components/BatsmanRow";
import { BowlerRow } from "@/components/BowlerRow";
import { CurrentOver } from "@/components/OverHistory";
import { getActiveBatsmen, getBattingTeamName, getCurrentBowler, getCurrentInnings, getOversDisplay, getRequiredRunRate, getRunRate } from "@/lib/matchUtils";
import type { Match } from "@/types/match";

export function Scoreboard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const innings = getCurrentInnings(match);
  const teamName = getBattingTeamName(match, innings);
  const batsmen = getActiveBatsmen(innings);
  const bowler = getCurrentBowler(innings);
  const inningsOne = match.innings["1"];
  const target = match.currentInnings === 2 && inningsOne ? inningsOne.runs + 1 : null;
  const ballsLeft = match.meta.overs * 6 - innings.balls;

  return (
    <section className={compact ? "space-y-4" : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-pitch">{teamName}</p>
          <h1 className={compact ? "text-4xl font-black" : "text-5xl font-black text-slate-950"}>
            {innings.runs}/{innings.wickets}
          </h1>
        </div>
        <div className="text-right">
          {innings.isFreeHit && (
            <div className="mb-1">
              <span className="inline-block animate-pulse rounded-md bg-blue-600 px-2 py-0.5 text-xs font-black tracking-wide text-white">FREE HIT</span>
            </div>
          )}
          <p className="text-lg font-black">({getOversDisplay(innings.balls)}/{match.meta.overs})</p>
          <p className="text-sm text-slate-500">RR {getRunRate(innings.runs, innings.balls)}</p>
          {target ? <p className="text-sm text-slate-500">Need {target - innings.runs} at {getRequiredRunRate(target, innings.runs, ballsLeft)}</p> : null}
        </div>
      </div>

      <div className={compact ? "space-y-1" : "mt-5 rounded-lg border border-slate-100 px-3"}>
        {!compact ? (
          <div className="grid grid-cols-[1fr_3rem_3rem_3rem_3rem] gap-2 border-b border-slate-100 py-2 text-xs font-black uppercase text-slate-500">
            <span>Batter</span>
            <span className="text-right">R</span>
            <span className="text-right">B</span>
            <span className="text-right">4s</span>
            <span className="text-right">6s</span>
          </div>
        ) : null}
        {batsmen.map(([key, batsman]) => (
          <BatsmanRow key={key} name={key} batsman={batsman} />
        ))}
      </div>

      {!compact && bowler ? (
        <div className="mt-4 rounded-lg border border-slate-100 px-3">
          <div className="grid grid-cols-[1fr_3rem_3rem_3rem_3rem] gap-2 border-b border-slate-100 py-2 text-xs font-black uppercase text-slate-500">
            <span>Bowler</span>
            <span className="text-right">O</span>
            <span className="text-right">R</span>
            <span className="text-right">W</span>
            <span className="text-right">Ex</span>
          </div>
          <BowlerRow name={bowler[0]} bowler={bowler[1]} />
        </div>
      ) : null}

      <div className={compact ? "" : "mt-5"}>
        <p className="mb-2 text-xs font-black uppercase text-slate-500">Current over</p>
        <CurrentOver balls={innings.currentOver ?? []} />
      </div>
    </section>
  );
}
