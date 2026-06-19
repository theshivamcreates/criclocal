import {
  getActiveBatsmen,
  getBattingTeamName,
  getBowlingTeamName,
  getCurrentBowler,
  getCurrentInnings,
  getOversDisplay,
  getRunRate,
} from "@/lib/matchUtils";
import type { Match } from "@/types/match";

export function IPLOverlay({ match }: { match: Match }) {
  const innings = getCurrentInnings(match);

  // Calculate abbreviations (first 3 letters if no custom abbreviation system is present)
  const battingTeamName = getBattingTeamName(match, innings);
  const bowlingTeamName = getBowlingTeamName(match, innings);
  const battingAbbr = battingTeamName.substring(0, 3).toUpperCase();
  const bowlingAbbr = bowlingTeamName.substring(0, 3).toUpperCase();

  const battingLogo =
    innings.battingTeam === "team1"
      ? match.meta.team1Logo
      : match.meta.team2Logo;
  const bowlingLogo =
    innings.battingTeam === "team1"
      ? match.meta.team2Logo
      : match.meta.team1Logo;
  const battingColor =
    (innings.battingTeam === "team1"
      ? match.meta.team1Color
      : match.meta.team2Color) || "#dc2626";
  const bowlingColor =
    (innings.battingTeam === "team1"
      ? match.meta.team2Color
      : match.meta.team1Color) || "#eab308";

  const batsmen = getActiveBatsmen(innings);
  const bowler = getCurrentBowler(innings);

  const striker =
    batsmen.find(([key]) => key === innings.strikerKey) || batsmen[0];
  const nonStriker =
    batsmen.find(([key]) => key !== innings.strikerKey) || batsmen[1];

  const overHistory = innings.currentOver ?? [];

  return (
    <div
      className="flex w-full select-none items-end text-white"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* 1. Batting Team Info Block */}
      <div
        className="flex items-center gap-3 py-2 pl-4 pr-16 relative overflow-hidden"
        style={{
          background: `linear-gradient(to right, ${battingColor}88, #1e293b)`,
          clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)",
          borderLeft: `6px solid ${battingColor}`,
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg overflow-hidden shrink-0">
          {battingLogo ? (
            <img
              src={battingLogo}
              alt={battingAbbr}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-black text-slate-900">
              {battingAbbr}
            </span>
          )}
        </div>
        <div className="flex flex-col pr-4">
          <span className="text-2xl font-black leading-none tracking-wider">
            {battingAbbr}
          </span>
          <span className="text-xs font-semibold text-slate-300">
            v {bowlingAbbr}
          </span>
        </div>
      </div>

      {/* 2. Score Block */}
      <div
        className="flex h-16 shadow-xl relative z-10 -ml-6"
        style={{ clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0 100%)" }}
      >
        <div
          className="flex items-center justify-center px-8"
          style={{ backgroundColor: battingColor }}
        >
          <span className="text-4xl font-black drop-shadow-md">
            {innings.runs}-{innings.wickets}
          </span>
        </div>
        <div className="flex items-center justify-center bg-slate-900 px-6 border-r-4 border-slate-700">
          <span className="text-3xl font-bold">
            {getOversDisplay(innings.balls)}
          </span>
        </div>
      </div>

      {/* 3. Batsman Block */}
      <div
        className="flex flex-col justify-center bg-slate-800 h-16 px-6 shadow-xl -ml-6 relative z-0"
        style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0 100%)" }}
      >
        <div className="flex items-center gap-6 pl-4">
          {/* Striker */}
          <div className="flex w-40 justify-between items-center">
            <span className="font-bold truncate text-lg flex items-center gap-1 text-white">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-yellow-400"
              >
                <path d="M5.4 14.6L2 18l2.8 2.8 3.4-3.4 9.9-9.9c1.6-1.6 1.6-4.2 0-5.8s-4.2-1.6-5.8 0L2.4 11.6l3 3zm15.8-11.8c.8.8.8 2 0 2.8l-1.4 1.4-2.8-2.8 1.4-1.4c.8-.8 2-.8 2.8 0z" />
              </svg>
              {striker[1].name}
            </span>
            <div className="flex gap-2 items-baseline">
              <span className="font-black text-xl">{striker[1].runs}</span>
              <span className="text-xs text-slate-300 font-bold">
                {striker[1].balls}
              </span>
            </div>
          </div>
          {/* Non-Striker */}
          <div className="flex w-40 justify-between items-center opacity-80">
            <span className="font-bold truncate text-lg text-slate-200">
              {nonStriker[1].name}
            </span>
            <div className="flex gap-2 items-baseline">
              <span className="font-black text-xl">{nonStriker[1].runs}</span>
              <span className="text-xs text-slate-300 font-bold">
                {nonStriker[1].balls}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Run Rate and Bowler Block */}
      <div
        className="flex h-16 shadow-xl -ml-6 relative z-10"
        style={{
          clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0 100%)",
          backgroundColor: bowlingColor,
        }}
      >
        {/* Run Rate */}
        <div className="flex flex-col items-center justify-center px-6 border-r border-black/10">
          <span className="text-[10px] font-black uppercase text-black/60 tracking-wider">
            Run Rate
          </span>
          <span className="text-xl font-black text-black">
            {getRunRate(innings.runs, innings.balls)}
          </span>
        </div>

        {innings.isFreeHit && (
          <div className="flex items-center justify-center bg-primary px-4 border-r border-black/10">
            <span className="text-sm font-black text-white whitespace-nowrap animate-pulse">
              FREE HIT
            </span>
          </div>
        )}

        {/* Bowler */}
        {bowler && (
          <div className="flex flex-col justify-center px-6 min-w-[180px]">
            <span className="text-sm font-black text-black truncate">
              {bowler[1].name}
            </span>
            <div className="flex gap-4 items-end">
              <span className="font-black text-black text-xl leading-none">
                {bowler[1].wickets}-{bowler[1].runs}
              </span>
              <span className="text-xs font-bold text-black/70 mb-0.5">
                {Math.floor(bowler[1].balls / 6)}.{bowler[1].balls % 6}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Over Timeline */}
      <div
        className="flex items-center gap-1 h-16 px-6 bg-slate-900 shadow-xl -ml-6 relative z-0"
        style={{ clipPath: "polygon(5% 0, 100% 0, 95% 100%, 0 100%)" }}
      >
        {overHistory.map((ball, i) => {
          const isWicket = ball === "W";
          const isBoundary = ball === "4" || ball === "6";
          const bg = isWicket
            ? "bg-red-500"
            : isBoundary
              ? "bg-primary"
              : "bg-slate-700";
          return (
            <div
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded font-black text-sm shadow-inner ${bg}`}
            >
              {ball}
            </div>
          );
        })}
      </div>

      {/* 6. Fielding Team Logo Block */}
      <div
        className="flex items-center justify-center h-16 w-20 relative z-10 -ml-6"
        style={{
          background: `linear-gradient(to left, ${bowlingColor}88, #1e293b)`,
          clipPath: "polygon(25% 0, 100% 0, 100% 100%, 0 100%)",
          borderRight: `6px solid ${bowlingColor}`,
        }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg overflow-hidden shrink-0 ml-2">
          {bowlingLogo ? (
            <img
              src={bowlingLogo}
              alt={bowlingAbbr}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-black text-slate-900">
              {bowlingAbbr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
