"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Eye, RotateCcw, Square, Tv, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAdmin } from "@/hooks/useAdmin";
import { OverHistory } from "@/components/OverHistory";
import { ScoreButtons } from "@/components/ScoreButtons";
import { Scoreboard } from "@/components/Scoreboard";
import {
  endOver,
  recordBall,
  subscribeToMatch,
  undoBall,
  updatePlayerNames,
  startSecondInnings,
  completeMatch,
  updateMatchMeta,
  updateMatch,
} from "@/lib/firebaseMatches";
import {
  applyBall,
  buildNewMatch,
  endCurrentOver,
  getCurrentInnings,
  undoLastBall,
  isLegalBall,
} from "@/lib/matchUtils";
import type { BallEvent, Match } from "@/types/match";

const demoMatch = buildNewMatch(
  "Mumbai Indians",
  "Chennai Super Kings",
  20,
  "team1",
  "bat",
  "demo-user",
);

export default function ScorerPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const [match, setMatch] = useState<Match | null>(
    matchId === "demo" ? demoMatch : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [bowlerModalOpen, setBowlerModalOpen] = useState(false);
  const [nextBowlerName, setNextBowlerName] = useState("");
  const [dismissal, setDismissal] = useState("Bowled");
  const [fielder, setFielder] = useState("");
  const [nextBatsman, setNextBatsman] = useState("");
  const innings = useMemo(
    () => (match ? getCurrentInnings(match) : null),
    [match],
  );

  const battingTeamRoster = useMemo(() => {
    if (!match || !innings) return null;
    return innings.battingTeam === "team1"
      ? match.meta.team1Roster
      : match.meta.team2Roster;
  }, [match, innings]);

  const bowlingTeamRoster = useMemo(() => {
    if (!match || !innings) return null;
    return innings.battingTeam === "team1"
      ? match.meta.team2Roster
      : match.meta.team1Roster;
  }, [match, innings]);

  const [strikerName, setStrikerName] = useState("");
  const [nonStrikerName, setNonStrikerName] = useState("");
  const [editWickets, setEditWickets] = useState(0);
  const { isAdmin, loading } = useAdmin();
  const [bowlerName, setBowlerName] = useState("");

  useEffect(() => {
    if (innings) {
      setStrikerName(
        innings.batsmen[innings.strikerKey || "striker"]?.name || "",
      );
      setNonStrikerName(
        innings.batsmen[innings.nonStrikerKey || "nonStriker"]?.name || "",
      );
      setBowlerName(innings.bowlers[innings.bowlerKey || "bowler"]?.name || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innings?.strikerKey, innings?.nonStrikerKey, innings?.bowlerKey]);

  function handleUpdateNames() {
    void runAction(async () => {
      await updatePlayerNames(matchId, {
        strikerName,
        nonStrikerName,
        bowlerName,
      });
    });
  }

  function handleUpdateToss(updates: { toss?: string; elected?: string }) {
    if (!match || !innings) return;
    const newToss = updates.toss || match.meta.toss;
    const newElected = updates.elected || match.meta.elected;
    const newBattingTeam =
      newElected === "bat"
        ? newToss
        : newToss === "team1"
          ? "team2"
          : "team1";

    void runAction(async () => {
      await updateMatchMeta(matchId, {
        toss: newToss as "team1" | "team2",
        elected: newElected as "bat" | "field",
      });
      if (match.currentInnings === 1) {
        await updateMatch(matchId, {
          "innings/1/battingTeam": newBattingTeam,
        } as any);
      }
    });
  }

  useEffect(() => {
    if (matchId === "demo") return;
    try {
      return subscribeToMatch(matchId, setMatch);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to subscribe to match.",
      );
    }
  }, [matchId]);

  useEffect(() => {
    if (!innings?.currentOver || innings.currentOver.length === 0) return;

    // Custom rule: the over ends when exactly 6 counting balls have been bowled.
    // Since innings.balls only increments for counting balls, we can just check if it's a multiple of 6.
    // Also ensure we don't auto-end if the last ball was a No Ball (which makes isFreeHit true)
    const isOverComplete =
      innings.balls > 0 && innings.balls % 6 === 0 && !innings.isFreeHit;

    if (isOverComplete) {
      const timer = setTimeout(() => {
        void runAction(
          () => endOver(matchId),
          () =>
            setMatch(
              (current) =>
                current && {
                  ...current,
                  innings: {
                    ...current.innings,
                    [String(current.currentInnings)]: endCurrentOver(
                      getCurrentInnings(current),
                    ),
                  },
                },
            ),
        ).then(() => setBowlerModalOpen(true));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [innings?.currentOver, innings?.balls, innings?.isFreeHit]); // eslint-disable-next-line react-hooks/exhaustive-deps

  async function runAction(
    action: () => Promise<unknown>,
    localAction?: () => void,
  ) {
    setBusy(true);
    setError("");
    try {
      if (matchId === "demo") {
        localAction?.();
      } else {
        await action();
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Scoring action failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleBall(event: BallEvent) {
    if (event === "W") {
      setWicketModalOpen(true);
      return;
    }

    void runAction(
      () => recordBall(matchId, event),
      () => {
        setMatch(
          (current) =>
            current && {
              ...current,
              innings: {
                ...current.innings,
                [String(current.currentInnings)]: applyBall(
                  getCurrentInnings(current),
                  event,
                ),
              },
            },
        );
      },
    );
  }

  function handleEndMatch() {
    if (!match) return;
    const inn1 = match.innings?.["1"];
    const inn2 = match.innings?.["2"];
    let resultString = "Match Completed";
    
    if (inn1 && inn2) {
      if (inn2.runs > inn1.runs) {
        // Team 2 (chasing team) wins
        const wicketsLeft = 10 - inn2.wickets;
        const winnerName = inn2.battingTeam === "team1" ? match.meta.team1 : match.meta.team2;
        resultString = `${winnerName} won by ${wicketsLeft} wickets`;
      } else if (inn1.runs > inn2.runs) {
        // Team 1 (defending team) wins
        const runDiff = inn1.runs - inn2.runs;
        const winnerName = inn1.battingTeam === "team1" ? match.meta.team1 : match.meta.team2;
        resultString = `${winnerName} won by ${runDiff} runs`;
      } else {
        resultString = "Match Tied";
      }
    } else if (inn1) {
      // Only 1 innings played, maybe abandoned or DL method
      resultString = "Match Abandoned / Incomplete";
    }
    
    const confirmMessage = `Are you sure you want to end this match?\n\nCalculated Result: ${resultString}`;
    if (confirm(confirmMessage)) {
      void runAction(() => completeMatch(matchId, resultString));
    }
  }

  if (loading || (!match && !error) || (!innings && !error)) {
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

  if ((!match || !innings) && error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-lg border border-outline bg-surface p-8 text-center text-rose-500 font-bold">
            {error}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) return null;

  if (!match || !innings) return null;

  return (
    <AppShell>
      <datalist id="batting-team-roster">
        {battingTeamRoster?.map((player) => (
          <option key={player.name} value={player.name} />
        ))}
      </datalist>
      <datalist id="bowling-team-roster">
        {bowlingTeamRoster?.map((player) => (
          <option key={player.name} value={player.name} />
        ))}
      </datalist>

      <section className="mx-auto max-w-3xl px-4 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-primary">
              Scorer controller
            </p>
            <h1 className="text-2xl font-black">
              {match.meta.team1} vs {match.meta.team2}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              className="rounded-md border border-outline p-2"
              href={`/match/${matchId}/live`}
              title="Live scoreboard"
            >
              <Eye size={18} />
            </Link>
            <Link
              className="rounded-md border border-outline p-2"
              href={`/match/${matchId}/overlay`}
              title="Overlay"
            >
              <Tv size={18} />
            </Link>
          </div>
        </div>

        <Scoreboard match={match} />

        <div className="mt-4 rounded-lg border border-outline bg-surface p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 border-b border-outline pb-4">
            <label className="block text-sm font-bold">
              Toss Won By
              <select
                className="mt-1 w-full rounded-md border border-outline px-3 py-2 bg-surface"
                value={match.meta.toss}
                onChange={(e) => handleUpdateToss({ toss: e.target.value })}
                disabled={match.currentInnings > 1}
              >
                <option value="team1">{match.meta.team1}</option>
                <option value="team2">{match.meta.team2}</option>
              </select>
            </label>
            <label className="block text-sm font-bold">
              Elected To
              <select
                className="mt-1 w-full rounded-md border border-outline px-3 py-2 bg-surface"
                value={match.meta.elected}
                onChange={(e) => handleUpdateToss({ elected: e.target.value })}
                disabled={match.currentInnings > 1}
              >
                <option value="bat">Bat</option>
                <option value="field">Field</option>
              </select>
            </label>
          </div>

          <h2 className="mb-3 font-black">Edit Players</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-bold">
              Striker
              <input
                list="batting-team-roster"
                className="mt-1 w-full rounded-md border border-outline px-3 py-2"
                value={strikerName}
                onChange={(e) => setStrikerName(e.target.value)}
              />
            </label>
            <label className="block text-sm font-bold">
              Non-Striker
              <input
                list="batting-team-roster"
                className="mt-1 w-full rounded-md border border-outline px-3 py-2"
                value={nonStrikerName}
                onChange={(e) => setNonStrikerName(e.target.value)}
              />
            </label>
            <label className="block text-sm font-bold">
              Bowler
              <input
                list="bowling-team-roster"
                className="mt-1 w-full rounded-md border border-outline px-3 py-2"
                value={bowlerName}
                onChange={(e) => setBowlerName(e.target.value)}
              />
            </label>
          </div>
          <button
            className="mt-3 w-full rounded-md bg-inverse-surface px-4 py-2 font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={handleUpdateNames}
          >
            Update Names
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-outline bg-surface font-black disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              runAction(
                () => undoBall(matchId),
                () => {
                  setMatch(
                    (current) =>
                      current && {
                        ...current,
                        innings: {
                          ...current.innings,
                          [String(current.currentInnings)]: undoLastBall(
                            getCurrentInnings(current),
                          ),
                        },
                      },
                  );
                },
              )
            }
          >
            <RotateCcw size={18} />
            Undo
          </button>
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-outline bg-surface font-black disabled:opacity-50"
            disabled={
              busy ||
              !(
                innings &&
                innings.balls > 0 &&
                innings.balls % 6 === 0 &&
                !innings.isFreeHit
              )
            }
            onClick={() =>
              runAction(
                () => endOver(matchId),
                () => {
                  setMatch(
                    (current) =>
                      current && {
                        ...current,
                        innings: {
                          ...current.innings,
                          [String(current.currentInnings)]: endCurrentOver(
                            getCurrentInnings(current),
                          ),
                        },
                      },
                  );
                },
              ).then(() => setBowlerModalOpen(true))
            }
          >
            <Square size={18} />
            End Over
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-outline bg-surface p-4">
          <ScoreButtons onBall={handleBall} disabled={busy} />
        </div>

        <div className="mt-4 rounded-lg border border-outline bg-surface p-4">
          <h2 className="mb-3 font-black">Over history</h2>
          <OverHistory history={innings.overHistory ?? []} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {match.currentInnings === 1 && (
            <button
              className="rounded-lg bg-primary px-4 py-3 font-black text-white disabled:opacity-50"
              disabled={busy}
              onClick={() => runAction(() => startSecondInnings(matchId))}
            >
              Start 2nd Innings
            </button>
          )}
          {match.meta.status !== "completed" && (
            <button
              className="rounded-lg bg-inverse-surface px-4 py-3 font-black text-white disabled:opacity-50"
              disabled={busy}
              onClick={handleEndMatch}
            >
              End Match
            </button>
          )}
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-semibold text-rose-800">
            {error}
          </p>
        ) : null}
      </section>

      {wicketModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/50 p-3 sm:place-items-center">
          <div className="w-full max-w-md rounded-lg bg-surface p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Wicket</h2>
              <button
                className="rounded-md border border-outline p-2"
                onClick={() => setWicketModalOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold">
                Dismissal
                <select
                  className="mt-1 w-full rounded-md border border-outline px-3 py-2"
                  value={dismissal}
                  onChange={(event) => setDismissal(event.target.value)}
                >
                  <option>Bowled</option>
                  <option>Caught</option>
                  <option>LBW</option>
                  <option>Run Out</option>
                  <option>Stumped</option>
                  <option>Hit Wicket</option>
                </select>
              </label>
              <label className="block text-sm font-bold">
                Fielder
                <input
                  list="bowling-team-roster"
                  className="mt-1 w-full rounded-md border border-outline px-3 py-2"
                  placeholder="Optional"
                  value={fielder}
                  onChange={(event) => setFielder(event.target.value)}
                />
              </label>
              <label className="block text-sm font-bold">
                Next Batsman
                <input
                  list="batting-team-roster"
                  className="mt-1 w-full rounded-md border border-outline px-3 py-2"
                  placeholder="Required"
                  value={nextBatsman}
                  onChange={(event) => setNextBatsman(event.target.value)}
                />
              </label>
              <button
                className="w-full rounded-lg bg-rose-700 px-4 py-3 font-black text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  if (!nextBatsman.trim()) {
                    alert("Please enter the next batsman name.");
                    return;
                  }
                  setWicketModalOpen(false);
                  setFielder("");
                  setNextBatsman("");
                  void runAction(
                    async () => {
                      await recordBall(matchId, "W");
                      if (nextBatsman)
                        await updatePlayerNames(matchId, {
                          nextBatsmanName: nextBatsman,
                        });
                    },
                    () =>
                      setMatch(
                        (current) =>
                          current && {
                            ...current,
                            innings: {
                              ...current.innings,
                              [String(current.currentInnings)]: applyBall(
                                getCurrentInnings(current),
                                "W",
                              ),
                            },
                          },
                      ),
                  );
                }}
              >
                Confirm {dismissal}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bowlerModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/50 p-3 sm:place-items-center">
          <div className="w-full max-w-md rounded-lg bg-surface p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">Next Over</h2>
              <button
                className="rounded-md border border-outline p-2"
                onClick={() => setBowlerModalOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold">
                New Bowler
                <input
                  list="bowling-team-roster"
                  className="mt-1 w-full rounded-md border border-outline px-3 py-2"
                  placeholder="Required"
                  value={nextBowlerName}
                  onChange={(event) => setNextBowlerName(event.target.value)}
                />
              </label>
              <button
                className="w-full rounded-lg bg-inverse-surface px-4 py-3 font-black text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  if (!nextBowlerName.trim()) {
                    alert("Please enter the next bowler name.");
                    return;
                  }
                  setBowlerModalOpen(false);
                  const name = nextBowlerName;
                  setNextBowlerName("");
                  void runAction(
                    async () => {
                      await updatePlayerNames(matchId, { bowlerName: name });
                    },
                    () => {
                      setBowlerName(name);
                      setMatch((current) => {
                        if (!current) return current;
                        const num = String(current.currentInnings);
                        const inn = current.innings[num];
                        if (!inn) return current;

                        return {
                          ...current,
                          innings: {
                            ...current.innings,
                            [num]: {
                              ...inn,
                              bowlerKey: name,
                              bowlers: {
                                ...inn.bowlers,
                                [name]: inn.bowlers[name] || {
                                  name: name,
                                  overs: 0,
                                  balls: 0,
                                  runs: 0,
                                  wickets: 0,
                                  wides: 0,
                                  noBalls: 0,
                                },
                              },
                            },
                          },
                        };
                      });
                    },
                  );
                }}
              >
                Confirm Bowler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
