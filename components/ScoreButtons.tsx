import type { BallEvent } from "@/types/match";

const BALL_EVENTS: Array<{ label: string; value: BallEvent; color: string }> = [
  { label: "0", value: "0", color: "bg-slate-700" },
  { label: "1", value: "1", color: "bg-sky-700" },
  { label: "2", value: "2", color: "bg-sky-700" },
  { label: "3", value: "3", color: "bg-sky-700" },
  { label: "4", value: "4", color: "bg-pitch" },
  { label: "6", value: "6", color: "bg-yellow-400 text-slate-950" },
  { label: "W", value: "W", color: "bg-rose-700" },
  { label: "WD", value: "WD", color: "bg-orange-600" },
  { label: "NB", value: "NB", color: "bg-violet-700" },
];

export function ScoreButtons({
  onBall,
  disabled,
}: {
  onBall: (event: BallEvent) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {BALL_EVENTS.map((ball) => (
        <button
          key={ball.value}
          type="button"
          disabled={disabled}
          onClick={() => onBall(ball.value)}
          className={`${ball.color} min-h-20 rounded-lg px-4 text-2xl font-black text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {ball.label}
        </button>
      ))}
    </div>
  );
}
