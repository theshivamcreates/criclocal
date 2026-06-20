import { getOversDisplay } from "@/lib/matchUtils";
import type { Bowler } from "@/types/match";

export function BowlerRow({ name, bowler }: { name: string; bowler: Bowler }) {
  return (
    <div className="grid grid-cols-[1fr_2rem_2rem_2rem_2rem] sm:grid-cols-[1fr_3rem_3rem_3rem_3rem] items-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm">
      <div>
        <p className="font-bold text-slate-950">{bowler.name || name}</p>
        <p className="text-xs text-slate-500">Current bowler</p>
      </div>
      <span className="text-right font-black">
        {getOversDisplay(bowler.balls)}
      </span>
      <span className="text-right text-slate-600">{bowler.runs}</span>
      <span className="text-right text-slate-600">{bowler.wickets}</span>
      <span className="text-right text-slate-600">
        {bowler.wides + bowler.noBalls}
      </span>
    </div>
  );
}
