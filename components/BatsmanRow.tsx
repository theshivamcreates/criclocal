import type { Batsman } from "@/types/match";

export function BatsmanRow({
  name,
  batsman,
}: {
  name: string;
  batsman: Batsman;
}) {
  return (
    <div className="grid grid-cols-[1fr_3rem_3rem_3rem_3rem] items-center gap-2 border-b border-slate-100 py-3 text-sm last:border-b-0">
      <div>
        <p className="font-bold text-slate-950">{batsman.name || name}</p>
        <p className="text-xs capitalize text-slate-500">
          {batsman.status.replaceAll("-", "")}
        </p>
      </div>
      <span className="text-right font-black">{batsman.runs}</span>
      <span className="text-right text-slate-600">{batsman.balls}</span>
      <span className="text-right text-slate-600">{batsman.fours}</span>
      <span className="text-right text-slate-600">{batsman.sixes}</span>
    </div>
  );
}
