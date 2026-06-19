import type { BallEvent, OverSummary } from "@/types/match";

function BallPill({ ball }: { ball: BallEvent }) {
  const tone =
    ball === "W"
      ? "bg-rose-700 text-white"
      : ball === "4" || ball === "6"
        ? "bg-pitch text-white"
        : ball === "WD" || ball === "NB"
          ? "bg-orange-100 text-orange-900"
          : "bg-slate-100 text-slate-800";

  return (
    <span
      className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs font-black ${tone}`}
    >
      {ball}
    </span>
  );
}

export function CurrentOver({ balls }: { balls: BallEvent[] }) {
  return (
    <div className="flex min-h-10 flex-wrap gap-2">
      {balls.length ? (
        balls.map((ball, index) => (
          <BallPill key={`${ball}-${index}`} ball={ball} />
        ))
      ) : (
        <span className="text-sm text-slate-500">No balls yet</span>
      )}
    </div>
  );
}

export function OverHistory({ history }: { history: OverSummary[] }) {
  if (!history.length)
    return (
      <p className="text-sm text-slate-500">
        Completed overs will appear here.
      </p>
    );

  return (
    <div className="space-y-2">
      {history
        .slice(-5)
        .reverse()
        .map((over) => (
          <div
            key={over.over}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <div>
              <p className="text-sm font-black">Over {over.over}</p>
              <p className="text-xs text-slate-500">
                {over.runs} runs, {over.wickets} wickets
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {over.balls.map((ball, index) => (
                <BallPill key={`${over.over}-${ball}-${index}`} ball={ball} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
