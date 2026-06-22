"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import {
  ChevronLeft,
  Flag,
  Play,
  Pause,
  RotateCcw,
  MonitorUp,
  Settings,
  Plus,
  Minus,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  subscribeToFootballMatch,
  updateFootballScore,
  setFootballTimerState,
  completeFootballMatch,
  addFootballGoal,
  reopenFootballMatch,
} from "@/lib/firebaseFootball";
import { useAdmin } from "@/hooks/useAdmin";
import type { FootballMatch } from "@/types/football";

export default function FootballScorePage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.matchId;
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [editTimeMode, setEditTimeMode] = useState(false);
  const [editMinutes, setEditMinutes] = useState("");
  const [editSeconds, setEditSeconds] = useState("");

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalTeam, setGoalTeam] = useState<"team1" | "team2" | null>(null);
  const [scorerName, setScorerName] = useState("");
  const [assistName, setAssistName] = useState("");
  const [goalTime, setGoalTime] = useState("");
  const { isAdmin, loading } = useAdmin();

  useEffect(() => {
    return subscribeToFootballMatch(matchId, setMatch);
  }, [matchId]);

  // Local timer state for live UI updates
  const [localSeconds, setLocalSeconds] = useState(0);

  useEffect(() => {
    if (!match) return;

    let interval: NodeJS.Timeout;
    if (match.timer.isRunning) {
      // If timer is running, calculate actual elapsed time
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - match.timer.lastUpdated) / 1000);
        setLocalSeconds(match.timer.seconds + diff);
      }, 500);
    } else {
      setLocalSeconds(match.timer.seconds);
    }

    return () => clearInterval(interval);
  }, [match?.timer.isRunning, match?.timer.seconds, match?.timer.lastUpdated]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleToggleTimer = () => {
    if (!match) return;
    setFootballTimerState(matchId, !match.timer.isRunning, localSeconds);
  };

  const handleUpdateScore = (team: "team1" | "team2", delta: number) => {
    updateFootballScore(matchId, team, delta);
  };

  const handleSaveEditedTime = () => {
    const mins = parseInt(editMinutes) || 0;
    const secs = parseInt(editSeconds) || 0;
    const totalSecs = mins * 60 + secs;
    setFootballTimerState(matchId, false, totalSecs); // Pauses and sets new time
    setEditTimeMode(false);
  };

  const handleOpenGoalModal = (team: "team1" | "team2") => {
    setGoalTeam(team);
    setGoalTime(formatTime(localSeconds));
    setScorerName("");
    setAssistName("");
    setGoalModalOpen(true);
  };

  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !goalTeam) return;
    
    const eventData: any = {
      team: goalTeam,
      time: goalTime,
    };
    if (scorerName) eventData.scorerName = scorerName;
    if (assistName) eventData.assistName = assistName;

    addFootballGoal(matchId, goalTeam, eventData);
    setGoalModalOpen(false);
  };

  if (!match || loading) {
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

  if (!isAdmin) return null;

  return (
    <div className="flex min-h-screen flex-col bg-surface-variant">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline bg-surface px-4 py-3 shadow-sm">
        <Link
          href="/dashboard/football"
          className="flex items-center gap-1 font-bold text-primary"
        >
          <ChevronLeft size={20} /> Dashboard
        </Link>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">
            Match Control Center
          </p>
          <div className="flex items-center justify-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${match.meta.status === "live" ? "bg-primary animate-pulse" : "bg-slate-300"}`}
            ></span>
            <h1 className="text-sm font-black">
              {match.meta.team1} vs {match.meta.team2}
            </h1>
          </div>
        </div>
        <Link
          href={`/football/match/${matchId}/overlay`}
          target="_blank"
          className="flex items-center gap-1 rounded-md bg-inverse-surface px-3 py-1.5 text-sm font-bold text-white shadow-sm"
        >
          <MonitorUp size={16} /> Overlay
        </Link>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
        {match.meta.status === "completed" ? (
          <div className="bg-surface rounded-2xl shadow-xl border border-outline overflow-hidden flex flex-col">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white flex flex-col items-center">
              <h2 className="text-sm font-bold tracking-[0.2em] text-on-surface-variant uppercase mb-6">Full Time</h2>
              <div className="flex items-center justify-center gap-3 sm:gap-8 w-full">
                <div className="flex flex-col items-center flex-1">
                  {match.meta.team1Logo ? (
                    <img src={match.meta.team1Logo} alt={match.meta.team1} className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 shadow-lg mb-2 sm:mb-3 object-cover bg-surface" style={{ borderColor: match.meta.team1Color }} />
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full shadow-lg mb-2 sm:mb-3 flex items-center justify-center text-white font-black text-xl sm:text-3xl" style={{ backgroundColor: match.meta.team1Color || "#1e40af" }}>
                      {match.meta.team1.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-black text-xs sm:text-xl text-center">{match.meta.team1}</h3>
                </div>
                
                <div className="text-4xl sm:text-7xl font-black tabular-nums tracking-tighter shrink-0 flex items-center justify-center gap-2 sm:gap-4">
                  <span>{match.score.team1}</span>
                  <span className="text-on-surface-variant text-2xl sm:text-5xl">-</span>
                  <span>{match.score.team2}</span>
                </div>

                <div className="flex flex-col items-center flex-1">
                  {match.meta.team2Logo ? (
                    <img src={match.meta.team2Logo} alt={match.meta.team2} className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 shadow-lg mb-2 sm:mb-3 object-cover bg-surface" style={{ borderColor: match.meta.team2Color }} />
                  ) : (
                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full shadow-lg mb-2 sm:mb-3 flex items-center justify-center text-white font-black text-xl sm:text-3xl" style={{ backgroundColor: match.meta.team2Color || "#e11d48" }}>
                      {match.meta.team2.substring(0, 3).toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-black text-xs sm:text-xl text-center">{match.meta.team2}</h3>
                </div>
              </div>
            </div>

            <div className="p-8 bg-surface">
              <h3 className="text-center font-black text-on-surface uppercase tracking-widest text-sm mb-6 border-b border-outline-variant pb-4">Match Events</h3>
              <div className="flex flex-col gap-4 max-w-lg mx-auto relative before:absolute before:inset-0 before:left-1/2 before:-ml-px before:h-full before:w-0.5 before:bg-surface-variant">
                {(!match.events || Object.keys(match.events).length === 0) ? (
                  <p className="text-center text-on-surface-variant italic py-4 bg-surface relative z-10">No events recorded.</p>
                ) : (
                  Object.values(match.events)
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((evt) => (
                      <div key={evt.id} className="flex items-center w-full bg-surface relative z-10 my-2">
                        <div className="w-1/2 pr-6">
                          {evt.team === "team1" && (
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-on-surface">
                                {evt.scorerName || "Unknown Scorer"} ⚽️
                              </span>
                              {evt.assistName && <span className="text-xs text-on-surface-variant font-medium">Ast: {evt.assistName}</span>}
                            </div>
                          )}
                        </div>
                        <div className="w-14 h-8 rounded-full bg-surface-variant border border-outline flex items-center justify-center font-mono text-xs font-bold text-on-surface-variant shrink-0 z-10 shadow-sm relative left-[-2px]">
                          {evt.time}
                        </div>
                        <div className="w-1/2 pl-6">
                          {evt.team === "team2" && (
                            <div className="flex flex-col items-start">
                              <span className="font-bold text-on-surface">
                                ⚽️ {evt.scorerName || "Unknown Scorer"}
                              </span>
                              {evt.assistName && <span className="text-xs text-on-surface-variant font-medium">Ast: {evt.assistName}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="bg-surface-dim p-4 border-t border-outline flex justify-center gap-4">
              <Link href="/dashboard/football" className="px-6 py-2 rounded-lg bg-inverse-surface text-white font-bold text-sm shadow-md hover:bg-inverse-surface">
                Exit to Dashboard
              </Link>
              <button onClick={() => { if(confirm("Are you sure you want to reopen this match for editing?")) reopenFootballMatch(matchId); }} className="px-6 py-2 rounded-lg border border-outline text-on-surface-variant font-bold text-sm bg-surface hover:bg-surface-dim shadow-sm">
                Edit Match
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* SCORE CONTROL SECTION */}
        <div className="bg-surface rounded-2xl shadow-sm border border-outline overflow-hidden">
          <div className="bg-surface-dim p-3 border-b border-outline flex justify-between items-center">
            <h2 className="font-black text-on-surface uppercase text-sm tracking-wider flex items-center gap-2">
              <Flag size={16} /> Score Control
            </h2>
            <div className="text-2xl font-black font-mono bg-surface px-4 py-1 rounded-md border border-outline shadow-inner">
              {match.score.team1} - {match.score.team2}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-100">
            {/* Team 1 */}
            <div className="p-6 flex flex-col items-center">
              <div className="flex flex-col items-center mb-6">
                {match.meta.team1Logo ? (
                  <img
                    src={match.meta.team1Logo}
                    alt={match.meta.team1}
                    className="w-16 h-16 rounded-full border-2 shadow-sm mb-2"
                    style={{ borderColor: match.meta.team1Color }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full shadow-sm mb-2 flex items-center justify-center text-white font-black text-xl"
                    style={{
                      backgroundColor: match.meta.team1Color || "#1e40af",
                    }}
                  >
                    {match.meta.team1.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h3 className="font-black text-xl text-center">
                  {match.meta.team1}
                </h3>
              </div>

              <div className="flex items-center justify-center gap-4 w-full">
                <button
                  onClick={() => handleUpdateScore("team1", -1)}
                  disabled={match.score.team1 <= 0}
                  className="w-14 h-14 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus size={24} />
                </button>
                <div className="text-6xl font-black text-on-surface w-20 text-center">
                  {match.score.team1}
                </div>
                <button
                  onClick={() => handleOpenGoalModal("team1")}
                  className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-container shadow-md"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            {/* Team 2 */}
            <div className="p-6 flex flex-col items-center">
              <div className="flex flex-col items-center mb-6">
                {match.meta.team2Logo ? (
                  <img
                    src={match.meta.team2Logo}
                    alt={match.meta.team2}
                    className="w-16 h-16 rounded-full border-2 shadow-sm mb-2"
                    style={{ borderColor: match.meta.team2Color }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full shadow-sm mb-2 flex items-center justify-center text-white font-black text-xl"
                    style={{
                      backgroundColor: match.meta.team2Color || "#e11d48",
                    }}
                  >
                    {match.meta.team2.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <h3 className="font-black text-xl text-center">
                  {match.meta.team2}
                </h3>
              </div>

              <div className="flex items-center justify-center gap-4 w-full">
                <button
                  onClick={() => handleUpdateScore("team2", -1)}
                  disabled={match.score.team2 <= 0}
                  className="w-14 h-14 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus size={24} />
                </button>
                <div className="text-6xl font-black text-on-surface w-20 text-center">
                  {match.score.team2}
                </div>
                <button
                  onClick={() => handleOpenGoalModal("team2")}
                  className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center hover:bg-red-700 shadow-md"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TIMER CONTROL SECTION */}
        <div className="bg-surface rounded-2xl shadow-sm border border-outline overflow-hidden">
          <div className="bg-surface-dim p-3 border-b border-outline flex justify-between items-center">
            <h2 className="font-black text-on-surface uppercase text-sm tracking-wider flex items-center gap-2">
              Match Timer
            </h2>
          </div>

          <div className="p-8 flex flex-col items-center justify-center">
            {editTimeMode ? (
              <div className="flex items-center gap-2 mb-6">
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  placeholder="MM"
                  className="w-20 text-center text-4xl font-black font-mono border-b-2 border-primary focus:outline-none focus:bg-primary py-2 rounded-t-md bg-surface-dim"
                />
                <span className="text-4xl font-black text-on-surface-variant">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={editSeconds}
                  onChange={(e) => setEditSeconds(e.target.value)}
                  placeholder="SS"
                  className="w-20 text-center text-4xl font-black font-mono border-b-2 border-primary focus:outline-none focus:bg-primary py-2 rounded-t-md bg-surface-dim"
                />
              </div>
            ) : (
              <div
                className={`text-8xl font-black font-mono mb-8 tracking-tighter ${match.timer.isRunning ? "text-red-600" : "text-on-surface"}`}
              >
                {formatTime(localSeconds)}
              </div>
            )}

            <div className="flex items-center gap-4">
              {editTimeMode ? (
                <>
                  <button
                    onClick={() => setEditTimeMode(false)}
                    className="px-6 py-3 rounded-full font-bold bg-slate-200 text-on-surface hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditedTime}
                    className="px-6 py-3 rounded-full font-black bg-primary text-white hover:bg-primary-container shadow-md"
                  >
                    Save Time
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleToggleTimer}
                    className={`flex items-center gap-2 px-8 py-4 rounded-full font-black text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${match.timer.isRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                  >
                    {match.timer.isRunning ? (
                      <>
                        <Pause size={24} /> Pause Timer
                      </>
                    ) : (
                      <>
                        <Play size={24} /> Start Timer
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditTimeMode(true);
                      setEditMinutes(Math.floor(localSeconds / 60).toString());
                      setEditSeconds((localSeconds % 60).toString());
                    }}
                    className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-outline text-on-surface-variant hover:bg-surface-dim hover:text-on-surface transition-colors"
                    title="Edit Time"
                  >
                    <Settings size={24} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* MATCH ACTIONS */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={() => {
              if (confirm("Are you sure you want to complete this match?")) {
                completeFootballMatch(
                  matchId,
                  `${match.meta.team1} ${match.score.team1} - ${match.score.team2} ${match.meta.team2}`,
                );
              }
            }}
            className="px-6 py-3 rounded-lg bg-inverse-surface text-white font-black"
          >
            End Match
          </button>
        </div>
        </>
        )}
      </main>

      {goalModalOpen && match && goalTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-black">
              Record Goal for {goalTeam === "team1" ? match.meta.team1 : match.meta.team2}
            </h2>
            <form onSubmit={handleSubmitGoal} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-on-surface">Goal Time</label>
                <input
                  required
                  type="text"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  className="w-full rounded-md border border-outline px-3 py-2 font-mono"
                  placeholder="e.g. 45:00"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-bold text-on-surface">Goal Scorer</label>
                <select
                  value={scorerName}
                  onChange={(e) => setScorerName(e.target.value)}
                  className="w-full rounded-md border border-outline px-3 py-2"
                >
                  <option value="">Unknown / Own Goal</option>
                  {(goalTeam === "team1" ? match.meta.team1Roster : match.meta.team2Roster)?.map((p, i) => (
                    <option key={i} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-on-surface">Assist <span className="font-normal text-on-surface-variant">(optional)</span></label>
                <select
                  value={assistName}
                  onChange={(e) => setAssistName(e.target.value)}
                  className="w-full rounded-md border border-outline px-3 py-2"
                >
                  <option value="">None</option>
                  {(goalTeam === "team1" ? match.meta.team1Roster : match.meta.team2Roster)?.map((p, i) => (
                    <option key={i} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="rounded-lg px-4 py-2 font-bold text-on-surface-variant hover:bg-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 font-black text-white hover:bg-primary-container"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
